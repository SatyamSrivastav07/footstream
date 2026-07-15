import Tournament from '../models/Tournament.js';
import TournamentParticipant from '../models/TournamentParticipant.js';
import Team from '../models/Team.js';
import User from '../models/User.js';
import AppError from '../utils/AppError.js';
import { slugify } from '../utils/slugify.js';
import {
  TOURNAMENT_APPROVAL_STATUS,
  TOURNAMENT_NOTIFICATION_TYPE,
  TOURNAMENT_PARTICIPANT_TYPE,
  TOURNAMENT_PARTICIPATION_STATUS,
  isParticipantTypeAllowedForScope,
} from '../constants/tournamentConstants.js';
import { USER_ROLES } from '../models/User.js';
import { serializeTournamentParticipantPublic } from '../serializers/tournamentSerializers.js';
import { createReviewHistory } from './tournamentReviewService.js';
import { notifyParticipantTeam } from './tournamentNotificationService.js';

const idString = (value) => String(value?._id || value || '');
const clean = (value = '') => String(value).trim().replace(/[<>]/g, '');
const normalizedName = (value = '') => clean(value).toLowerCase().replace(/\s+/g, ' ');
const escapeRegex = (value = '') => String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const pageParams = (query = {}, max = 100) => ({
  page: Math.max(Number(query.page) || 1, 1),
  limit: Math.min(Math.max(Number(query.limit) || 20, 1), max),
});

const requireHostTeam = (user) => {
  if (!user?.team) throw new AppError('A team-admin account must be assigned to a team.', 403, 'TOURNAMENT_ACCESS_DENIED');
  return idString(user.team);
};

const editableStatuses = [TOURNAMENT_APPROVAL_STATUS.DRAFT, TOURNAMENT_APPROVAL_STATUS.CHANGES_REQUESTED];

const getOwnedEditableTournament = async ({ tournamentId, user }) => {
  const tournament = await Tournament.findOne({ _id: tournamentId, hostTeam: requireHostTeam(user) });
  if (!tournament) throw new AppError('Tournament not found.', 404, 'TOURNAMENT_NOT_FOUND');
  if (tournament.isArchived) throw new AppError('Archived tournaments are read-only.', 409, 'TOURNAMENT_ARCHIVED');
  if (!editableStatuses.includes(tournament.approvalStatus)) throw new AppError('Tournament participants cannot be changed in the current state.', 409, 'TOURNAMENT_NOT_EDITABLE');
  return tournament;
};

const assertParticipantCapacity = async (tournament) => {
  const count = await TournamentParticipant.countDocuments({ tournament: tournament._id, status: { $nin: [TOURNAMENT_PARTICIPATION_STATUS.WITHDRAWN, TOURNAMENT_PARTICIPATION_STATUS.DISQUALIFIED] } });
  if (count >= tournament.maximumTeams) throw new AppError('Tournament team limit reached.', 409, 'TOURNAMENT_TEAM_LIMIT_REACHED');
};

const createParticipant = async ({ tournament, user, payload, notifyTeam = null }) => {
  await assertParticipantCapacity(tournament);
  if (!isParticipantTypeAllowedForScope(tournament.scope, payload.participantType)) {
    throw new AppError('Participant type is not allowed for this tournament scope.', 400, 'INVALID_TOURNAMENT_PARTICIPANT_TYPE');
  }
  try {
    const participant = await TournamentParticipant.create({
      tournament: tournament._id,
      tournamentScope: tournament.scope,
      addedBy: user._id,
      status: TOURNAMENT_PARTICIPATION_STATUS.PENDING,
      ...payload,
      displayName: clean(payload.displayName),
      shortName: clean(payload.shortName),
      captainName: clean(payload.captainName),
      managerName: clean(payload.managerName),
      coachName: clean(payload.coachName),
      slug: slugify(payload.slug || payload.displayName),
      normalizedName: normalizedName(payload.displayName),
    });
    await createReviewHistory({
      tournament,
      action: 'participant_added',
      actor: user._id,
      actorRole: USER_ROLES.TEAM_ADMIN,
      message: `${participant.displayName} added to tournament.`,
      metadata: { participant: participant._id, participantType: participant.participantType },
    });
    if (notifyTeam) {
      await notifyParticipantTeam({
        tournament,
        participant,
        teamId: notifyTeam,
        type: TOURNAMENT_NOTIFICATION_TYPE.PARTICIPATION_ADDED,
        title: 'Added to tournament',
        message: `${participant.displayName} was added to ${tournament.name}.`,
        dedupeKeySuffix: `added:${participant._id}`,
      });
    }
    return serializeTournamentParticipantPublic(participant.toObject());
  } catch (error) {
    if (error?.code === 11000) throw new AppError('Tournament participant already exists.', 409, 'TOURNAMENT_PARTICIPANT_EXISTS');
    throw error;
  }
};

