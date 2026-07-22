import Match from '../models/Match.js';
import MatchEvent from '../models/MatchEvent.js';
import asyncHandler from '../utils/asyncHandler.js';
import AppError from '../utils/AppError.js';
import { isHostTeam, teamMatchParticipantFilter } from '../services/matchService.js';
import {
  addAssistToGoal,
  completeMatch,
  createMatchEvent,
  endFirstHalf,
  serializeEvent,
  serializeLiveState,
  startMatch,
  startSecondHalf,
  undoLatestEvent,
} from '../services/liveMatchService.js';
import { emitToMatch } from '../realtime/realtimeHub.js';
import { queueFullTimePush, queueGoalPush, queueHalfTimePush, queueMatchStartedPush } from '../services/pushService.js';
import { ensureCollaborationRequest } from '../services/matchCollaborationService.js';

const ownedTeamId = (req) => req.user.team?._id || req.user.team;

const liveBundle = async ({ matchId, teamId, includeUndone = true }) => {
  const filter = teamId ? teamMatchParticipantFilter(teamId, { _id: matchId }) : { _id: matchId, isActive: true };
  const match = await Match.findOne(filter).populate('team', 'name slug logo').populate('registeredOpponentTeam', 'name slug logo');
  if (!match) throw new AppError('Match not found.', 404, 'MATCH_NOT_FOUND');
  const eventFilter = { match: matchId };
  if (!includeUndone) eventFilter.isUndone = false;
  const events = await MatchEvent.find(eventFilter).sort({ sequence: 1 });
  return {
    state: {
      ...serializeLiveState({ match, events }),
      permissions: {
        canControlLive: teamId ? isHostTeam(match, teamId) : false,
      },
    },
    events: events.map(serializeEvent),
    match,
  };
};

const broadcastState = async (matchId, eventName, extra = {}) => {
  const bundle = await liveBundle({ matchId });
  emitToMatch(matchId, 'match:state', bundle.state);
  emitToMatch(matchId, 'match:live-state', bundle.state);
  emitToMatch(matchId, eventName, { state: bundle.state, ...extra });
  return bundle;
};

const transitionController = (service, afterTransition) => asyncHandler(async (req, res) => {
  const match = await service({ teamId: ownedTeamId(req), matchId: req.params.matchId, userId: req.user._id });
  if (match?.status === 'completed') await ensureCollaborationRequest({ match, userId: req.user._id });
  const bundle = await broadcastState(req.params.matchId, 'match:transition');
  if (afterTransition) afterTransition(req.params.matchId);
  res.json({ success: true, data: { state: bundle.state } });
});

export const startOwnedMatch = transitionController(startMatch, queueMatchStartedPush);
export const endOwnedFirstHalf = transitionController(endFirstHalf, queueHalfTimePush);
export const startOwnedSecondHalf = transitionController(startSecondHalf);
export const completeOwnedMatch = transitionController(completeMatch, queueFullTimePush);

export const getOwnedLiveState = asyncHandler(async (req, res) => {
  const bundle = await liveBundle({ matchId: req.params.matchId, teamId: ownedTeamId(req) });
  res.json({ success: true, data: { state: bundle.state } });
});

export const getOwnedEvents = asyncHandler(async (req, res) => {
  const bundle = await liveBundle({ matchId: req.params.matchId, teamId: ownedTeamId(req) });
  res.json({ success: true, data: { events: bundle.events } });
});

const eventController = (typeFromRequest) => asyncHandler(async (req, res) => {
  const type = typeof typeFromRequest === 'function' ? typeFromRequest(req) : typeFromRequest;
  const event = await createMatchEvent({
    teamId: ownedTeamId(req), matchId: req.params.matchId, userId: req.user._id, type, input: req.body,
  });
  const bundle = await broadcastState(req.params.matchId, 'match:event-created', { event: serializeEvent(event) });
  if (['goal', 'penalty_scored', 'own_goal'].includes(type)) queueGoalPush(req.params.matchId, event, bundle.state);
  res.status(201).json({ success: true, data: { event: serializeEvent(event), state: bundle.state } });
});

export const addGoal = eventController('goal');
export const addYellowCard = eventController('yellow_card');
export const addRedCard = eventController('red_card');
export const addSubstitution = eventController('substitution');
export const addPenalty = eventController((req) => `penalty_${req.body.outcome}`);
export const addOwnGoal = eventController('own_goal');

export const addAssist = asyncHandler(async (req, res) => {
  const event = await addAssistToGoal({
    teamId: ownedTeamId(req), matchId: req.params.matchId, eventId: req.params.eventId,
    userId: req.user._id, assistPlayerId: req.body.assistPlayerId,
  });
  const bundle = await broadcastState(req.params.matchId, 'match:event-created', { event: serializeEvent(event) });
  res.json({ success: true, data: { event: serializeEvent(event), state: bundle.state } });
});

export const undoLastEvent = asyncHandler(async (req, res) => {
  const event = await undoLatestEvent({
    teamId: ownedTeamId(req), matchId: req.params.matchId, userId: req.user._id, reason: req.body.reason || '',
  });
  const bundle = await broadcastState(req.params.matchId, 'match:event-undone', { event: serializeEvent(event) });
  res.json({ success: true, data: { event: serializeEvent(event), state: bundle.state } });
});

export const getPublicLiveState = asyncHandler(async (req, res) => {
  const bundle = await liveBundle({ matchId: req.params.matchId, includeUndone: false });
  res.json({ success: true, data: { state: bundle.state } });
});

export const getPublicEvents = asyncHandler(async (req, res) => {
  const bundle = await liveBundle({ matchId: req.params.matchId, includeUndone: false });
  res.json({ success: true, data: { events: bundle.events } });
});

export const getAdminLiveState = asyncHandler(async (req, res) => {
  const bundle = await liveBundle({ matchId: req.params.matchId });
  res.json({ success: true, data: { state: bundle.state } });
});

export const getAdminEvents = asyncHandler(async (req, res) => {
  const bundle = await liveBundle({ matchId: req.params.matchId });
  res.json({ success: true, data: { events: bundle.events } });
});

