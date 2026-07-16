import crypto from 'node:crypto';
import { cloudinaryClient } from '../config/cloudinary.js';
import {
  TOURNAMENT_APPROVAL_STATUS,
  TOURNAMENT_LIFECYCLE_STATUS,
  TOURNAMENT_NOTIFICATION_TYPE,
  TOURNAMENT_PARTICIPANT_TYPE,
  TOURNAMENT_PARTICIPATION_STATUS,
  TOURNAMENT_PLAYER_SOURCE_TYPE,
  TOURNAMENT_SQUAD_STATUS,
  isTournamentPubliclyVisible,
} from '../constants/tournamentConstants.js';
import Player from '../models/Player.js';
import Tournament from '../models/Tournament.js';
import TournamentParticipant from '../models/TournamentParticipant.js';
import TournamentSquad from '../models/TournamentSquad.js';
import TournamentSquadPlayer from '../models/TournamentSquadPlayer.js';
import { USER_ROLES } from '../models/User.js';
import {
  serializeTournamentParticipantPublic,
  serializeTournamentSquadHost,
  serializeTournamentSquadPublic,
  serializeTournamentSquadPlayerPublic,
} from '../serializers/tournamentSerializers.js';
import AppError from '../utils/AppError.js';
import { publicImage, removeImageAsset, replaceImageAsset } from './imageAssetService.js';
import { createNotificationForTeam } from './notificationService.js';
import { createSquadHistory, listSquadHistory } from './tournamentSquadHistoryService.js';

const idString = (value) => String(value?._id || value || '');
const clean = (value = '') => String(value).trim().replace(/[<>]/g, '');
const normalizeName = (value = '') => clean(value).toLowerCase().replace(/\s+/g, ' ');
const editableStatuses = new Set([TOURNAMENT_SQUAD_STATUS.DRAFT, TOURNAMENT_SQUAD_STATUS.REJECTED]);
const validPosition = (position) => position === 'GK' || typeof position === 'string';

const playerPhotoSnapshot = (player = {}) => {
  if (player.photo && typeof player.photo === 'object') return publicImage(player.photo);
  if (typeof player.photo === 'string' && player.photo) return { imageUrl: player.photo };
  if (player.photoUrl) return { imageUrl: player.photoUrl };
  return {};
};

const isGoalkeeper = ({ position, isGoalkeeper }) => Boolean(isGoalkeeper) || position === 'GK';

const requireHostTeam = (user) => {
  if (!user?.team) throw new AppError('A team-admin account must be assigned to a team.', 403, 'TOURNAMENT_ACCESS_DENIED');
  return idString(user.team);
};

const findTournament = async ({ tournamentId, user, hostOnly = true }) => {
  const filter = { _id: tournamentId };
  if (hostOnly) filter.hostTeam = requireHostTeam(user);
  const tournament = await Tournament.findOne(filter);
  if (!tournament) throw new AppError('Tournament not found.', 404, 'TOURNAMENT_NOT_FOUND');
  return tournament;
};

const findParticipant = async ({ tournament, participantId }) => {
  const participant = await TournamentParticipant.findOne({ _id: participantId, tournament: tournament._id });
  if (!participant) throw new AppError('Tournament participant not found.', 404, 'TOURNAMENT_PARTICIPANT_NOT_FOUND');
  return participant;
};

const assertTournamentAllowsSquads = (tournament) => {
  if (tournament.isArchived || tournament.lifecycleStatus === TOURNAMENT_LIFECYCLE_STATUS.ARCHIVED) {
    throw new AppError('Archived tournaments are read-only.', 409, 'TOURNAMENT_ARCHIVED');
  }
  if ([TOURNAMENT_APPROVAL_STATUS.SUSPENDED, TOURNAMENT_APPROVAL_STATUS.REJECTED].includes(tournament.approvalStatus)) {
    throw new AppError('Tournament squads cannot be changed in the current tournament state.', 409, 'TOURNAMENT_SQUAD_NOT_EDITABLE');
  }
  if (tournament.lifecycleStatus === TOURNAMENT_LIFECYCLE_STATUS.COMPLETED) {
    throw new AppError('Completed tournaments are read-only.', 409, 'TOURNAMENT_SQUAD_NOT_EDITABLE');
  }
};

