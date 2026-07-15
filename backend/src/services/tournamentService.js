import Tournament from '../models/Tournament.js';
import TournamentParticipant from '../models/TournamentParticipant.js';
import AppError from '../utils/AppError.js';
import { slugify } from '../utils/slugify.js';
import {
  TOURNAMENT_APPROVAL_STATUS,
  TOURNAMENT_LIFECYCLE_STATUS,
  TOURNAMENT_VISIBILITY,
  canHostEditTournament,
  isTournamentPubliclyVisible,
  validateApprovalTransition,
} from '../constants/tournamentConstants.js';
import { USER_ROLES } from '../models/User.js';
import {
  serializeTournamentHost,
  serializeTournamentParticipantPublic,
  serializeTournamentPublic,
} from '../serializers/tournamentSerializers.js';
import { createReviewHistory } from './tournamentReviewService.js';
import { notifyTournamentApprovalSubmitted } from './tournamentNotificationService.js';

const idString = (value) => String(value?._id || value || '');
const clean = (value = '') => String(value).trim().replace(/[<>]/g, '');
const escapeRegex = (value = '') => String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const pageParams = (query = {}, max = 100) => ({
  page: Math.max(Number(query.page) || 1, 1),
  limit: Math.min(Math.max(Number(query.limit) || 20, 1), max),
});

const protectedFields = new Set([
  'hostTeam', 'organizerTeam', 'createdBy', 'updatedBy', 'reviewedBy', 'approvalStatus', 'lifecycleStatus',
  'isPublished', 'publishedAt', 'isArchived', 'archivedAt', 'publicId', 'actorUser', 'metadata',
]);

export const assertNoProtectedTournamentFields = (input = {}) => {
  const forbidden = Object.keys(input).filter((field) => protectedFields.has(field));
  if (forbidden.length) {
    throw new AppError(`Protected tournament fields are not accepted: ${forbidden.join(', ')}.`, 400, 'VALIDATION_ERROR');
  }
};

const requireHostContext = (user) => {
  const team = user?.team;
  if (!team) throw new AppError('A team-admin account must be assigned to a team.', 403, 'TOURNAMENT_ACCESS_DENIED');
  if (team.isArchived) throw new AppError('Archived teams cannot manage tournaments.', 403, 'TOURNAMENT_ACCESS_DENIED');
  return idString(team);
};

const normalizeTournamentInput = (input = {}) => {
  const payload = { ...input };
  if (payload.name !== undefined) payload.name = clean(payload.name);
  if (payload.shortName !== undefined) payload.shortName = clean(payload.shortName);
  if (payload.slug !== undefined) payload.slug = slugify(payload.slug);
  if (!payload.slug && payload.name) payload.slug = slugify(payload.name);
  if (payload.seriesName !== undefined) payload.seriesName = clean(payload.seriesName);
  if (payload.seriesSlug !== undefined) payload.seriesSlug = slugify(payload.seriesSlug);
  if (!payload.seriesSlug && payload.seriesName) payload.seriesSlug = slugify(payload.seriesName);
  ['seasonLabel', 'description', 'country', 'state', 'city', 'primaryVenue'].forEach((field) => {
    if (payload[field] !== undefined) payload[field] = clean(payload[field]);
  });
  return payload;
};

const duplicateSlugError = (error) => {
  if (error?.code === 11000 && error?.keyPattern?.slug) {
    return new AppError('Tournament slug already exists.', 409, 'TOURNAMENT_SLUG_EXISTS');
  }
  return error;
};

const findHostedTournament = async ({ tournamentModel = Tournament, tournamentId, hostTeamId }) => {
  const tournament = await tournamentModel.findOne({ _id: tournamentId, hostTeam: hostTeamId });
  if (!tournament) throw new AppError('Tournament not found.', 404, 'TOURNAMENT_NOT_FOUND');
  return tournament;
};

