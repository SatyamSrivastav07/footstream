import Match from '../models/Match.js';
import Player from '../models/Player.js';
import AppError from '../utils/AppError.js';
import { playerPhotoUrl } from './playerPhotoService.js';

export const MATCH_EDITABLE_FIELDS = Object.freeze([
  'opponent', 'tournament', 'venue', 'matchType', 'teamSide', 'scheduledAt', 'formation',
  'customFormation', 'startingPlayerIds', 'substitutePlayerIds', 'notes',
]);

export const FORMAT_STARTERS = Object.freeze({ '5v5': 5, '7v7': 7, '11v11': 11 });
export const FORMAT_FORMATIONS = Object.freeze({
  '5v5': ['1-2-1', '2-1-1', '1-1-2'],
  '7v7': ['2-3-1', '3-2-1', '2-2-2'],
  '11v11': ['4-3-3', '4-2-3-1', '4-4-2', '3-5-2', '3-4-3', '5-3-2', 'custom'],
});

const pick = (source, fields) => Object.fromEntries(
  fields.filter((field) => Object.hasOwn(source, field)).map((field) => [field, source[field]]),
);

const plain = (value) => (typeof value.toJSON === 'function' ? value.toJSON() : { ...value });
const idString = (value) => (value?._id || value).toString();
const sameId = (left, right) => idString(left) === idString(right);
const oppositeSide = (side) => (side === 'home' ? 'away' : 'home');

const HOST_PERMISSIONS = Object.freeze({
  canManage: true,
  canEditDetails: true,
  canEditLineup: true,
  canControlLive: true,
  canManageStream: true,
  canCancel: true,
  canDelete: true,
});

const REGISTERED_OPPONENT_PERMISSIONS = Object.freeze({
  canManage: false,
  canEditDetails: false,
  canEditLineup: true,
  canControlLive: false,
  canManageStream: false,
  canCancel: false,
  canDelete: false,
});

const OPPONENT_LINEUP_FIELDS = Object.freeze([
  'formation',
  'customFormation',
  'startingPlayerIds',
  'substitutePlayerIds',
]);

export const starterCountForFormat = (matchFormat = '11v11') => FORMAT_STARTERS[matchFormat] || 11;

export const teamMatchParticipantFilter = (teamId, base = {}) => ({
  ...base,
  isActive: base.isActive ?? true,
  $or: [{ team: teamId }, { registeredOpponentTeam: teamId }],
});

export const isHostTeam = (match, teamId) => sameId(match.team, teamId);

export const isRegisteredOpponentTeam = (match, teamId) => (
  Boolean(match.registeredOpponentTeam) && sameId(match.registeredOpponentTeam, teamId)
);

export const serializeMatchForTeam = (match, teamId) => {
  const data = plain(match);
  const hostTeam = data.team;
  const registeredOpponentTeam = data.registeredOpponentTeam;
  if (isRegisteredOpponentTeam(match, teamId) && !isHostTeam(match, teamId)) {
    return {
      ...data,
      team: registeredOpponentTeam || data.team,
      hostTeam,
      registeredOpponentTeam,
      opponent: {
        name: hostTeam?.name || data.opponent?.name || 'Opponent',
        temporaryPlayers: [],
      },
      teamSide: oppositeSide(data.teamSide),
      formation: data.registeredOpponentFormation || null,
      customFormation: data.registeredOpponentCustomFormation || '',
      startingXI: data.registeredOpponentStartingXI || [],
      substitutes: data.registeredOpponentSubstitutes || [],
      permissions: REGISTERED_OPPONENT_PERMISSIONS,
      perspective: 'registeredOpponent',
    };
  }
  return {
    ...data,
    hostTeam,
    registeredOpponentTeam,
    permissions: HOST_PERMISSIONS,
    perspective: 'host',
  };
};

export const validateFormation = (formation, customFormation, matchFormat = '11v11') => {
  if (formation && !FORMAT_FORMATIONS[matchFormat]?.includes(formation)) {
    throw new AppError(`Formation is not compatible with ${matchFormat}.`, 400, 'FORMATION_FORMAT_MISMATCH', [
      { field: 'formation', message: `Choose a formation compatible with ${matchFormat}.` },
    ]);
  }
  if (formation === 'custom' && !customFormation?.trim()) {
    throw new AppError('Custom formation is required.', 400, 'CUSTOM_FORMATION_REQUIRED', [
      { field: 'customFormation', message: 'Describe the custom formation.' },
    ]);
  }
  if (formation !== 'custom' && customFormation?.trim()) {
    throw new AppError('Custom formation can only be used with the custom option.', 400, 'CUSTOM_FORMATION_NOT_ALLOWED', [
      { field: 'customFormation', message: 'Clear this field or select custom formation.' },
    ]);
  }
};

