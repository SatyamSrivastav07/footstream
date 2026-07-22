import Match from '../models/Match.js';
import Player from '../models/Player.js';
import Team from '../models/Team.js';
import AppError from '../utils/AppError.js';
import { playerPhotoUrl } from './playerPhotoService.js';

export const MATCH_EDITABLE_FIELDS = Object.freeze([
  'opponent', 'tournament', 'venue', 'matchType', 'teamSide', 'scheduledAt', 'formation',
  'customFormation', 'startingPlayerIds', 'substitutePlayerIds', 'notes', 'opponentMode',
  'registeredOpponentTeam', 'opponentLineup', 'matchFormat', 'lineupPlacements', 'matchMode',
]);

export const FORMAT_STARTERS = Object.freeze({ '5v5': 5, '6v6': 6, '7v7': 7, '8v8': 8, '9v9': 9, '11v11': 11 });
export const FORMAT_FORMATIONS = Object.freeze({
  '5v5': ['1-2-1', '2-1-1', '1-1-2'],
  '6v6': ['2-2-1', '2-1-2', '1-3-1'],
  '7v7': ['2-3-1', '3-2-1', '2-2-2'],
  '8v8': ['3-3-1', '2-3-2', '3-2-2'],
  '9v9': ['3-3-2', '3-2-3', '2-3-3'],
  '11v11': ['4-3-3', '4-2-3-1', '4-4-2', '3-5-2', '3-4-3', '5-3-2', 'custom'],
});

const parseFormationLines = (formation) => (/^\d+(?:-\d+){1,5}$/.test(String(formation || '')) ? String(formation).split('-').map(Number) : []);

const formationSlots = ({ formation, customFormation, matchFormat = '11v11' }) => {
  const effectiveFormation = formation === 'custom' ? customFormation : formation;
  const lines = parseFormationLines(effectiveFormation);
  if (!lines.length) return [];
  const slots = [{ slotId: 'GK', lineIndex: 0, positionIndex: 0, roleLabel: 'Goalkeeper', x: 0.5, y: 0.92 }];
  lines.forEach((count, lineIndex) => {
    const y = 0.78 - (lineIndex * (0.58 / Math.max(lines.length - 1, 1)));
    for (let index = 0; index < count; index += 1) {
      slots.push({
        slotId: `L${lineIndex + 1}-P${index + 1}`,
        lineIndex: lineIndex + 1,
        positionIndex: index,
        roleLabel: `Line ${lineIndex + 1}`,
        x: (index + 1) / (count + 1),
        y: Number(y.toFixed(3)),
      });
    }
  });
  return slots.slice(0, starterCountForFormat(matchFormat));
};

const applyLineupPlacements = ({ snapshots, placements = {}, formation, customFormation, matchFormat }) => {
  const slots = formationSlots({ formation, customFormation, matchFormat });
  if (!slots.length) return snapshots;
  const slotById = new Map(slots.map((slot) => [slot.slotId, slot]));
  const usedSlots = new Set();
  return snapshots.map((snapshot) => {
    const placement = placements[String(snapshot.player)] || placements[String(snapshot.player?._id)] || '';
    const slotId = typeof placement === 'string' ? placement : placement?.slotId;
    if (!slotId) return snapshot;
    const slot = slotById.get(slotId);
    if (!slot || usedSlots.has(slotId)) return snapshot;
    usedSlots.add(slotId);
    return { ...snapshot, ...slot };
  });
};

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

const normalizeOpponentName = (value = '') => String(value).trim().replace(/\s+/g, ' ').toLowerCase();

const safePlayer = (player) => ({
  _id: player._id,
  name: player.name,
  position: player.position,
  jerseyNumber: player.jerseyNumber ?? null,
  photoUrl: playerPhotoUrl(player),
  isCaptain: Boolean(player.isCaptain),
  isViceCaptain: Boolean(player.isViceCaptain),
});

const safeOpponentTeam = (team) => ({
  _id: team._id,
  name: team.name,
  shortName: team.shortName || '',
  slug: team.slug || '',
  city: team.city || '',
  logo: team.logo || '',
});

const escapeRegex = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