export const ensureTournamentEditableByHost = (tournament, user) => {
  if (!canHostEditTournament({
    userRole: USER_ROLES.TEAM_ADMIN,
    userTeamId: user.team,
    hostTeamId: tournament.hostTeam,
    approvalStatus: tournament.approvalStatus,
    lifecycleStatus: tournament.lifecycleStatus,
    isArchived: tournament.isArchived,
  })) {
    throw new AppError('Tournament is not editable in its current state.', 409, 'TOURNAMENT_NOT_EDITABLE');
  }
};

export const createHostedTournamentDraft = async ({ tournamentModel = Tournament, user, input }) => {
  const hostTeamId = requireHostContext(user);
  assertNoProtectedTournamentFields(input);
  const payload = normalizeTournamentInput(input);
  if (!payload.slug) throw new AppError('Tournament slug is required.', 400, 'VALIDATION_ERROR');
  try {
    const tournament = await tournamentModel.create({
      ...payload,
      hostTeam: hostTeamId,
      createdBy: user._id,
      updatedBy: user._id,
      approvalStatus: TOURNAMENT_APPROVAL_STATUS.DRAFT,
      lifecycleStatus: TOURNAMENT_LIFECYCLE_STATUS.DRAFT,
      isPublished: false,
      isArchived: false,
    });
    await createReviewHistory({ tournament, action: 'created', actor: user._id, actorRole: USER_ROLES.TEAM_ADMIN, message: 'Tournament draft created.' });
    return serializeTournamentHost(tournament.toObject());
  } catch (error) {
    throw duplicateSlugError(error);
  }
};

export const listHostedTournaments = async ({ tournamentModel = Tournament, user, query = {} }) => {
  const hostTeamId = requireHostContext(user);
  const { page, limit } = pageParams(query);
  const filter = { hostTeam: hostTeamId };
  if (query.approvalStatus) filter.approvalStatus = query.approvalStatus;
  if (query.lifecycleStatus) filter.lifecycleStatus = query.lifecycleStatus;
  if (query.search) {
    const regex = escapeRegex(query.search);
    filter.$or = [{ name: { $regex: regex, $options: 'i' } }, { seriesName: { $regex: regex, $options: 'i' } }, { city: { $regex: regex, $options: 'i' } }];
  }
  const [tournaments, total] = await Promise.all([
    tournamentModel.find(filter).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit).lean(),
    tournamentModel.countDocuments(filter),
  ]);
  return { tournaments: tournaments.map(serializeTournamentHost), pagination: { page, limit, total, pages: Math.ceil(total / limit) } };
};

export const getHostedTournament = async ({ user, tournamentId }) => {
  const hostTeamId = requireHostContext(user);
  const tournament = await findHostedTournament({ tournamentId, hostTeamId });
  return serializeTournamentHost(tournament.toObject());
};

export const updateHostedTournament = async ({ user, tournamentId, input }) => {
  const hostTeamId = requireHostContext(user);
  assertNoProtectedTournamentFields(input);
  const tournament = await findHostedTournament({ tournamentId, hostTeamId });
  ensureTournamentEditableByHost(tournament, user);
  Object.assign(tournament, normalizeTournamentInput(input), { updatedBy: user._id });
  try {
    await tournament.save();
    await createReviewHistory({ tournament, action: 'updated', actor: user._id, actorRole: USER_ROLES.TEAM_ADMIN, message: 'Tournament draft updated.' });
    return serializeTournamentHost(tournament.toObject());
  } catch (error) {
    throw duplicateSlugError(error);
  }
};

export const deleteHostedTournamentDraft = async ({ user, tournamentId }) => {
  const hostTeamId = requireHostContext(user);
  const tournament = await findHostedTournament({ tournamentId, hostTeamId });
  if (tournament.approvalStatus !== TOURNAMENT_APPROVAL_STATUS.DRAFT || tournament.isArchived) {
    throw new AppError('Only draft tournaments can be deleted.', 409, 'TOURNAMENT_NOT_EDITABLE');
  }
  const participantCount = await TournamentParticipant.countDocuments({ tournament: tournament._id });
  if (participantCount > 0) {
    tournament.isArchived = true;
    tournament.archivedAt = new Date();
    tournament.lifecycleStatus = TOURNAMENT_LIFECYCLE_STATUS.ARCHIVED;
    await tournament.save();
    await createReviewHistory({ tournament, action: 'archived', actor: user._id, actorRole: USER_ROLES.TEAM_ADMIN, message: 'Draft archived because participants existed.' });
    return { archived: true };
  }
  await tournament.deleteOne();
  return { deleted: true };
};