export const validateSelections = (startingPlayerIds, substitutePlayerIds = [], matchFormat = '11v11') => {
  const requiredStarters = starterCountForFormat(matchFormat);
  if (!Array.isArray(startingPlayerIds) || startingPlayerIds.length !== requiredStarters) {
    throw new AppError(`Select exactly ${requiredStarters} starters for ${matchFormat}.`, 400, 'STARTING_XI_SIZE', [
      { field: 'startingPlayerIds', message: `Starting lineup must contain exactly ${requiredStarters} players.` },
    ]);
  }
  const starters = startingPlayerIds.map(String);
  const substitutes = (substitutePlayerIds || []).map(String);
  if (new Set(starters).size !== starters.length) {
    throw new AppError('Starting XI contains a duplicate player.', 400, 'DUPLICATE_STARTER');
  }
  if (new Set(substitutes).size !== substitutes.length) {
    throw new AppError('Substitutes contain a duplicate player.', 400, 'DUPLICATE_SUBSTITUTE');
  }
  const overlap = substitutes.find((id) => starters.includes(id));
  if (overlap) throw new AppError('A player cannot be both a starter and a substitute.', 400, 'LINEUP_OVERLAP');
  return { starters, substitutes, allIds: [...starters, ...substitutes] };
};

export const playerSnapshot = (player) => ({
  player: player._id,
  name: player.name,
  jerseyNumber: player.jerseyNumber ?? null,
  position: player.position,
  photoUrl: playerPhotoUrl(player),
  isCaptain: Boolean(player.isCaptain),
  isViceCaptain: Boolean(player.isViceCaptain),
});

export const buildLineupSnapshots = async ({
  playerModel = Player,
  teamId,
  startingPlayerIds,
  substitutePlayerIds = [],
  matchFormat = '11v11',
}) => {
  const selection = validateSelections(startingPlayerIds, substitutePlayerIds, matchFormat);
  const players = await playerModel.find({ _id: { $in: selection.allIds } });
  const byId = new Map(players.map((player) => [idString(player), player]));

  for (const selectedId of selection.allIds) {
    const player = byId.get(selectedId);
    if (!player || idString(player.team) !== idString(teamId)) {
      throw new AppError('One or more selected players are invalid for this team.', 400, 'INVALID_TEAM_PLAYER');
    }
    if (!player.isActive) throw new AppError(`${player.name} is inactive and cannot be selected.`, 400, 'INACTIVE_PLAYER');
    if (player.availabilityStatus !== 'available') {
      throw new AppError(`${player.name} is ${player.availabilityStatus} and cannot be selected.`, 400, 'PLAYER_UNAVAILABLE');
    }
  }

  return {
    startingXI: selection.starters.map((id) => playerSnapshot(byId.get(id))),
    substitutes: selection.substitutes.map((id) => playerSnapshot(byId.get(id))),
  };
};

export const assertFutureSchedule = (scheduledAt, now = new Date()) => {
  const date = new Date(scheduledAt);
  if (Number.isNaN(date.getTime()) || date <= now) {
    throw new AppError('Scheduled date and time must be in the future.', 400, 'INVALID_SCHEDULE', [
      { field: 'scheduledAt', message: 'Choose a future date and kickoff time.' },
    ]);
  }
  return date;
};

export const createMatchForTeam = async ({
  matchModel = Match,
  playerModel = Player,
  teamId,
  userId,
  input,
  now,
}) => {
  const values = pick(input, MATCH_EDITABLE_FIELDS);
  values.scheduledAt = assertFutureSchedule(values.scheduledAt, now);
  validateFormation(values.formation, values.customFormation, '11v11');
  const snapshots = await buildLineupSnapshots({
    playerModel,
    teamId,
    startingPlayerIds: values.startingPlayerIds,
    substitutePlayerIds: values.substitutePlayerIds,
    matchFormat: '11v11',
  });
  delete values.startingPlayerIds;
  delete values.substitutePlayerIds;
  if (values.formation !== 'custom') values.customFormation = '';
  const match = await matchModel.create({
    ...values,
    ...snapshots,
    team: teamId,
    status: 'scheduled',
    isActive: true,
    createdBy: userId,
  });
  return plain(match);
};

export const findOwnedMatch = async ({ matchModel = Match, teamId, matchId }) => {
  const match = await matchModel.findOne({ _id: matchId, team: teamId, isActive: true });
  if (!match) throw new AppError('Match not found.', 404, 'MATCH_NOT_FOUND');
  return match;
};

export const getOwnedMatch = async (options) => plain(await findOwnedMatch(options));

export const findParticipantMatch = async ({ matchModel = Match, teamId, matchId }) => {
  let query = matchModel.findOne(teamMatchParticipantFilter(teamId, { _id: matchId }));
  if (typeof query?.populate === 'function') {
    query = query.populate('team', 'name slug logo').populate('registeredOpponentTeam', 'name slug logo');
  }
  const match = await query;
  if (!match) throw new AppError('Match not found.', 404, 'MATCH_NOT_FOUND');
  return match;
};

export const getParticipantMatch = async (options) => serializeMatchForTeam(await findParticipantMatch(options), options.teamId);

