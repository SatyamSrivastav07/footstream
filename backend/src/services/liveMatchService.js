import Match from '../models/Match.js';
import MatchEvent from '../models/MatchEvent.js';
import AppError from '../utils/AppError.js';
import { publicImage } from './teamBrandingService.js';

const idString = (value) => value ? String(value._id || value) : '';
const plain = (value) => (typeof value?.toJSON === 'function' ? value.toJSON() : { ...value });

const toTimestamp = (value) => {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(value);
  const timestamp = date.getTime();
  return Number.isNaN(timestamp) ? null : timestamp;
};

export const compactSnapshot = (snapshot) => ({
  player: snapshot.player,
  name: snapshot.name,
  jerseyNumber: snapshot.jerseyNumber ?? null,
  position: snapshot.position,
});

export const calculateElapsedSeconds = (match, now = new Date()) => {
  const base = Number(match.timerBaseSeconds) || 0;
  if (match.status === 'live' && match.timerAnchorAt) {
    const nowTimestamp = toTimestamp(now) ?? Date.now();
    const anchorTimestamp = toTimestamp(match.timerAnchorAt);
    if (!anchorTimestamp) return base;
    return Math.max(0, base + Math.floor((nowTimestamp - anchorTimestamp) / 1000));
  }
  return base;
};

export const calculateScore = (events, teamSide) => {
  let teamGoals = 0;
  let opponentGoals = 0;
  for (const event of events) {
    if (event.isUndone || !['goal', 'penalty_scored', 'own_goal'].includes(event.type)) continue;
    if (event.scoringSide === 'team') teamGoals += 1;
    if (event.scoringSide === 'opponent') opponentGoals += 1;
  }
  return teamSide === 'home'
    ? { homeScore: teamGoals, awayScore: opponentGoals, teamScore: teamGoals, opponentScore: opponentGoals }
    : { homeScore: opponentGoals, awayScore: teamGoals, teamScore: teamGoals, opponentScore: opponentGoals };
};

export const buildCurrentLineup = (match, events) => {
  const starting = new Map(match.startingXI.map((entry) => [idString(entry.player), compactSnapshot(entry)]));
  const bench = new Map(match.substitutes.map((entry) => [idString(entry.player), compactSnapshot(entry)]));
  const onField = new Map(starting);
  const sentOff = new Map();
  const substitutedOut = new Set();
  const entered = new Set();
  const substitutions = [];

  for (const event of [...events].filter((item) => !item.isUndone).sort((a, b) => a.sequence - b.sequence)) {
    if (event.type === 'substitution') {
      const outId = idString(event.playerOut);
      const inId = idString(event.playerIn);
      onField.delete(outId);
      bench.delete(inId);
      onField.set(inId, event.playerInSnapshot);
      substitutedOut.add(outId);
      entered.add(inId);
      substitutions.push({
        sequence: event.sequence,
        playerOut: event.playerOutSnapshot,
        playerIn: event.playerInSnapshot,
        minute: event.minute,
      });
    }
    if (event.type === 'red_card' && event.player) {
      const playerId = idString(event.player);
      const snapshot = event.playerSnapshot;
      onField.delete(playerId);
      bench.delete(playerId);
      sentOff.set(playerId, snapshot);
    }
  }

  return {
    onField: [...onField.values()],
    bench: [...bench.values()],
    sentOff: [...sentOff.values()],
    substitutions,
    substitutedOut,
    entered,
    onFieldIds: new Set(onField.keys()),
    benchIds: new Set(bench.keys()),
  };
};

export const findLineupSnapshot = (match, playerId) => {
  const snapshot = [...match.startingXI, ...match.substitutes].find((entry) => idString(entry.player) === String(playerId));
  if (!snapshot) throw new AppError('Selected player is not in this match-day squad.', 400, 'PLAYER_NOT_IN_LINEUP');
  return compactSnapshot(snapshot);
};

export const assertLiveMatch = (match) => {
  if (match.status !== 'live') throw new AppError('Events can only be added while the match is live.', 409, 'MATCH_NOT_LIVE');
};