const assertSubmissionReady = (tournament) => {
  const required = ['name', 'slug', 'scope', 'competitionFormat', 'matchFormat', 'city', 'primaryVenue', 'startDate', 'endDate'];
  const missing = required.filter((field) => !tournament[field]);
  if (missing.length) throw new AppError(`Tournament is missing required fields: ${missing.join(', ')}.`, 400, 'TOURNAMENT_APPROVAL_REQUIRED');
  if (tournament.isArchived) throw new AppError('Archived tournaments cannot be submitted.', 409, 'TOURNAMENT_ARCHIVED');
};

const submit = async ({ user, tournamentId, resubmit = false }) => {
  const hostTeamId = requireHostContext(user);
  const tournament = await findHostedTournament({ tournamentId, hostTeamId });
  const from = tournament.approvalStatus;
  const allowedFrom = resubmit ? TOURNAMENT_APPROVAL_STATUS.CHANGES_REQUESTED : TOURNAMENT_APPROVAL_STATUS.DRAFT;
  if (from !== allowedFrom || !validateApprovalTransition(from, TOURNAMENT_APPROVAL_STATUS.APPROVAL_PENDING)) {
    throw new AppError('Tournament cannot be submitted in its current state.', 409, 'TOURNAMENT_INVALID_TRANSITION');
  }
  assertSubmissionReady(tournament);
  tournament.approvalStatus = TOURNAMENT_APPROVAL_STATUS.APPROVAL_PENDING;
  tournament.submittedAt = new Date();
  tournament.updatedBy = user._id;
  await tournament.save();
  await createReviewHistory({
    tournament,
    action: resubmit ? 'resubmitted' : 'submitted',
    actor: user._id,
    actorRole: USER_ROLES.TEAM_ADMIN,
    previousStatus: from,
    nextStatus: tournament.approvalStatus,
    message: resubmit ? 'Tournament resubmitted for approval.' : 'Tournament submitted for approval.',
  });
  await notifyTournamentApprovalSubmitted({ tournament, hostTeam: user.team });
  return serializeTournamentHost(tournament.toObject());
};

export const submitForApproval = (args) => submit({ ...args, resubmit: false });
export const resubmitForApproval = (args) => submit({ ...args, resubmit: true });

const assertPublishReady = (tournament) => {
  if (tournament.approvalStatus !== TOURNAMENT_APPROVAL_STATUS.APPROVED) throw new AppError('Tournament approval is required before publishing.', 409, 'TOURNAMENT_APPROVAL_REQUIRED');
  if (tournament.visibility !== TOURNAMENT_VISIBILITY.PUBLIC) throw new AppError('Only public tournaments can be published.', 409, 'TOURNAMENT_PUBLISH_REQUIREMENTS_NOT_MET');
  if (tournament.isArchived) throw new AppError('Archived tournaments cannot be published.', 409, 'TOURNAMENT_ARCHIVED');
  assertSubmissionReady(tournament);
};

export const publishTournament = async ({ user, tournamentId }) => {
  const hostTeamId = requireHostContext(user);
  const tournament = await findHostedTournament({ tournamentId, hostTeamId });
  assertPublishReady(tournament);
  tournament.isPublished = true;
  tournament.publishedAt = new Date();
  tournament.updatedBy = user._id;
  await tournament.save();
  await createReviewHistory({ tournament, action: 'published', actor: user._id, actorRole: USER_ROLES.TEAM_ADMIN, message: 'Tournament published.' });
  return serializeTournamentHost(tournament.toObject());
};

export const unpublishTournament = async ({ user, tournamentId }) => {
  const hostTeamId = requireHostContext(user);
  const tournament = await findHostedTournament({ tournamentId, hostTeamId });
  if (tournament.isArchived) throw new AppError('Archived tournaments are read-only.', 409, 'TOURNAMENT_ARCHIVED');
  tournament.isPublished = false;
  tournament.publishedAt = null;
  tournament.updatedBy = user._id;
  await tournament.save();
  await createReviewHistory({ tournament, action: 'unpublished', actor: user._id, actorRole: USER_ROLES.TEAM_ADMIN, message: 'Tournament unpublished.' });
  return serializeTournamentHost(tournament.toObject());
};