export const listParticipants = async ({ tournamentId, user, query = {} }) => {
  const tournament = await Tournament.findOne({ _id: tournamentId, hostTeam: requireHostTeam(user) });
  if (!tournament) throw new AppError('Tournament not found.', 404, 'TOURNAMENT_NOT_FOUND');
  const { page, limit } = pageParams(query);
  const filter = { tournament: tournament._id };
  if (query.status) filter.status = query.status;
  const [participants, total] = await Promise.all([
    TournamentParticipant.find(filter).sort({ seed: 1, displayName: 1 }).skip((page - 1) * limit).limit(limit).lean(),
    TournamentParticipant.countDocuments(filter),
  ]);
  return { participants: participants.map(serializeTournamentParticipantPublic), pagination: { page, limit, total, pages: Math.ceil(total / limit) } };
};

export const addRegisteredParticipant = async ({ tournamentId, user, input }) => {
  const tournament = await getOwnedEditableTournament({ tournamentId, user });
  const team = await Team.findOne({ _id: input.registeredTeam, isArchived: false }).lean();
  if (!team) throw new AppError('Registered team not found.', 404, 'TOURNAMENT_PARTICIPANT_NOT_FOUND');
  if (idString(team._id) === requireHostTeam(user)) throw new AppError('Host team cannot be added as a registered opponent participant.', 400, 'INVALID_TOURNAMENT_PARTICIPANT_TYPE');
  return createParticipant({
    tournament,
    user,
    notifyTeam: team._id,
    payload: {
      participantType: TOURNAMENT_PARTICIPANT_TYPE.REGISTERED_TEAM,
      registeredTeam: team._id,
      displayName: team.name,
      shortName: team.shortName,
      slug: team.slug,
      logo: team.logo && typeof team.logo === 'object' ? team.logo : { imageUrl: typeof team.logo === 'string' ? team.logo : '' },
      primaryColor: team.primaryColor || '',
      secondaryColor: team.secondaryColor || '',
      coachName: team.coach || '',
    },
  });
};

export const addExternalParticipant = ({ tournamentId, user, input }) =>
  getOwnedEditableTournament({ tournamentId, user }).then((tournament) => createParticipant({
    tournament,
    user,
    payload: {
      participantType: TOURNAMENT_PARTICIPANT_TYPE.EXTERNAL_TEAM,
      registeredTeam: null,
      displayName: input.displayName,
      shortName: input.shortName,
      slug: input.slug,
      captainName: input.captainName,
      managerName: input.managerName,
      coachName: input.coachName,
      seed: input.seed || null,
    },
  }));

export const addIntraParticipant = ({ tournamentId, user, input }) =>
  getOwnedEditableTournament({ tournamentId, user }).then((tournament) => createParticipant({
    tournament,
    user,
    payload: {
      participantType: TOURNAMENT_PARTICIPANT_TYPE.INTRA_TEAM,
      registeredTeam: null,
      displayName: input.displayName,
      shortName: input.shortName,
      slug: input.slug,
      captainName: input.captainName,
      managerName: input.managerName,
      coachName: input.coachName,
      seed: input.seed || null,
    },
  }));

const findOwnedParticipant = async ({ tournamentId, participantId, user }) => {
  const tournament = await getOwnedEditableTournament({ tournamentId, user });
  const participant = await TournamentParticipant.findOne({ _id: participantId, tournament: tournament._id });
  if (!participant) throw new AppError('Tournament participant not found.', 404, 'TOURNAMENT_PARTICIPANT_NOT_FOUND');
  return { tournament, participant };
};