export const listOpponentTeams = async ({ teamModel = Team, hostTeamId, query = {} }) => {
  const filter = { isPublished: true, isArchived: false, _id: { $ne: hostTeamId } };
  if (query.search?.trim()) filter.name = { $regex: escapeRegex(query.search.trim()), $options: 'i' };
  let teamsQuery = teamModel.find(filter);
  if (typeof teamsQuery?.sort === 'function') teamsQuery = teamsQuery.sort({ name: 1, _id: 1 });
  if (typeof teamsQuery?.limit === 'function') teamsQuery = teamsQuery.limit(20);
  if (typeof teamsQuery?.lean === 'function') teamsQuery = teamsQuery.lean();
  const teams = await teamsQuery;
  return { teams: teams.map(safeOpponentTeam) };
};

export const listOpponentPlayers = async ({ teamModel = Team, playerModel = Player, hostTeamId, opponentTeamId }) => {
  if (sameId(hostTeamId, opponentTeamId)) {
    throw new AppError('Choose a different registered opponent team.', 400, 'OPPONENT_OWN_TEAM');
  }
  const team = await teamModel.findOne({ _id: opponentTeamId, isPublished: true, isArchived: false });
  if (!team) throw new AppError('Registered opponent team not found.', 404, 'OPPONENT_TEAM_NOT_FOUND');
  let query = playerModel.find({ team: opponentTeamId, isActive: true });
  if (typeof query?.select === 'function') query = query.select('-createdBy -updatedBy -__v -photo');
  const players = await query;
  return {
    team: { _id: team._id, name: team.name, shortName: team.shortName || '', slug: team.slug || '' },
    players: players.map(safePlayer),
  };
};

export const assertNoDuplicateScheduledMatch = async ({
  matchModel = Match,
  teamId,
  scheduledAt,
  registeredOpponentTeam = null,
  opponentName = '',
  excludeMatchId = null,
}) => {
  if (typeof matchModel.findOne !== 'function') return;
  const filter = {
    team: teamId,
    scheduledAt,
    isActive: true,
    status: { $ne: 'cancelled' },
  };
  if (registeredOpponentTeam) {
    filter.registeredOpponentTeam = registeredOpponentTeam;
  } else {
    filter.registeredOpponentTeam = null;
    filter['opponent.name'] = { $regex: `^${escapeRegex(normalizeOpponentName(opponentName))}$`, $options: 'i' };
  }
  if (excludeMatchId) filter._id = { $ne: excludeMatchId };
  let query = matchModel.findOne(filter);
  if (typeof query?.select === 'function') query = query.select('_id');
  if (typeof query?.lean === 'function') query = query.lean();
  const duplicate = await query;
  if (duplicate) {
    throw new AppError('A match with the same opponent and kickoff time already exists.', 409, 'MATCH_ALREADY_EXISTS');
  }
};

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

const opponentRegisteredSnapshot = (player) => ({
  sourceType: 'registered',
  player: player._id,
  registeredPlayer: player._id,
  name: player.name,
  jerseyNumber: player.jerseyNumber ?? null,
  position: player.position,
  photoUrl: playerPhotoUrl(player),
  isCaptain: Boolean(player.isCaptain),
  isViceCaptain: Boolean(player.isViceCaptain),
});

const temporaryOpponentSnapshot = (entry) => ({
  sourceType: 'temporary',
  player: null,
  registeredPlayer: null,
  name: String(entry.name || '').trim(),
  jerseyNumber: entry.jerseyNumber ?? null,
  position: String(entry.position || '').trim() || 'Guest',
  photoUrl: '',
  isCaptain: false,
  isViceCaptain: false,
});

const opponentSnapshotToInput = (entry) => ({
  sourceType: entry.sourceType === 'temporary' ? 'temporary' : 'registered',
  playerId: entry.registeredPlayer || entry.player || '',
  name: entry.name || '',
  position: entry.position || '',
  jerseyNumber: entry.jerseyNumber ?? null,
});