export const assertScheduled = (match) => {
  if (match.status !== 'scheduled') {
    throw new AppError('Only scheduled matches can be changed.', 409, 'MATCH_NOT_SCHEDULED');
  }
};

export const updateMatchForTeam = async ({
  matchModel = Match,
  playerModel = Player,
  teamId,
  matchId,
  userId,
  input,
  now,
}) => {
  const match = await findParticipantMatch({ matchModel, teamId, matchId });
  assertScheduled(match);
  const updates = pick(input, MATCH_EDITABLE_FIELDS);
  const hostTeam = isHostTeam(match, teamId);
  const registeredOpponent = isRegisteredOpponentTeam(match, teamId) && !hostTeam;
  if (registeredOpponent) {
    const disallowed = Object.keys(input).filter((field) => !OPPONENT_LINEUP_FIELDS.includes(field));
    if (disallowed.length) {
      throw new AppError('Registered opponents may only update their own lineup.', 403, 'MATCH_OPPONENT_LINEUP_ONLY');
    }
  }
  if (match.sourceChallenge && Object.hasOwn(input, 'matchFormat')) {
    throw new AppError('Challenge-created match format cannot be changed.', 400, 'MATCH_FORMAT_IMMUTABLE');
  }
  const currentFormation = registeredOpponent ? match.registeredOpponentFormation : match.formation;
  const currentCustomFormation = registeredOpponent ? match.registeredOpponentCustomFormation : match.customFormation;
  const formation = Object.hasOwn(updates, 'formation') ? updates.formation : currentFormation;
  const customFormation = Object.hasOwn(updates, 'customFormation') ? updates.customFormation : currentCustomFormation;
  validateFormation(formation, customFormation, match.matchFormat || '11v11');
  if (!registeredOpponent && Object.hasOwn(updates, 'scheduledAt')) updates.scheduledAt = assertFutureSchedule(updates.scheduledAt, now);

  if (Object.hasOwn(updates, 'startingPlayerIds') || Object.hasOwn(updates, 'substitutePlayerIds')) {
    const currentStarters = (registeredOpponent ? match.registeredOpponentStartingXI : match.startingXI).map((entry) => idString(entry.player));
    const currentSubstitutes = (registeredOpponent ? match.registeredOpponentSubstitutes : match.substitutes).map((entry) => idString(entry.player));
    const snapshots = await buildLineupSnapshots({
      playerModel,
      teamId,
      startingPlayerIds: updates.startingPlayerIds || currentStarters,
      substitutePlayerIds: updates.substitutePlayerIds || currentSubstitutes,
      matchFormat: match.matchFormat || '11v11',
    });
    if (registeredOpponent) {
      updates.registeredOpponentStartingXI = snapshots.startingXI;
      updates.registeredOpponentSubstitutes = snapshots.substitutes;
    } else {
      updates.startingXI = snapshots.startingXI;
      updates.substitutes = snapshots.substitutes;
    }
  }
  delete updates.startingPlayerIds;
  delete updates.substitutePlayerIds;
  if (registeredOpponent) {
    delete updates.opponent;
    delete updates.tournament;
    delete updates.venue;
    delete updates.matchType;
    delete updates.teamSide;
    delete updates.scheduledAt;
    delete updates.notes;
    if (Object.hasOwn(updates, 'formation')) {
      updates.registeredOpponentFormation = updates.formation;
      delete updates.formation;
    }
    if (Object.hasOwn(updates, 'customFormation')) {
      updates.registeredOpponentCustomFormation = formation === 'custom' ? updates.customFormation : '';
      delete updates.customFormation;
    } else if (formation !== 'custom') {
      updates.registeredOpponentCustomFormation = '';
    }
  } else if (formation !== 'custom') updates.customFormation = '';
  Object.assign(match, updates, { updatedBy: userId });
  await match.save();
  return serializeMatchForTeam(match, teamId);
};

export const cancelMatchForTeam = async ({ matchModel = Match, teamId, matchId, userId, now = new Date() }) => {
  const match = await findOwnedMatch({ matchModel, teamId, matchId });
  assertScheduled(match);
  match.status = 'cancelled';
  match.cancelledAt = now;
  match.updatedBy = userId;
  await match.save();
  return plain(match);
};

export const softDeleteMatchForTeam = async ({ matchModel = Match, teamId, matchId, userId }) => {
  const match = await findOwnedMatch({ matchModel, teamId, matchId });
  assertScheduled(match);
  match.isActive = false;
  match.updatedBy = userId;
  await match.save();
  return plain(match);
};

export const sortMatchesForDisplay = (matches, now = new Date()) => {
  const values = matches.map(plain);
  const upcoming = values
    .filter((match) => new Date(match.scheduledAt) >= now)
    .sort((a, b) => new Date(a.scheduledAt) - new Date(b.scheduledAt));
  const past = values
    .filter((match) => new Date(match.scheduledAt) < now)
    .sort((a, b) => new Date(b.scheduledAt) - new Date(a.scheduledAt));
  return [...upcoming, ...past];
};