const assertSquadEditable = (tournament, squad) => {
  assertTournamentAllowsSquads(tournament);
  if (!editableStatuses.has(squad.status)) {
    throw new AppError('Tournament squad is not editable in its current state.', 409, squad.status === TOURNAMENT_SQUAD_STATUS.LOCKED ? 'TOURNAMENT_SQUAD_LOCKED' : 'TOURNAMENT_SQUAD_NOT_EDITABLE');
  }
};

const getPlayers = (squadId) => TournamentSquadPlayer.find({ squad: squadId, isActive: true }).sort({ jersey: 1, name: 1 }).lean();

const serializeBundle = async ({ squad, participant }) => {
  const players = await getPlayers(squad._id);
  return serializeTournamentSquadHost(squad.toObject ? squad.toObject() : squad, players, participant);
};

const notifySquad = async ({ tournament, participant, squad, type, title, message, action }) => {
  const actionUrl = `/team/tournaments/${tournament._id}/participants/${participant._id}/squad`;
  await createNotificationForTeam({
    teamId: tournament.hostTeam,
    type,
    title,
    message,
    entityType: 'tournamentSquad',
    entityId: squad._id,
    actionUrl,
    dedupeKey: `tournament:${tournament._id}:squad:${squad._id}:${action}:${Date.now()}`,
  });
  if (participant.registeredTeam) {
    await createNotificationForTeam({
      teamId: participant.registeredTeam,
      type,
      title,
      message,
      entityType: 'tournamentSquad',
      entityId: squad._id,
      actionUrl: `/team/tournaments/${tournament._id}/my-squad`,
      dedupeKey: `tournament:${tournament._id}:participant:${participant.registeredTeam}:squad:${squad._id}:${action}:${Date.now()}`,
    });
  }
};

export const getOrCreateSquad = async ({ user, tournamentId, participantId }) => {
  const tournament = await findTournament({ tournamentId, user });
  assertTournamentAllowsSquads(tournament);
  const participant = await findParticipant({ tournament, participantId });
  let squad = await TournamentSquad.findOne({ tournament: tournament._id, participant: participant._id });
  if (!squad) {
    try {
      squad = await TournamentSquad.create({
        tournament: tournament._id,
        participant: participant._id,
        registeredTeam: participant.registeredTeam || null,
        status: TOURNAMENT_SQUAD_STATUS.DRAFT,
      });
    } catch (error) {
      if (error?.code === 11000) throw new AppError('Tournament squad already exists.', 409, 'TOURNAMENT_SQUAD_EXISTS');
      throw error;
    }
    await createSquadHistory({ tournament, participant, squad, action: 'squad_created', actor: user._id, actorRole: USER_ROLES.TEAM_ADMIN, message: `${participant.displayName} squad created.` });
  }
  return { squad: await serializeBundle({ squad, participant }) };
};

export const listHostedSquads = async ({ user, tournamentId }) => {
  const tournament = await findTournament({ tournamentId, user });
  const participants = await TournamentParticipant.find({ tournament: tournament._id }).sort({ seed: 1, displayName: 1 }).lean();
  const squads = await TournamentSquad.find({ tournament: tournament._id }).lean();
  const counts = await TournamentSquadPlayer.aggregate([
    { $match: { tournament: tournament._id, isActive: true } },
    { $group: { _id: '$squad', count: { $sum: 1 } } },
  ]);
  const countMap = new Map(counts.map((item) => [idString(item._id), item.count]));
  const squadMap = new Map(squads.map((squad) => [idString(squad.participant), squad]));
  return {
    squads: participants.map((participant) => {
      const squad = squadMap.get(idString(participant._id));
      return {
        participant: serializeTournamentParticipantPublic(participant),
        squad: squad ? { ...serializeTournamentSquadHost(squad, [], participant), playerCount: countMap.get(idString(squad._id)) || 0 } : null,
        minimumSquad: tournament.minimumSquad,
        maximumSquad: tournament.maximumSquad,
      };
    }),
  };
};

const findOwnedSquadContext = async ({ user, tournamentId, participantId, create = true }) => {
  const tournament = await findTournament({ tournamentId, user });
  const participant = await findParticipant({ tournament, participantId });
  let squad = await TournamentSquad.findOne({ tournament: tournament._id, participant: participant._id });
  if (!squad && create) {
    const created = await getOrCreateSquad({ user, tournamentId, participantId });
    squad = await TournamentSquad.findById(created.squad.id);
  }
  if (!squad) throw new AppError('Tournament squad not found.', 404, 'TOURNAMENT_SQUAD_NOT_FOUND');
  return { tournament, participant, squad };
};

