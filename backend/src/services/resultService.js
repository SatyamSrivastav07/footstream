import Match from '../models/Match.js';
import MatchEvent from '../models/MatchEvent.js';
import MatchPhoto from '../models/MatchPhoto.js';
import AppError from '../utils/AppError.js';
import { calculateScore } from './liveMatchService.js';

export const idString = (value) => String(value?._id || value || '');
const plain = (value) => typeof value?.toJSON === 'function' ? value.toJSON() : { ...value };

export const deriveResult = (match, events) => {
  const { teamScore, opponentScore } = calculateScore(events, match.teamSide);
  const outcome = teamScore > opponentScore ? 'win' : teamScore < opponentScore ? 'loss' : 'draw';
  return {
    outcome,
    winnerSide: outcome === 'win' ? 'team' : outcome === 'loss' ? 'opponent' : 'draw',
    finalTeamScore: teamScore,
    finalOpponentScore: opponentScore,
  };
};

export const matchSquadSnapshot = (match, playerId) => [...match.startingXI, ...match.substitutes]
  .find((entry) => idString(entry.player) === idString(playerId));

export const findCompletedMatch = async ({ matchModel = Match, matchId, teamId }) => {
  const filter = { _id: matchId, isActive: true, status: 'completed' };
  if (teamId) filter.team = teamId;
  const match = await matchModel.findOne(filter);
  if (!match) throw new AppError('Completed match not found.', 404, 'COMPLETED_MATCH_NOT_FOUND');
  if (typeof match.populate === 'function') await match.populate('team', 'name slug logo');
  return match;
};

export const getResultBundle = async ({ matchModel = Match, eventModel = MatchEvent, photoModel = MatchPhoto, matchId, teamId }) => {
  const match = await findCompletedMatch({ matchModel, matchId, teamId });
  const [events, photos] = await Promise.all([
    eventModel.find({ match: matchId, isUndone: false }).select('-createdBy -undoneBy -__v').sort({ sequence: 1 }).lean(),
    photoModel.find({ match: matchId, isActive: true }).select('-uploadedBy -publicId -__v').sort({ createdAt: -1 }).lean(),
  ]);
  return { match: plain(match), result: deriveResult(match, events), events, photos };
};

export const confirmResult = async ({ matchModel = Match, eventModel = MatchEvent, matchId, teamId, userId, input, now = new Date() }) => {
  const match = await findCompletedMatch({ matchModel, matchId, teamId });
  const allowed = ['manOfTheMatchPlayerId', 'completionNotes', 'attendance'];
  const unknown = Object.keys(input).filter((key) => !allowed.includes(key));
  if (unknown.length) throw new AppError(`Protected result fields cannot be changed: ${unknown.join(', ')}.`, 400, 'PROTECTED_RESULT_FIELDS');
  const events = await eventModel.find({ match: matchId, isUndone: false }).lean();
  match.result = deriveResult(match, events);
  if (Object.hasOwn(input, 'completionNotes')) match.completionNotes = input.completionNotes;
  if (Object.hasOwn(input, 'attendance')) match.attendance = input.attendance;
  if (Object.hasOwn(input, 'manOfTheMatchPlayerId')) {
    if (!input.manOfTheMatchPlayerId) match.manOfTheMatch = null;
    else {
      const snapshot = matchSquadSnapshot(match, input.manOfTheMatchPlayerId);
      if (!snapshot) throw new AppError('Man of the Match must be selected from this match-day squad.', 400, 'INVALID_MAN_OF_THE_MATCH');
      match.manOfTheMatch = { player: snapshot.player, name: snapshot.name, jerseyNumber: snapshot.jerseyNumber ?? null, position: snapshot.position, photoUrl: snapshot.photoUrl || '' };
    }
  }
  match.resultConfirmedAt = now;
  match.resultConfirmedBy = userId;
  match.updatedBy = userId;
  await match.save();
  return { match: plain(match), result: match.result };
};