export const findOwnedActiveMatch = async ({ matchModel = Match, teamId, matchId }) => {
  const match = await matchModel.findOne({ _id: matchId, team: teamId, isActive: true });
  if (!match) throw new AppError('Match not found.', 404, 'MATCH_NOT_FOUND');
  return match;
};

const transition = async ({ matchModel = Match, teamId, matchId, userId, expectedStatus, expectedPeriod, updates, now = new Date() }) => {
  const match = await findOwnedActiveMatch({ matchModel, teamId, matchId });
  if (match.status !== expectedStatus || (expectedPeriod && match.currentPeriod !== expectedPeriod)) {
    throw new AppError('That live transition is not valid right now.', 409, 'INVALID_TRANSITION');
  }
  Object.assign(match, typeof updates === 'function' ? updates(match, now) : updates, { updatedBy: userId });
  await match.save();
  return match;
};

export const startMatch = (options) => transition({
  ...options,
  expectedStatus: 'scheduled',
  expectedPeriod: 'not_started',
  updates: (_match, now) => ({
    status: 'live', currentPeriod: 'first_half', startedAt: now, timerAnchorAt: now,
    timerBaseSeconds: 0, liveMinute: 0, homeScore: 0, awayScore: 0,
  }),
});

export const endFirstHalf = (options) => transition({
  ...options,
  expectedStatus: 'live',
  expectedPeriod: 'first_half',
  updates: (match, now) => {
    const elapsed = calculateElapsedSeconds(match, now);
    return { status: 'half_time', currentPeriod: 'half_time', firstHalfEndedAt: now, timerBaseSeconds: elapsed, timerAnchorAt: null, liveMinute: Math.min(150, Math.floor(elapsed / 60)) };
  },
});

export const startSecondHalf = (options) => transition({
  ...options,
  expectedStatus: 'half_time',
  expectedPeriod: 'half_time',
  updates: (_match, now) => ({ status: 'live', currentPeriod: 'second_half', secondHalfStartedAt: now, timerAnchorAt: now }),
});

export const completeMatch = (options) => transition({
  ...options,
  expectedStatus: 'live',
  expectedPeriod: 'second_half',
  updates: (match, now) => {
    const elapsed = calculateElapsedSeconds(match, now);
    return { status: 'completed', currentPeriod: 'full_time', completedAt: now, timerBaseSeconds: elapsed, timerAnchorAt: null, liveMinute: Math.min(150, Math.floor(elapsed / 60)) };
  },
});

const defaultMinute = (match, now) => Math.min(150, Math.floor(calculateElapsedSeconds(match, now) / 60));
const eventPeriod = (match) => {
  if (!['first_half', 'second_half', 'extra_time_first', 'extra_time_second', 'penalties'].includes(match.currentPeriod)) {
    throw new AppError('The current period cannot accept events.', 409, 'INVALID_EVENT_PERIOD');
  }
  return match.currentPeriod;
};

const ownPlayerFields = (match, playerId, prefix = 'player') => {
  const snapshot = findLineupSnapshot(match, playerId);
  return { [prefix]: snapshot.player, [`${prefix}Snapshot`]: snapshot };
};

const actorFields = (match, input) => {
  if (input.scoringSide === 'team' || input.side === 'team') {
    if (!input.playerId) throw new AppError('Select a match-day player.', 400, 'PLAYER_REQUIRED');
    return { team: match.team, ...ownPlayerFields(match, input.playerId) };
  }
  if (!input.temporaryOpponentPlayerName?.trim()) throw new AppError('Enter the opponent player name.', 400, 'OPPONENT_PLAYER_REQUIRED');
  return { team: null, temporaryOpponentPlayerName: input.temporaryOpponentPlayerName.trim() };
};