export const getHostedSquad = async ({ user, tournamentId, participantId }) => {
  const { participant, squad } = await findOwnedSquadContext({ user, tournamentId, participantId });
  return { squad: await serializeBundle({ squad, participant }) };
};

export const listEligiblePlayers = async ({ user, tournamentId, participantId, query = {} }) => {
  const { tournament, participant, squad } = await findOwnedSquadContext({ user, tournamentId, participantId });
  const teamId = participant.participantType === TOURNAMENT_PARTICIPANT_TYPE.REGISTERED_TEAM ? participant.registeredTeam : tournament.hostTeam;
  if (participant.participantType === TOURNAMENT_PARTICIPANT_TYPE.EXTERNAL_TEAM) {
    return { players: [], allocatedPlayerIds: [] };
  }
  const filter = { team: teamId, isActive: true, availabilityStatus: 'available' };
  if (query.search) filter.name = { $regex: String(query.search).replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), $options: 'i' };
  const [players, current, allocated] = await Promise.all([
    Player.find(filter).sort({ jerseyNumber: 1, name: 1 }).limit(100).lean(),
    TournamentSquadPlayer.find({ squad: squad._id, registeredPlayer: { $ne: null }, isActive: true }).select('registeredPlayer').lean(),
    participant.participantType === TOURNAMENT_PARTICIPANT_TYPE.INTRA_TEAM
      ? TournamentSquadPlayer.find({ tournament: tournament._id, squad: { $ne: squad._id }, sourceType: TOURNAMENT_PLAYER_SOURCE_TYPE.REGISTERED_PLAYER, isActive: true }).select('registeredPlayer').lean()
      : [],
  ]);
  const currentIds = new Set(current.map((row) => idString(row.registeredPlayer)));
  const allocatedIds = new Set(allocated.map((row) => idString(row.registeredPlayer)));
  return {
    players: players.map((player) => ({
      id: idString(player._id),
      name: player.name,
      position: player.position,
      jerseyNumber: player.jerseyNumber,
      photo: publicImage(player.photo || player.photoUrl),
      alreadySelected: currentIds.has(idString(player._id)),
      allocatedToAnotherIntraTeam: allocatedIds.has(idString(player._id)),
    })),
    allocatedPlayerIds: [...allocatedIds],
  };
};

const assertCanAddRegistered = async ({ tournament, participant, squad, playerId }) => {
  assertSquadEditable(tournament, squad);
  if (participant.participantType === TOURNAMENT_PARTICIPANT_TYPE.EXTERNAL_TEAM) {
    throw new AppError('External tournament teams use manual players.', 400, 'TOURNAMENT_PLAYER_INELIGIBLE');
  }
  const requiredTeam = participant.participantType === TOURNAMENT_PARTICIPANT_TYPE.REGISTERED_TEAM ? participant.registeredTeam : tournament.hostTeam;
  const player = await Player.findOne({ _id: playerId, team: requiredTeam, isActive: true, availabilityStatus: 'available' });
  if (!player) throw new AppError('Player is not eligible for this tournament squad.', 404, 'TOURNAMENT_PLAYER_INELIGIBLE');
  const duplicate = await TournamentSquadPlayer.exists({ squad: squad._id, registeredPlayer: player._id, isActive: true });
  if (duplicate) throw new AppError('Player is already selected for this squad.', 409, 'TOURNAMENT_PLAYER_ALREADY_SELECTED');
  if (participant.participantType === TOURNAMENT_PARTICIPANT_TYPE.INTRA_TEAM) {
    const allocated = await TournamentSquadPlayer.exists({ tournament: tournament._id, squad: { $ne: squad._id }, registeredPlayer: player._id, isActive: true });
    if (allocated) throw new AppError('Player is already allocated to another intra-college team in this tournament.', 409, 'TOURNAMENT_PLAYER_ALLOCATED_TO_OTHER_TEAM');
  }
  const count = await TournamentSquadPlayer.countDocuments({ squad: squad._id, isActive: true });
  if (count >= tournament.maximumSquad) throw new AppError('Tournament squad is full.', 409, 'TOURNAMENT_SQUAD_SIZE_INVALID');
  return player;
};

