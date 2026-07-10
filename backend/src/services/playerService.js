import Player from '../models/Player.js';
import AppError from '../utils/AppError.js';

export const PLAYER_EDITABLE_FIELDS = Object.freeze([
  'name',
  'photoUrl',
  'position',
  'jerseyNumber',
  'age',
  'academicYear',
  'preferredFoot',
  'availabilityStatus',
  'isCaptain',
  'isViceCaptain',
]);

const pick = (source, fields) => Object.fromEntries(
  fields.filter((field) => Object.hasOwn(source, field)).map((field) => [field, source[field]]),
);

const withoutInternalFields = (player) => {
  const value = typeof player.toJSON === 'function' ? player.toJSON() : { ...player };
  delete value.__v;
  delete value.createdBy;
  delete value.updatedBy;
  return value;
};

export const assertActiveAccount = (user) => {
  if (!user?.isActive) {
    throw new AppError('This account is unavailable.', 401, 'ACCOUNT_UNAVAILABLE');
  }
};

export const validateLeadership = (values) => {
  if (values.isCaptain && values.isViceCaptain) {
    throw new AppError(
      'A player cannot be captain and vice-captain at the same time.',
      422,
      'LEADERSHIP_CONFLICT',
      [{ field: 'isViceCaptain', message: 'Choose either captain or vice-captain.' }],
    );
  }
};

export const enforceSquadRules = async ({ model = Player, teamId, playerId, values }) => {
  validateLeadership(values);
  if (values.isActive === false) return;

  const excludeCurrent = playerId ? { _id: { $ne: playerId } } : {};

  if (values.jerseyNumber !== null && values.jerseyNumber !== undefined) {
    const duplicateJersey = await model.exists({
      team: teamId,
      jerseyNumber: values.jerseyNumber,
      isActive: true,
      ...excludeCurrent,
    });
    if (duplicateJersey) {
      throw new AppError(
        `Jersey number ${values.jerseyNumber} is already assigned to an active player.`,
        409,
        'JERSEY_IN_USE',
        [{ field: 'jerseyNumber', message: 'Choose another jersey number.' }],
      );
    }
  }

  if (values.isCaptain) {
    const captain = await model.exists({ team: teamId, isCaptain: true, isActive: true, ...excludeCurrent });
    if (captain) {
      throw new AppError('This team already has an active captain.', 409, 'CAPTAIN_EXISTS', [
        { field: 'isCaptain', message: 'Remove the current captain first.' },
      ]);
    }
  }

  if (values.isViceCaptain) {
    const viceCaptain = await model.exists({ team: teamId, isViceCaptain: true, isActive: true, ...excludeCurrent });
    if (viceCaptain) {
      throw new AppError('This team already has an active vice-captain.', 409, 'VICE_CAPTAIN_EXISTS', [
        { field: 'isViceCaptain', message: 'Remove the current vice-captain first.' },
      ]);
    }
  }
};

export const createPlayerForTeam = async ({ model = Player, teamId, userId, input }) => {
  const values = {
    ...pick(input, PLAYER_EDITABLE_FIELDS),
    isActive: true,
  };
  await enforceSquadRules({ model, teamId, values });
  const player = await model.create({ ...values, team: teamId, createdBy: userId });
  return withoutInternalFields(player);
};

export const findPlayerForTeam = async ({ model = Player, teamId, playerId }) => {
  const player = await model.findOne({ _id: playerId, team: teamId });
  if (!player) throw new AppError('Player not found.', 404, 'PLAYER_NOT_FOUND');
  return player;
};

export const getPlayerForTeam = async (options) => {
  const player = await findPlayerForTeam(options);
  return withoutInternalFields(player);
};

export const updatePlayerForTeam = async ({ model = Player, teamId, playerId, userId, input }) => {
  const player = await findPlayerForTeam({ model, teamId, playerId });
  const updates = pick(input, PLAYER_EDITABLE_FIELDS);
  const current = typeof player.toObject === 'function' ? player.toObject() : { ...player };
  const values = { ...current, ...updates };
  await enforceSquadRules({ model, teamId, playerId, values });
  Object.assign(player, updates, { updatedBy: userId });
  await player.save();
  return withoutInternalFields(player);
};

export const updatePlayerStatusForTeam = async ({ model = Player, teamId, playerId, userId, input }) => {
  const player = await findPlayerForTeam({ model, teamId, playerId });
  const updates = pick(input, ['availabilityStatus', 'isActive']);

  if (updates.isActive === false) {
    updates.isCaptain = false;
    updates.isViceCaptain = false;
  }

  const current = typeof player.toObject === 'function' ? player.toObject() : { ...player };
  await enforceSquadRules({ model, teamId, playerId, values: { ...current, ...updates } });
  Object.assign(player, updates, { updatedBy: userId });
  await player.save();
  return withoutInternalFields(player);
};

export const softDeletePlayerForTeam = async ({ model = Player, teamId, playerId, userId }) => {
  const player = await findPlayerForTeam({ model, teamId, playerId });
  player.isActive = false;
  player.isCaptain = false;
  player.isViceCaptain = false;
  player.updatedBy = userId;
  await player.save();
  return withoutInternalFields(player);
};

export const serializePlayers = (players) => players.map(withoutInternalFields);