export const buildEventData = ({ match, events, type, input, now = new Date() }) => {
  assertLiveMatch(match);
  const common = {
    type,
    period: eventPeriod(match),
    minute: input.minute ?? defaultMinute(match, now),
    stoppageMinute: input.stoppageMinute ?? null,
    description: input.description?.trim() || '',
  };

  if (type === 'goal') {
    if (!input.scoringSide) throw new AppError('Choose which side scored.', 400, 'SCORING_SIDE_REQUIRED');
    const actor = actorFields(match, input);
    const data = { ...common, ...actor, scoringSide: input.scoringSide };
    if (input.assistPlayerId) {
      if (input.scoringSide !== 'team') throw new AppError('Opponent assists use the temporary opponent description.', 400, 'INVALID_ASSIST');
      if (String(input.assistPlayerId) === String(input.playerId)) throw new AppError('Scorer and assist player must be different.', 400, 'ASSIST_SAME_AS_SCORER');
      Object.assign(data, ownPlayerFields(match, input.assistPlayerId, 'assistPlayer'));
    }
    return data;
  }

  if (['yellow_card', 'red_card'].includes(type)) return { ...common, ...actorFields(match, input) };

  if (type === 'substitution') {
    if (String(input.playerInId) === String(input.playerOutId)) throw new AppError('Substitution players must be different.', 400, 'INVALID_SUBSTITUTION');
    const state = buildCurrentLineup(match, events);
    const outId = String(input.playerOutId);
    const inId = String(input.playerInId);
    if (!state.onFieldIds.has(outId)) throw new AppError('Player out is not currently on the field.', 400, 'PLAYER_OUT_NOT_ON_FIELD');
    if (state.entered.has(inId)) throw new AppError('A player cannot enter twice.', 400, 'PLAYER_ALREADY_ENTERED');
    if (state.substitutedOut.has(inId)) throw new AppError('A substituted-out player cannot re-enter.', 400, 'PLAYER_CANNOT_REENTER');
    if (!state.benchIds.has(inId)) throw new AppError('Player in is not currently on the bench.', 400, 'PLAYER_IN_NOT_ON_BENCH');
    return {
      ...common,
      team: match.team,
      ...ownPlayerFields(match, input.playerInId, 'playerIn'),
      ...ownPlayerFields(match, input.playerOutId, 'playerOut'),
    };
  }

  if (type.startsWith('penalty_')) {
    if (!input.scoringSide) throw new AppError('Choose the penalty side.', 400, 'SCORING_SIDE_REQUIRED');
    return { ...common, ...actorFields(match, input), scoringSide: input.scoringSide, penaltyOutcome: type.replace('penalty_', '') };
  }

  if (type === 'own_goal') {
    if (!['team', 'opponent'].includes(input.ownGoalBySide)) throw new AppError('Choose the own-goal actor side.', 400, 'OWN_GOAL_SIDE_REQUIRED');
    const scoringSide = input.ownGoalBySide === 'team' ? 'opponent' : 'team';
    const ownGoalBy = input.ownGoalBySide === 'team'
      ? { side: 'team', player: findLineupSnapshot(match, input.playerId).player, playerSnapshot: findLineupSnapshot(match, input.playerId), temporaryOpponentPlayerName: '' }
      : { side: 'opponent', player: null, playerSnapshot: null, temporaryOpponentPlayerName: input.temporaryOpponentPlayerName?.trim() || '' };
    if (input.ownGoalBySide === 'opponent' && !ownGoalBy.temporaryOpponentPlayerName) throw new AppError('Enter the opponent own-goal player.', 400, 'OPPONENT_PLAYER_REQUIRED');
    return { ...common, team: input.ownGoalBySide === 'team' ? match.team : null, scoringSide, ownGoalBy };
  }

  throw new AppError('Unsupported event type.', 400, 'INVALID_EVENT_TYPE');
};

export const recalculateAndPersistScore = async ({ matchModel = Match, eventModel = MatchEvent, match }) => {
  const events = await eventModel.find({ match: match._id, isUndone: false });
  const scores = calculateScore(events, match.teamSide);
  await matchModel.updateOne({ _id: match._id }, { $set: { homeScore: scores.homeScore, awayScore: scores.awayScore } });
  match.homeScore = scores.homeScore;
  match.awayScore = scores.awayScore;
  return scores;
};