export const addRegisteredSquadPlayer = async ({ user, tournamentId, participantId, input }) => {
  const { tournament, participant, squad } = await findOwnedSquadContext({ user, tournamentId, participantId });
  const player = await assertCanAddRegistered({ tournament, participant, squad, playerId: input.playerId });
  let squadPlayer;
  try {
    squadPlayer = await TournamentSquadPlayer.create({
      tournament: tournament._id,
      participant: participant._id,
      squad: squad._id,
      sourceType: TOURNAMENT_PLAYER_SOURCE_TYPE.REGISTERED_PLAYER,
      registeredPlayer: player._id,
      name: player.name,
      normalizedName: normalizeName(player.name),
      position: player.position,
      jersey: input.jersey ?? player.jerseyNumber ?? null,
      photo: playerPhotoSnapshot(player),
      goalkeeper: isGoalkeeper({ position: player.position, isGoalkeeper: input.isGoalkeeper }),
    });
  } catch (error) {
    if (error?.code === 11000) throw new AppError('Player is already selected for this squad or jersey is duplicated.', 409, 'TOURNAMENT_PLAYER_ALREADY_SELECTED');
    throw error;
  }
  await createSquadHistory({ tournament, participant, squad, action: 'player_added', actor: user._id, actorRole: USER_ROLES.TEAM_ADMIN, message: `${squadPlayer.name} added to ${participant.displayName}.`, metadata: { squadPlayer: squadPlayer._id } });
  return { player: serializeTournamentSquadPlayerPublic(squadPlayer.toObject()), squad: await serializeBundle({ squad, participant }) };
};

const assertManualInput = (input) => {
  const forbidden = ['registeredPlayer', 'team', 'playerId', 'statistics', 'publicId', 'email', 'phone', 'password'];
  const present = forbidden.filter((field) => input[field] !== undefined);
  if (present.length) throw new AppError(`Protected squad-player fields are not accepted: ${present.join(', ')}.`, 400, 'VALIDATION_ERROR');
  if (!clean(input.name) || clean(input.name).length < 2) throw new AppError('Manual player name is required.', 400, 'VALIDATION_ERROR');
  if (!validPosition(input.position)) throw new AppError('Manual player position is invalid.', 400, 'VALIDATION_ERROR');
};

export const addManualSquadPlayer = async ({ user, tournamentId, participantId, input }) => {
  const { tournament, participant, squad } = await findOwnedSquadContext({ user, tournamentId, participantId });
  assertSquadEditable(tournament, squad);
  if (participant.participantType === TOURNAMENT_PARTICIPANT_TYPE.REGISTERED_TEAM) {
    throw new AppError('Registered participants must select permanent registered players.', 400, 'TOURNAMENT_PLAYER_INELIGIBLE');
  }
  assertManualInput(input);
  const count = await TournamentSquadPlayer.countDocuments({ squad: squad._id, isActive: true });
  if (count >= tournament.maximumSquad) throw new AppError('Tournament squad is full.', 409, 'TOURNAMENT_SQUAD_SIZE_INVALID');
  try {
    const squadPlayer = await TournamentSquadPlayer.create({
      tournament: tournament._id,
      participant: participant._id,
      squad: squad._id,
      sourceType: TOURNAMENT_PLAYER_SOURCE_TYPE.MANUAL_PLAYER,
      registeredPlayer: null,
      name: clean(input.name),
      normalizedName: normalizeName(input.name),
      position: input.position,
      jersey: input.jersey ?? null,
      photo: input.photoUrl ? { imageUrl: input.photoUrl } : {},
      goalkeeper: isGoalkeeper({ position: input.position, isGoalkeeper: input.isGoalkeeper }),
    });
    await createSquadHistory({ tournament, participant, squad, action: 'player_added', actor: user._id, actorRole: USER_ROLES.TEAM_ADMIN, message: `${squadPlayer.name} added to ${participant.displayName}.`, metadata: { squadPlayer: squadPlayer._id } });
    return { player: serializeTournamentSquadPlayerPublic(squadPlayer.toObject()), squad: await serializeBundle({ squad, participant }) };
  } catch (error) {
    if (error?.code === 11000) throw new AppError('Manual player already exists in this squad or jersey is duplicated.', 409, 'TOURNAMENT_PLAYER_ALREADY_SELECTED');
    throw error;
  }
};

const findSquadPlayerContext = async ({ user, tournamentId, participantId, squadPlayerId }) => {
  const context = await findOwnedSquadContext({ user, tournamentId, participantId });
  const squadPlayer = await TournamentSquadPlayer.findOne({ _id: squadPlayerId, squad: context.squad._id, isActive: true });
  if (!squadPlayer) throw new AppError('Tournament squad player not found.', 404, 'TOURNAMENT_PLAYER_INELIGIBLE');
  return { ...context, squadPlayer };
};