export const listTeamAccessibleTournaments = async ({ user, query = {} }) => {
  const teamId = requireHostContext(user);
  const { page, limit } = pageParams(query);
  const participantRows = await TournamentParticipant.find({ registeredTeam: teamId }).select('tournament').lean();
  const ids = participantRows.map((row) => row.tournament);
  const filter = { $or: [{ hostTeam: teamId }, { _id: { $in: ids } }] };
  const [tournaments, total] = await Promise.all([
    Tournament.find(filter).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit).lean(),
    Tournament.countDocuments(filter),
  ]);
  return { tournaments: tournaments.map(serializeTournamentHost), pagination: { page, limit, total, pages: Math.ceil(total / limit) } };
};

export const getTeamAccessibleTournament = async ({ user, tournamentId }) => {
  const teamId = requireHostContext(user);
  const tournament = await Tournament.findById(tournamentId).lean();
  if (!tournament) throw new AppError('Tournament not found.', 404, 'TOURNAMENT_NOT_FOUND');
  const isHost = idString(tournament.hostTeam) === teamId;
  const isParticipant = await TournamentParticipant.exists({ tournament: tournamentId, registeredTeam: teamId });
  if (!isHost && !isParticipant && !isTournamentPubliclyVisible(tournament)) {
    throw new AppError('Tournament not found.', 404, 'TOURNAMENT_NOT_FOUND');
  }
  return isHost ? serializeTournamentHost(tournament) : serializeTournamentPublic(tournament);
};

const publicFilter = (query = {}) => {
  const filter = {
    approvalStatus: TOURNAMENT_APPROVAL_STATUS.APPROVED,
    visibility: TOURNAMENT_VISIBILITY.PUBLIC,
    isPublished: true,
    isArchived: query.past === 'true' ? { $in: [false, true] } : false,
  };
  ['scope', 'competitionFormat', 'matchFormat', 'lifecycleStatus', 'city'].forEach((field) => {
    if (query[field]) filter[field] = query[field];
  });
  if (query.from || query.to) {
    filter.startDate = {};
    if (query.from) filter.startDate.$gte = new Date(query.from);
    if (query.to) filter.startDate.$lte = new Date(query.to);
  }
  if (query.search) {
    const regex = escapeRegex(query.search);
    filter.$or = [{ name: { $regex: regex, $options: 'i' } }, { seriesName: { $regex: regex, $options: 'i' } }, { city: { $regex: regex, $options: 'i' } }];
  }
  return filter;
};

export const listPublicTournaments = async ({ query = {} }) => {
  const { page, limit } = pageParams(query, 50);
  const filter = publicFilter(query);
  const [tournaments, total] = await Promise.all([
    Tournament.find(filter).sort({ startDate: query.past === 'true' ? -1 : 1 }).skip((page - 1) * limit).limit(limit).lean(),
    Tournament.countDocuments(filter),
  ]);
  return { tournaments: tournaments.map(serializeTournamentPublic), pagination: { page, limit, total, pages: Math.ceil(total / limit) } };
};

export const getPublicTournamentBySlug = async ({ slug }) => {
  const tournament = await Tournament.findOne({
    slug,
    approvalStatus: TOURNAMENT_APPROVAL_STATUS.APPROVED,
    visibility: TOURNAMENT_VISIBILITY.PUBLIC,
    isPublished: true,
    isArchived: false,
  }).lean();
  if (!tournament) throw new AppError('Tournament not found.', 404, 'TOURNAMENT_NOT_FOUND');
  const participants = await TournamentParticipant.find({ tournament: tournament._id, status: 'confirmed' }).sort({ seed: 1, displayName: 1 }).lean();
  return { tournament: { ...serializeTournamentPublic(tournament), participants: participants.map(serializeTournamentParticipantPublic) } };
};