export const createMatchEvent = async ({
  matchModel = Match, eventModel = MatchEvent, teamId, matchId, userId, type, input, now = new Date(),
}) => {
  const match = await findOwnedActiveMatch({ matchModel, teamId, matchId });
  assertLiveMatch(match);
  const activeEvents = await eventModel.find({ match: matchId, isUndone: false }).sort({ sequence: 1 });
  const data = buildEventData({ match, events: activeEvents, type, input, now });
  const sequencedMatch = await matchModel.findOneAndUpdate(
    { _id: matchId, team: teamId, status: 'live', isActive: true },
    { $inc: { lastEventSequence: 1 } },
    { new: true },
  );
  if (!sequencedMatch) throw new AppError('Match is no longer live.', 409, 'MATCH_NOT_LIVE');
  const event = await eventModel.create({ ...data, match: matchId, sequence: sequencedMatch.lastEventSequence, createdBy: userId });
  await recalculateAndPersistScore({ matchModel, eventModel, match });
  return event;
};

export const addAssistToGoal = async ({ eventModel = MatchEvent, matchModel = Match, teamId, matchId, eventId, userId, assistPlayerId }) => {
  const match = await findOwnedActiveMatch({ matchModel, teamId, matchId });
  assertLiveMatch(match);
  const event = await eventModel.findOne({ _id: eventId, match: matchId, type: 'goal', scoringSide: 'team', isUndone: false });
  if (!event) throw new AppError('Eligible goal event not found.', 404, 'GOAL_EVENT_NOT_FOUND');
  if (event.assistPlayer) throw new AppError('This goal already has an assist.', 409, 'ASSIST_EXISTS');
  if (idString(event.player) === String(assistPlayerId)) throw new AppError('Scorer and assist player must be different.', 400, 'ASSIST_SAME_AS_SCORER');
  const snapshot = findLineupSnapshot(match, assistPlayerId);
  event.assistPlayer = snapshot.player;
  event.assistPlayerSnapshot = snapshot;
  event.updatedBy = userId;
  await event.save();
  return event;
};

export const undoLatestEvent = async ({ eventModel = MatchEvent, matchModel = Match, teamId, matchId, userId, reason = '', now = new Date() }) => {
  const match = await findOwnedActiveMatch({ matchModel, teamId, matchId });
  assertLiveMatch(match);
  const event = await eventModel.findOne({ match: matchId, isUndone: false }).sort({ sequence: -1 });
  if (!event) throw new AppError('There is no active event to undo.', 400, 'NO_EVENT_TO_UNDO');
  event.isUndone = true;
  event.undoneBy = userId;
  event.undoneAt = now;
  event.undoReason = reason.trim();
  await event.save();
  await recalculateAndPersistScore({ matchModel, eventModel, match });
  return event;
};

export const serializeEvent = (event) => plain(event);

export const serializeLiveState = ({ match, events = [], now = new Date() }) => {
  const elapsedSeconds = calculateElapsedSeconds(match, now);
  const scores = calculateScore(events, match.teamSide);
  const lineup = buildCurrentLineup(match, events);
  const team = match.team?.name ? { _id: match.team._id, name: match.team.name, slug: match.team.slug, logo: publicImage(match.team.logo).imageUrl } : { _id: match.team };
  return {
    matchId: match._id,
    team,
    opponent: match.opponent,
    status: match.status,
    currentPeriod: match.currentPeriod,
    homeScore: scores.homeScore,
    awayScore: scores.awayScore,
    teamScore: scores.teamScore,
    opponentScore: scores.opponentScore,
    elapsedSeconds,
    liveMinute: Math.min(150, Math.floor(elapsedSeconds / 60)),
    teamSide: match.teamSide,
    scheduledAt: match.scheduledAt,
    venue: match.venue,
    tournament: match.tournament,
    formation: match.formation,
    customFormation: match.customFormation,
    startingXI: match.startingXI,
    substitutes: match.substitutes,
    currentLineup: { onField: lineup.onField, bench: lineup.bench, sentOff: lineup.sentOff, substitutions: lineup.substitutions },
    latestEventSequence: match.lastEventSequence,
  };
};