export const updateSquadPlayer = async ({ user, tournamentId, participantId, squadPlayerId, input }) => {
  const { tournament, participant, squad, squadPlayer } = await findSquadPlayerContext({ user, tournamentId, participantId, squadPlayerId });
  assertSquadEditable(tournament, squad);
  if (squadPlayer.sourceType === TOURNAMENT_PLAYER_SOURCE_TYPE.REGISTERED_PLAYER) {
    ['jersey', 'goalkeeper'].forEach((field) => { if (input[field] !== undefined) squadPlayer[field] = input[field]; });
  } else {
    assertManualInput({ name: input.name ?? squadPlayer.name, position: input.position ?? squadPlayer.position });
    ['name', 'position', 'jersey', 'goalkeeper'].forEach((field) => { if (input[field] !== undefined) squadPlayer[field] = field === 'name' ? clean(input[field]) : input[field]; });
    squadPlayer.normalizedName = normalizeName(squadPlayer.name);
  }
  try {
    await squadPlayer.save();
  } catch (error) {
    if (error?.code === 11000) throw new AppError('Squad player conflicts with another player.', 409, 'TOURNAMENT_SQUAD_JERSEY_CONFLICT');
    throw error;
  }
  await createSquadHistory({ tournament, participant, squad, action: 'player_updated', actor: user._id, actorRole: USER_ROLES.TEAM_ADMIN, message: `${squadPlayer.name} updated.` });
  return { player: serializeTournamentSquadPlayerPublic(squadPlayer.toObject()), squad: await serializeBundle({ squad, participant }) };
};

export const removeSquadPlayer = async ({ user, tournamentId, participantId, squadPlayerId }) => {
  const { tournament, participant, squad, squadPlayer } = await findSquadPlayerContext({ user, tournamentId, participantId, squadPlayerId });
  assertSquadEditable(tournament, squad);
  if (idString(squad.captain) === idString(squadPlayer._id)) squad.captain = null;
  if (idString(squad.viceCaptain) === idString(squadPlayer._id)) squad.viceCaptain = null;
  await squad.save();
  const photo = squadPlayer.photo;
  await squadPlayer.deleteOne();
  if (photo?.publicId) await cloudinaryClient.destroy(photo.publicId).catch(() => {});
  await createSquadHistory({ tournament, participant, squad, action: 'player_removed', actor: user._id, actorRole: USER_ROLES.TEAM_ADMIN, message: `${squadPlayer.name} removed from ${participant.displayName}.` });
  return { removed: true, squad: await serializeBundle({ squad, participant }) };
};

const setLeadership = async ({ user, tournamentId, participantId, squadPlayerId, role }) => {
  const { tournament, participant, squad, squadPlayer } = await findSquadPlayerContext({ user, tournamentId, participantId, squadPlayerId });
  assertSquadEditable(tournament, squad);
  const isCaptainRole = role === 'captain';
  if (isCaptainRole && idString(squad.viceCaptain) === idString(squadPlayer._id)) {
    throw new AppError('Captain and vice captain cannot be the same player.', 409, 'TOURNAMENT_SQUAD_INVALID_STATUS');
  }
  if (!isCaptainRole && idString(squad.captain) === idString(squadPlayer._id)) {
    throw new AppError('Captain and vice captain cannot be the same player.', 409, 'TOURNAMENT_SQUAD_INVALID_STATUS');
  }
  await TournamentSquadPlayer.updateMany({ squad: squad._id }, { $set: { [isCaptainRole ? 'captain' : 'viceCaptain']: false } });
  squadPlayer[isCaptainRole ? 'captain' : 'viceCaptain'] = true;
  await squadPlayer.save();
  squad[isCaptainRole ? 'captain' : 'viceCaptain'] = squadPlayer._id;
  await squad.save();
  await createSquadHistory({ tournament, participant, squad, action: isCaptainRole ? 'captain_changed' : 'vice_captain_changed', actor: user._id, actorRole: USER_ROLES.TEAM_ADMIN, message: `${squadPlayer.name} set as ${isCaptainRole ? 'captain' : 'vice captain'}.` });
  return { squad: await serializeBundle({ squad, participant }) };
};

export const setCaptain = (args) => setLeadership({ ...args, role: 'captain' });
export const setViceCaptain = (args) => setLeadership({ ...args, role: 'viceCaptain' });