export const buildLineupSnapshots = async ({
  playerModel = Player,
  teamId,
  startingPlayerIds,
  substitutePlayerIds = [],
  matchFormat = '11v11',
  formation = '',
  customFormation = '',
  lineupPlacements = {},
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
    startingXI: applyLineupPlacements({
      snapshots: selection.starters.map((id) => playerSnapshot(byId.get(id))),
      placements: lineupPlacements,
      formation,
      customFormation,
      matchFormat,
    }),
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
  teamModel = Team,
  teamId,
  userId,
  input,
  now,
}) => {
  const values = pick(input, MATCH_EDITABLE_FIELDS);
  values.scheduledAt = assertFutureSchedule(values.scheduledAt, now);
  values.matchFormat = values.matchFormat || '11v11';
  validateFormation(values.formation, values.customFormation, values.matchFormat);
  const snapshots = await buildLineupSnapshots({
    playerModel,
    teamId,
    startingPlayerIds: values.startingPlayerIds,
    substitutePlayerIds: values.substitutePlayerIds,
    matchFormat: values.matchFormat,
    formation: values.formation,
    customFormation: values.customFormation,
    lineupPlacements: values.lineupPlacements,
  });
  const opponentMode = values.opponentMode || 'manual';
  let opponentSnapshots = {};
  if (opponentMode === 'registered') {
    if (!values.registeredOpponentTeam) throw new AppError('Choose a registered opponent team.', 400, 'REGISTERED_OPPONENT_REQUIRED');
    const opponentData = await listOpponentPlayers({ teamModel, playerModel, hostTeamId: teamId, opponentTeamId: values.registeredOpponentTeam });
    values.opponent = {
      name: opponentData.team.name,
      temporaryPlayers: [],
    };
    opponentSnapshots = await buildOpponentLineupSnapshots({
      playerModel,
      opponentTeamId: values.registeredOpponentTeam,
      opponentLineup: values.opponentLineup,
      matchFormat: values.matchFormat,
    });
    values.opponent.temporaryPlayers = opponentSnapshots.opponentTemporaryPlayers;
    delete opponentSnapshots.opponentTemporaryPlayers;
  } else {
    if (values.registeredOpponentTeam || values.opponentLineup) {
      throw new AppError('Manual opponents cannot include registered opponent team or lineup references.', 400, 'MANUAL_OPPONENT_REGISTERED_FIELDS');
    }
    values.registeredOpponentTeam = null;
  }
  delete values.startingPlayerIds;
  delete values.substitutePlayerIds;
  delete values.opponentMode;
  delete values.opponentLineup;
  delete values.lineupPlacements;
  if (values.formation !== 'custom') values.customFormation = '';
  await assertNoDuplicateScheduledMatch({
    matchModel,
    teamId,
    scheduledAt: values.scheduledAt,
    registeredOpponentTeam: values.registeredOpponentTeam,
    opponentName: values.opponent?.name,
  });
  const match = await matchModel.create({
    ...values,
    ...snapshots,
    ...opponentSnapshots,
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

const normalizeOpponentLineupEntry = (entry) => ({
  sourceType: entry?.sourceType === 'temporary' ? 'temporary' : 'registered',
  playerId: entry?.playerId || entry?.player || entry?.registeredPlayer || '',
  name: String(entry?.name || '').trim(),
  position: String(entry?.position || '').trim(),
  jerseyNumber: entry?.jerseyNumber === '' || entry?.jerseyNumber === undefined ? null : entry?.jerseyNumber,
});

const entryKey = (entry) => entry.sourceType === 'registered'
  ? `registered:${String(entry.playerId)}`
  : `temporary:${entry.name.toLowerCase()}:${String(entry.jerseyNumber || '')}`;

export const buildOpponentLineupSnapshots = async ({
  playerModel = Player,
  opponentTeamId,
  opponentLineup = {},
  matchFormat = '11v11',
}) => {
  const requiredStarters = starterCountForFormat(matchFormat);
  const starters = (opponentLineup.starting || []).map(normalizeOpponentLineupEntry);
  const substitutes = (opponentLineup.substitutes || []).map(normalizeOpponentLineupEntry);
  if (starters.length !== requiredStarters) {
    throw new AppError(`Select exactly ${requiredStarters} opponent starters for ${matchFormat}.`, 400, 'OPPONENT_STARTING_XI_SIZE', [
      { field: 'opponentLineup.starting', message: `${matchFormat} requires exactly ${requiredStarters} opponent starters.` },
    ]);
  }
  const all = [...starters, ...substitutes];
  const starterKeys = starters.map(entryKey);
  const substituteKeys = substitutes.map(entryKey);
  if (new Set(starterKeys).size !== starterKeys.length) throw new AppError('Opponent starters contain a duplicate player.', 400, 'OPPONENT_DUPLICATE_STARTER');
  if (new Set(substituteKeys).size !== substituteKeys.length) throw new AppError('Opponent substitutes contain a duplicate player.', 400, 'OPPONENT_DUPLICATE_SUBSTITUTE');
  if (substituteKeys.find((key) => starterKeys.includes(key))) throw new AppError('An opponent player cannot be both a starter and a substitute.', 400, 'OPPONENT_LINEUP_OVERLAP');

  const registeredIds = all.filter((entry) => entry.sourceType === 'registered').map((entry) => String(entry.playerId));
  if (registeredIds.some((id) => !id)) throw new AppError('Registered opponent player is required.', 400, 'OPPONENT_PLAYER_REQUIRED');
  const players = registeredIds.length ? await playerModel.find({ _id: { $in: registeredIds } }) : [];
  const byId = new Map(players.map((player) => [idString(player), player]));
  for (const id of registeredIds) {
    const player = byId.get(String(id));
    if (!player || !sameId(player.team, opponentTeamId)) throw new AppError('One or more opponent players do not belong to the selected opponent team.', 400, 'INVALID_OPPONENT_PLAYER');
    if (!player.isActive) throw new AppError(`${player.name} is inactive and cannot be selected.`, 400, 'INACTIVE_OPPONENT_PLAYER');
  }
  const tempNames = all.filter((entry) => entry.sourceType === 'temporary').map((entry) => entry.name.toLowerCase());
  if (tempNames.some((name) => name.length < 2)) throw new AppError('Temporary opponent player name must be 2 to 100 characters.', 400, 'TEMPORARY_OPPONENT_NAME_INVALID');
  if (new Set(tempNames).size !== tempNames.length) throw new AppError('Temporary opponent players contain duplicate names.', 400, 'TEMPORARY_OPPONENT_DUPLICATE');
  const snapshot = (entry) => entry.sourceType === 'registered' ? opponentRegisteredSnapshot(byId.get(String(entry.playerId))) : temporaryOpponentSnapshot(entry);
  return {
    registeredOpponentStartingXI: starters.map(snapshot),
    registeredOpponentSubstitutes: substitutes.map(snapshot),
    opponentTemporaryPlayers: all.filter((entry) => entry.sourceType === 'temporary').map((entry) => ({
      name: entry.name,
      position: entry.position,
      jerseyNumber: entry.jerseyNumber,
    })),
  };
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
  teamModel = Team,
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
  if (!registeredOpponent && Object.hasOwn(updates, 'registeredOpponentTeam') && updates.opponentMode !== 'registered') {
    throw new AppError('Use registered opponent mode when selecting a registered opponent team.', 400, 'REGISTERED_OPPONENT_MODE_REQUIRED');
  }
  if (!registeredOpponent && updates.opponentMode === 'registered' && Object.hasOwn(updates, 'registeredOpponentTeam') && !Object.hasOwn(updates, 'opponentLineup')) {
    throw new AppError('Select the registered opponent lineup when changing opponent team.', 400, 'OPPONENT_LINEUP_REQUIRED');
  }
  const currentFormation = registeredOpponent ? match.registeredOpponentFormation : match.formation;
  const currentCustomFormation = registeredOpponent ? match.registeredOpponentCustomFormation : match.customFormation;
  const formation = Object.hasOwn(updates, 'formation') ? updates.formation : currentFormation;
  const customFormation = Object.hasOwn(updates, 'customFormation') ? updates.customFormation : currentCustomFormation;
  const effectiveMatchFormat = updates.matchFormat || match.matchFormat || '11v11';
  validateFormation(formation, customFormation, effectiveMatchFormat);
  if (!registeredOpponent && Object.hasOwn(updates, 'scheduledAt')) updates.scheduledAt = assertFutureSchedule(updates.scheduledAt, now);

  if (Object.hasOwn(updates, 'startingPlayerIds') || Object.hasOwn(updates, 'substitutePlayerIds') || Object.hasOwn(updates, 'matchFormat')) {
    const currentStarters = (registeredOpponent ? match.registeredOpponentStartingXI : match.startingXI).map((entry) => idString(entry.player));
    const currentSubstitutes = (registeredOpponent ? match.registeredOpponentSubstitutes : match.substitutes).map((entry) => idString(entry.player));
    const snapshots = await buildLineupSnapshots({
      playerModel,
      teamId,
      startingPlayerIds: updates.startingPlayerIds || currentStarters,
      substitutePlayerIds: updates.substitutePlayerIds || currentSubstitutes,
      matchFormat: effectiveMatchFormat,
      formation,
      customFormation,
      lineupPlacements: updates.lineupPlacements,
    });
    if (registeredOpponent) {
      updates.registeredOpponentStartingXI = snapshots.startingXI;
      updates.registeredOpponentSubstitutes = snapshots.substitutes;
      updates.registeredOpponentLineupManagedByOpponent = true;
    } else {
      updates.startingXI = snapshots.startingXI;
      updates.substitutes = snapshots.substitutes;
    }
  }
  if (!registeredOpponent && Object.hasOwn(updates, 'opponentLineup')) {
    if (!match.registeredOpponentTeam && updates.opponentMode !== 'registered') {
      throw new AppError('Choose a registered opponent before setting opponent lineup.', 400, 'REGISTERED_OPPONENT_REQUIRED');
    }
    if (match.registeredOpponentLineupManagedByOpponent) {
      throw new AppError('The registered opponent has submitted its own lineup. Ask them to update that side.', 409, 'OPPONENT_LINEUP_LOCKED');
    }
    const opponentTeamId = updates.registeredOpponentTeam || match.registeredOpponentTeam;
    const opponentSnapshots = await buildOpponentLineupSnapshots({
      playerModel,
      opponentTeamId,
      opponentLineup: updates.opponentLineup,
      matchFormat: effectiveMatchFormat,
    });
    updates.registeredOpponentStartingXI = opponentSnapshots.registeredOpponentStartingXI;
    updates.registeredOpponentSubstitutes = opponentSnapshots.registeredOpponentSubstitutes;
    updates.opponent = {
      ...(updates.opponent || match.opponent || {}),
      temporaryPlayers: opponentSnapshots.opponentTemporaryPlayers,
    };
  }
  if (!registeredOpponent && Object.hasOwn(updates, 'matchFormat') && match.registeredOpponentTeam && !Object.hasOwn(input, 'opponentLineup')) {
    const opponentTeamId = updates.registeredOpponentTeam || match.registeredOpponentTeam;
    const opponentSnapshots = await buildOpponentLineupSnapshots({
      playerModel,
      opponentTeamId,
      opponentLineup: {
        starting: (match.registeredOpponentStartingXI || []).map(opponentSnapshotToInput),
        substitutes: (match.registeredOpponentSubstitutes || []).map(opponentSnapshotToInput),
      },
      matchFormat: effectiveMatchFormat,
    });
    updates.registeredOpponentStartingXI = opponentSnapshots.registeredOpponentStartingXI;
    updates.registeredOpponentSubstitutes = opponentSnapshots.registeredOpponentSubstitutes;
    updates.opponent = {
      ...(updates.opponent || match.opponent || {}),
      temporaryPlayers: opponentSnapshots.opponentTemporaryPlayers,
    };
  }
  if (!registeredOpponent && updates.opponentMode === 'registered') {
    const opponentTeamId = updates.registeredOpponentTeam || match.registeredOpponentTeam;
    if (!opponentTeamId) throw new AppError('Choose a registered opponent team.', 400, 'REGISTERED_OPPONENT_REQUIRED');
    const opponentData = await listOpponentPlayers({ teamModel, playerModel, hostTeamId: teamId, opponentTeamId });
    updates.registeredOpponentTeam = opponentTeamId;
    updates.opponent = { ...(updates.opponent || {}), name: opponentData.team.name, temporaryPlayers: updates.opponent?.temporaryPlayers || match.opponent?.temporaryPlayers || [] };
  }
  if (!registeredOpponent && updates.opponentMode === 'manual') {
    updates.registeredOpponentTeam = null;
    updates.registeredOpponentStartingXI = [];
    updates.registeredOpponentSubstitutes = [];
    updates.registeredOpponentLineupManagedByOpponent = false;
  }
  delete updates.startingPlayerIds;
  delete updates.substitutePlayerIds;
  delete updates.opponentMode;
  delete updates.opponentLineup;
  delete updates.lineupPlacements;
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
  if (!registeredOpponent && (
    Object.hasOwn(updates, 'scheduledAt')
    || Object.hasOwn(updates, 'registeredOpponentTeam')
    || Object.hasOwn(updates, 'opponent')
  )) {
    await assertNoDuplicateScheduledMatch({
      matchModel,
      teamId,
      scheduledAt: updates.scheduledAt || match.scheduledAt,
      registeredOpponentTeam: updates.registeredOpponentTeam === null ? null : (updates.registeredOpponentTeam || match.registeredOpponentTeam),
      opponentName: updates.opponent?.name || match.opponent?.name,
      excludeMatchId: match._id,
    });
  }
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