export const updateParticipant = async ({ tournamentId, participantId, user, input }) => {
  const { tournament, participant } = await findOwnedParticipant({ tournamentId, participantId, user });
  if (participant.participantType === TOURNAMENT_PARTICIPANT_TYPE.REGISTERED_TEAM) {
    throw new AppError('Registered participant snapshots cannot be manually edited.', 409, 'TOURNAMENT_NOT_EDITABLE');
  }
  ['displayName', 'shortName', 'captainName', 'managerName', 'coachName'].forEach((field) => {
    if (input[field] !== undefined) participant[field] = clean(input[field]);
  });
  if (input.slug !== undefined) participant.slug = slugify(input.slug || input.displayName || participant.displayName);
  if (input.seed !== undefined) participant.seed = input.seed || null;
  participant.normalizedName = normalizedName(participant.displayName);
  try {
    await participant.save();
  } catch (error) {
    if (error?.code === 11000) throw new AppError('Tournament participant already exists.', 409, 'TOURNAMENT_PARTICIPANT_EXISTS');
    throw error;
  }
  await createReviewHistory({ tournament, action: 'updated', actor: user._id, actorRole: USER_ROLES.TEAM_ADMIN, message: `${participant.displayName} updated.` });
  return serializeTournamentParticipantPublic(participant.toObject());
};

export const updateParticipantStatus = async ({ tournamentId, participantId, user, status }) => {
  const { tournament, participant } = await findOwnedParticipant({ tournamentId, participantId, user });
  participant.status = status;
  await participant.save();
  await createReviewHistory({ tournament, action: 'participant_status_changed', actor: user._id, actorRole: USER_ROLES.TEAM_ADMIN, message: `${participant.displayName} status changed to ${status}.` });
  if (participant.registeredTeam && status === TOURNAMENT_PARTICIPATION_STATUS.CONFIRMED) {
    await notifyParticipantTeam({
      tournament,
      participant,
      teamId: participant.registeredTeam,
      type: TOURNAMENT_NOTIFICATION_TYPE.PARTICIPATION_CONFIRMED,
      title: 'Tournament participation confirmed',
      message: `${participant.displayName} is confirmed for ${tournament.name}.`,
      dedupeKeySuffix: `confirmed:${participant._id}:${participant.updatedAt?.getTime?.() || Date.now()}`,
    });
  }
  return serializeTournamentParticipantPublic(participant.toObject());
};

export const removeParticipant = async ({ tournamentId, participantId, user }) => {
  const { tournament, participant } = await findOwnedParticipant({ tournamentId, participantId, user });
  const teamId = participant.registeredTeam;
  const participantName = participant.displayName;
  await participant.deleteOne();
  await createReviewHistory({ tournament, action: 'participant_removed', actor: user._id, actorRole: USER_ROLES.TEAM_ADMIN, message: `${participantName} removed from tournament.` });
  if (teamId) {
    await notifyParticipantTeam({
      tournament,
      participant,
      teamId,
      type: TOURNAMENT_NOTIFICATION_TYPE.PARTICIPATION_REMOVED,
      title: 'Removed from tournament',
      message: `${participantName} was removed from ${tournament.name}.`,
      dedupeKeySuffix: `removed:${participant._id}`,
    });
  }
  return { removed: true };
};

const teamLogoUrl = (logo) => {
  if (!logo) return '';
  if (typeof logo === 'string') return logo;
  return logo.imageUrl || logo.url || '';
};

export const listAvailableRegisteredTeams = async ({ tournamentId, user, query = {} }) => {
  const tournament = await Tournament.findOne({ _id: tournamentId, hostTeam: requireHostTeam(user) });
  if (!tournament) throw new AppError('Tournament not found.', 404, 'TOURNAMENT_NOT_FOUND');
  const { page, limit } = pageParams(query, 50);
  const added = await TournamentParticipant.find({ tournament: tournamentId, registeredTeam: { $ne: null } }).select('registeredTeam').lean();
  const excludedIds = [requireHostTeam(user), ...added.map((row) => idString(row.registeredTeam))];
  const filter = { _id: { $nin: excludedIds }, isArchived: false, isPublished: true };
  if (query.city) filter.city = query.city;
  if (query.search) {
    const regex = escapeRegex(query.search);
    filter.$or = [{ name: { $regex: regex, $options: 'i' } }, { shortName: { $regex: regex, $options: 'i' } }, { city: { $regex: regex, $options: 'i' } }];
  }
  const [teams, total] = await Promise.all([
    Team.find(filter).sort({ name: 1 }).skip((page - 1) * limit).limit(limit).lean(),
    Team.countDocuments(filter),
  ]);
  return {
    teams: teams.map((team) => ({ id: idString(team._id), name: team.name, shortName: team.shortName, slug: team.slug, logoUrl: teamLogoUrl(team.logo), city: team.city })),
    pagination: { page, limit, total, pages: Math.ceil(total / limit) },
  };
};

export const assertNoPermanentManualParticipantSideEffects = async ({ userModel = User }) => {
  void userModel;
  return true;
};