const validateSquadReady = async ({ tournament, squad }) => {
  const players = await TournamentSquadPlayer.find({ squad: squad._id, isActive: true }).lean();
  if (players.length < tournament.minimumSquad || players.length > tournament.maximumSquad) throw new AppError('Tournament squad size is invalid.', 409, 'TOURNAMENT_SQUAD_SIZE_INVALID');
  if (!squad.captain || !players.some((player) => idString(player._id) === idString(squad.captain))) throw new AppError('Captain is required before squad submission.', 409, 'TOURNAMENT_SQUAD_CAPTAIN_REQUIRED');
  if (squad.viceCaptain && idString(squad.viceCaptain) === idString(squad.captain)) throw new AppError('Captain and vice captain cannot match.', 409, 'TOURNAMENT_SQUAD_INVALID_STATUS');
  if (!players.some((player) => player.goalkeeper || player.position === 'GK')) throw new AppError('At least one goalkeeper is required.', 409, 'TOURNAMENT_SQUAD_GOALKEEPER_REQUIRED');
  const jerseys = players.map((player) => player.jersey).filter((jersey) => jersey !== null && jersey !== undefined);
  if (jerseys.length !== players.length || new Set(jerseys).size !== jerseys.length) throw new AppError('Every squad player needs a unique tournament jersey number.', 409, 'TOURNAMENT_SQUAD_JERSEY_CONFLICT');
};

const transitionSquad = async ({ user, tournamentId, participantId, nextStatus }) => {
  const { tournament, participant, squad } = await findOwnedSquadContext({ user, tournamentId, participantId });
  assertTournamentAllowsSquads(tournament);
  const now = new Date();
  if (nextStatus === TOURNAMENT_SQUAD_STATUS.SUBMITTED) {
    if (![TOURNAMENT_SQUAD_STATUS.DRAFT, TOURNAMENT_SQUAD_STATUS.REJECTED].includes(squad.status)) throw new AppError('Squad cannot be submitted in its current state.', 409, 'TOURNAMENT_SQUAD_INVALID_STATUS');
    await validateSquadReady({ tournament, squad });
    squad.status = TOURNAMENT_SQUAD_STATUS.SUBMITTED;
    squad.submittedAt = now;
  } else if (nextStatus === TOURNAMENT_SQUAD_STATUS.APPROVED) {
    if (squad.status !== TOURNAMENT_SQUAD_STATUS.SUBMITTED) throw new AppError('Only submitted squads can be approved.', 409, 'TOURNAMENT_SQUAD_INVALID_STATUS');
    await validateSquadReady({ tournament, squad });
    squad.status = TOURNAMENT_SQUAD_STATUS.APPROVED;
    squad.approvedAt = now;
    squad.reviewedBy = user._id;
  } else if (nextStatus === TOURNAMENT_SQUAD_STATUS.LOCKED) {
    if (tournament.approvalStatus !== TOURNAMENT_APPROVAL_STATUS.APPROVED) throw new AppError('Tournament approval is required before locking squads.', 409, 'TOURNAMENT_SQUAD_INVALID_STATUS');
    if (squad.status !== TOURNAMENT_SQUAD_STATUS.APPROVED) throw new AppError('Only approved squads can be locked.', 409, 'TOURNAMENT_SQUAD_INVALID_STATUS');
    if (tournament.squadLock && now > tournament.squadLock) throw new AppError('Squad lock deadline has passed.', 409, 'TOURNAMENT_SQUAD_LOCKED');
    await validateSquadReady({ tournament, squad });
    squad.status = TOURNAMENT_SQUAD_STATUS.LOCKED;
    squad.lockedAt = now;
  }
  await squad.save();
  const action = nextStatus === TOURNAMENT_SQUAD_STATUS.SUBMITTED ? 'squad_submitted' : nextStatus === TOURNAMENT_SQUAD_STATUS.APPROVED ? 'squad_approved' : 'squad_locked';
  await createSquadHistory({ tournament, participant, squad, action, actor: user._id, actorRole: USER_ROLES.TEAM_ADMIN, message: `${participant.displayName} squad ${nextStatus}.` });
  const type = nextStatus === TOURNAMENT_SQUAD_STATUS.SUBMITTED ? TOURNAMENT_NOTIFICATION_TYPE.SQUAD_SUBMITTED : nextStatus === TOURNAMENT_SQUAD_STATUS.APPROVED ? TOURNAMENT_NOTIFICATION_TYPE.SQUAD_APPROVED : TOURNAMENT_NOTIFICATION_TYPE.SQUAD_LOCKED;
  await notifySquad({ tournament, participant, squad, type, title: `Tournament squad ${nextStatus}`, message: `${participant.displayName} squad for ${tournament.name} is ${nextStatus}.`, action });
  return { squad: await serializeBundle({ squad, participant }) };
};

