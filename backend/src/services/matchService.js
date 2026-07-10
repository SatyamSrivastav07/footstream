import Match from '../models/Match.js';
import Player from '../models/Player.js';
import AppError from '../utils/AppError.js';

export const MATCH_EDITABLE_FIELDS = Object.freeze([
  'opponent', 'tournament', 'venue', 'matchType', 'teamSide', 'scheduledAt', 'formation',
  'customFormation', 'startingPlayerIds', 'substitutePlayerIds', 'notes',
]);

const pick = (source, fields) => Object.fromEntries(
  fields.filter((field) => Object.hasOwn(source, field)).map((field) => [field, source[field]]),
);

const plain = (value) => (typeof value.toJSON === 'function' ? value.toJSON() : { ...value });
const idString = (value) => (value?._id || value).toString();

export const validateFormation = (formation, customFormation) => {
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

export const validateSelections = (startingPlayerIds, substitutePlayerIds = []) => {
  if (!Array.isArray(startingPlayerIds) || startingPlayerIds.length !== 11) {
    throw new AppError('Select exactly 11 starting players.', 400, 'STARTING_XI_SIZE', [
      { field: 'startingPlayerIds', message: 'Starting XI must contain exactly 11 players.' },
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
  photoUrl: player.photoUrl || '',
  isCaptain: Boolean(player.isCaptain),
  isViceCaptain: Boolean(player.isViceCaptain),
});

export const buildLineupSnapshots = async ({
  playerModel = Player,
  teamId,
  startingPlayerIds,
  substitutePlayerIds = [],
}) => {
  const selection = validateSelections(startingPlayerIds, substitutePlayerIds);
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
  validateFormation(values.formation, values.customFormation);
  const snapshots = await buildLineupSnapshots({
    playerModel,
    teamId,
    startingPlayerIds: values.startingPlayerIds,
    substitutePlayerIds: values.substitutePlayerIds,
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
  const match = await findOwnedMatch({ matchModel, teamId, matchId });
  assertScheduled(match);
  const updates = pick(input, MATCH_EDITABLE_FIELDS);
  const formation = Object.hasOwn(updates, 'formation') ? updates.formation : match.formation;
  const customFormation = Object.hasOwn(updates, 'customFormation') ? updates.customFormation : match.customFormation;
  validateFormation(formation, customFormation);
  if (Object.hasOwn(updates, 'scheduledAt')) updates.scheduledAt = assertFutureSchedule(updates.scheduledAt, now);

  if (Object.hasOwn(updates, 'startingPlayerIds') || Object.hasOwn(updates, 'substitutePlayerIds')) {
    const currentStarters = match.startingXI.map((entry) => idString(entry.player));
    const currentSubstitutes = match.substitutes.map((entry) => idString(entry.player));
    const snapshots = await buildLineupSnapshots({
      playerModel,
      teamId,
      startingPlayerIds: updates.startingPlayerIds || currentStarters,
      substitutePlayerIds: updates.substitutePlayerIds || currentSubstitutes,
    });
    updates.startingXI = snapshots.startingXI;
    updates.substitutes = snapshots.substitutes;
  }
  delete updates.startingPlayerIds;
  delete updates.substitutePlayerIds;
  if (formation !== 'custom') updates.customFormation = '';
  Object.assign(match, updates, { updatedBy: userId });
  await match.save();
  return plain(match);
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