export const submitSquad = (args) => transitionSquad({ ...args, nextStatus: TOURNAMENT_SQUAD_STATUS.SUBMITTED });
export const approveSquad = (args) => transitionSquad({ ...args, nextStatus: TOURNAMENT_SQUAD_STATUS.APPROVED });
export const lockSquad = (args) => transitionSquad({ ...args, nextStatus: TOURNAMENT_SQUAD_STATUS.LOCKED });

export const unlockSquad = async ({ user, tournamentId, participantId }) => {
  const { tournament, participant, squad } = await findOwnedSquadContext({ user, tournamentId, participantId });
  assertTournamentAllowsSquads(tournament);
  if (squad.status !== TOURNAMENT_SQUAD_STATUS.LOCKED) throw new AppError('Only locked squads can be unlocked.', 409, 'TOURNAMENT_SQUAD_INVALID_STATUS');
  squad.status = TOURNAMENT_SQUAD_STATUS.APPROVED;
  squad.unlockedAt = new Date();
  squad.lockedAt = null;
  await squad.save();
  await createSquadHistory({ tournament, participant, squad, action: 'squad_unlocked', actor: user._id, actorRole: USER_ROLES.TEAM_ADMIN, message: `${participant.displayName} squad unlocked.` });
  await notifySquad({ tournament, participant, squad, type: TOURNAMENT_NOTIFICATION_TYPE.SQUAD_UNLOCKED, title: 'Tournament squad unlocked', message: `${participant.displayName} squad for ${tournament.name} was unlocked.`, action: 'squad_unlocked' });
  return { squad: await serializeBundle({ squad, participant }) };
};

export const getHostedSquadHistory = async ({ user, tournamentId, participantId, query }) => {
  const { squad } = await findOwnedSquadContext({ user, tournamentId, participantId, create: false });
  return listSquadHistory({ tournamentId, participantId, squadId: squad._id, query });
};

export const uploadSquadPlayerPhoto = async ({ user, tournamentId, participantId, squadPlayerId, file, storage = cloudinaryClient }) => {
  const { tournament, participant, squad, squadPlayer } = await findSquadPlayerContext({ user, tournamentId, participantId, squadPlayerId });
  assertSquadEditable(tournament, squad);
  if (squadPlayer.sourceType !== TOURNAMENT_PLAYER_SOURCE_TYPE.MANUAL_PLAYER) throw new AppError('Only manual tournament-player photos are tournament-scoped.', 400, 'TOURNAMENT_PLAYER_INELIGIBLE');
  if (!file) throw new AppError('Select a squad player photo.', 400, 'TOURNAMENT_PLAYER_PHOTO_REQUIRED');
  if (file.size > 3 * 1024 * 1024) throw new AppError('Squad player photo must be 3 MB or smaller.', 400, 'TOURNAMENT_PLAYER_PHOTO_TOO_LARGE');
  await replaceImageAsset({
    document: squadPlayer,
    field: 'photo',
    file,
    storage,
    folder: `footstream/tournaments/${tournamentId}/squads/${squad._id}/players/${squadPlayer._id}`,
    publicId: `${Date.now()}-${crypto.randomUUID()}`,
  });
  await createSquadHistory({ tournament, participant, squad, action: 'player_updated', actor: user._id, actorRole: USER_ROLES.TEAM_ADMIN, message: `${squadPlayer.name} photo updated.` });
  return { player: serializeTournamentSquadPlayerPublic(squadPlayer.toObject()), squad: await serializeBundle({ squad, participant }) };
};

export const removeSquadPlayerPhoto = async ({ user, tournamentId, participantId, squadPlayerId, storage = cloudinaryClient }) => {
  const { tournament, participant, squad, squadPlayer } = await findSquadPlayerContext({ user, tournamentId, participantId, squadPlayerId });
  assertSquadEditable(tournament, squad);
  await removeImageAsset({ document: squadPlayer, field: 'photo', storage, emptyValue: {}, deleteFailureCode: 'TOURNAMENT_PLAYER_IMAGE_DELETE_FAILED', deleteFailureMessage: 'Squad player image deletion failed.' });
  await createSquadHistory({ tournament, participant, squad, action: 'player_updated', actor: user._id, actorRole: USER_ROLES.TEAM_ADMIN, message: `${squadPlayer.name} photo removed.` });
  return { player: serializeTournamentSquadPlayerPublic(squadPlayer.toObject()), squad: await serializeBundle({ squad, participant }) };
};

export const getParticipantTeamMySquad = async ({ user, tournamentId }) => {
  const teamId = requireHostTeam(user);
  const tournament = await Tournament.findById(tournamentId).lean();
  if (!tournament) throw new AppError('Tournament not found.', 404, 'TOURNAMENT_NOT_FOUND');
  const participant = await TournamentParticipant.findOne({ tournament: tournamentId, registeredTeam: teamId }).lean();
  if (!participant) throw new AppError('Tournament squad not found.', 404, 'TOURNAMENT_SQUAD_NOT_FOUND');
  const squad = await TournamentSquad.findOne({ tournament: tournamentId, participant: participant._id }).lean();
  if (!squad) throw new AppError('Tournament squad not found.', 404, 'TOURNAMENT_SQUAD_NOT_FOUND');
  const players = await getPlayers(squad._id);
  return { squad: serializeTournamentSquadHost(squad, players, participant) };
};

export const listAdminTournamentSquads = async ({ tournamentId }) => {
  const tournament = await Tournament.findById(tournamentId).lean();
  if (!tournament) throw new AppError('Tournament not found.', 404, 'TOURNAMENT_NOT_FOUND');
  const participants = await TournamentParticipant.find({ tournament: tournamentId }).sort({ seed: 1, displayName: 1 }).lean();
  const squads = await TournamentSquad.find({ tournament: tournamentId }).lean();
  const players = await TournamentSquadPlayer.find({ tournament: tournamentId, isActive: true }).lean();
  return {
    squads: participants.map((participant) => {
      const squad = squads.find((item) => idString(item.participant) === idString(participant._id));
      const squadPlayers = squad ? players.filter((player) => idString(player.squad) === idString(squad._id)) : [];
      return { participant: serializeTournamentParticipantPublic(participant), squad: squad ? serializeTournamentSquadHost(squad, squadPlayers, participant) : null };
    }),
  };
};

export const getAdminTournamentSquad = async ({ tournamentId, participantId }) => {
  const participant = await TournamentParticipant.findOne({ _id: participantId, tournament: tournamentId }).lean();
  if (!participant) throw new AppError('Tournament participant not found.', 404, 'TOURNAMENT_PARTICIPANT_NOT_FOUND');
  const squad = await TournamentSquad.findOne({ tournament: tournamentId, participant: participantId }).lean();
  if (!squad) throw new AppError('Tournament squad not found.', 404, 'TOURNAMENT_SQUAD_NOT_FOUND');
  const players = await getPlayers(squad._id);
  return { squad: serializeTournamentSquadHost(squad, players, participant) };
};

export const getAdminTournamentSquadHistory = async ({ tournamentId, participantId, query }) => {
  const squad = await TournamentSquad.findOne({ tournament: tournamentId, participant: participantId }).lean();
  if (!squad) throw new AppError('Tournament squad not found.', 404, 'TOURNAMENT_SQUAD_NOT_FOUND');
  return listSquadHistory({ tournamentId, participantId, squadId: squad._id, query });
};

export const getPublicTournamentParticipantSquad = async ({ slug, participantSlug }) => {
  const tournament = await Tournament.findOne({ slug }).lean();
  if (!tournament || !isTournamentPubliclyVisible(tournament)) throw new AppError('Tournament not found.', 404, 'TOURNAMENT_NOT_FOUND');
  const participant = await TournamentParticipant.findOne({ tournament: tournament._id, slug: participantSlug, status: TOURNAMENT_PARTICIPATION_STATUS.CONFIRMED }).lean();
  if (!participant) throw new AppError('Tournament participant not found.', 404, 'TOURNAMENT_PARTICIPANT_NOT_FOUND');
  const squad = await TournamentSquad.findOne({ tournament: tournament._id, participant: participant._id, status: { $in: [TOURNAMENT_SQUAD_STATUS.APPROVED, TOURNAMENT_SQUAD_STATUS.LOCKED] } }).lean();
  if (!squad) return { participant: serializeTournamentParticipantPublic(participant), squad: null };
  const players = await getPlayers(squad._id);
  return { participant: serializeTournamentParticipantPublic(participant), squad: serializeTournamentSquadPublic(squad, players, participant) };
};
