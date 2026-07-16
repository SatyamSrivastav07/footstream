import Tournament from '../models/Tournament.js';
import TournamentReviewHistory from '../models/TournamentReviewHistory.js';
import AppError from '../utils/AppError.js';
import {
  TOURNAMENT_APPROVAL_STATUS,
  TOURNAMENT_LIFECYCLE_STATUS,
  validateApprovalTransition,
} from '../constants/tournamentConstants.js';
import { USER_ROLES } from '../models/User.js';
import { serializeTournamentAdmin, serializeTournamentHost } from '../serializers/tournamentSerializers.js';
import {
  notifyTournamentHostTeam,
} from './tournamentNotificationService.js';
import { TOURNAMENT_NOTIFICATION_TYPE } from '../constants/tournamentConstants.js';

const pageParams = (query = {}, max = 100) => ({
  page: Math.max(Number(query.page) || 1, 1),
  limit: Math.min(Math.max(Number(query.limit) || 20, 1), max),
});

export const createReviewHistory = async ({
  reviewModel = TournamentReviewHistory,
  tournament,
  action,
  actor,
  actorRole,
  previousStatus = null,
  nextStatus = tournament?.approvalStatus,
  message = '',
  metadata = {},
}) => reviewModel.create({
  tournament: tournament._id || tournament,
  action,
  actor,
  actorRole,
  previousStatus,
  nextStatus,
  message,
  metadata,
});

export const serializeHostReviewHistory = (entry) => ({
  action: entry.action,
  actorRole: entry.actorRole,
  previousStatus: entry.previousStatus,
  nextStatus: entry.nextStatus,
  safeMessage: entry.message,
  createdAt: entry.createdAt,
});

export const serializeAdminReviewHistory = (entry) => ({
  ...serializeHostReviewHistory(entry),
  actor: entry.actor ? { _id: entry.actor._id, name: entry.actor.name, role: entry.actor.role } : null,
});

export const listTournamentsForAdmin = async ({ tournamentModel = Tournament, query = {} }) => {
  const { page, limit } = pageParams(query);
  const filter = {};
  if (query.approvalStatus) filter.approvalStatus = query.approvalStatus;
  if (query.archived !== undefined) filter.isArchived = query.archived === true || query.archived === 'true';
  if (query.scope) filter.scope = query.scope;
  if (query.search) {
    const safe = query.search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    filter.$or = [{ name: { $regex: safe, $options: 'i' } }, { seriesName: { $regex: safe, $options: 'i' } }, { city: { $regex: safe, $options: 'i' } }];
  }
  const [tournaments, total] = await Promise.all([
    tournamentModel.find(filter).sort({ submittedAt: -1, createdAt: -1 }).skip((page - 1) * limit).limit(limit).lean(),
    tournamentModel.countDocuments(filter),
  ]);
  return { tournaments: tournaments.map(serializeTournamentAdmin), pagination: { page, limit, total, pages: Math.ceil(total / limit) } };
};

export const getTournamentForAdmin = async ({ tournamentModel = Tournament, tournamentId }) => {
  const tournament = await tournamentModel.findById(tournamentId).lean();
  if (!tournament) throw new AppError('Tournament not found.', 404, 'TOURNAMENT_NOT_FOUND');
  return serializeTournamentAdmin(tournament);
};

export const getAdminReviewHistory = async ({ reviewModel = TournamentReviewHistory, tournamentModel = Tournament, tournamentId, query = {} }) => {
  if (!await tournamentModel.exists({ _id: tournamentId })) throw new AppError('Tournament not found.', 404, 'TOURNAMENT_NOT_FOUND');
  const { page, limit } = pageParams(query);
  const [history, total] = await Promise.all([
    reviewModel.find({ tournament: tournamentId }).populate('actor', 'name role').sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit).lean(),
    reviewModel.countDocuments({ tournament: tournamentId }),
  ]);
  return { history: history.map(serializeAdminReviewHistory), pagination: { page, limit, total, pages: Math.ceil(total / limit) } };
};

const transition = async ({ tournamentModel = Tournament, tournamentId, actor, action, toStatus, message = '', requiredFrom, notify }) => {
  const tournament = await tournamentModel.findById(tournamentId);
  if (!tournament) throw new AppError('Tournament not found.', 404, 'TOURNAMENT_NOT_FOUND');
  if (tournament.isArchived) throw new AppError('Archived tournaments are read-only.', 409, 'TOURNAMENT_ARCHIVED');
  const previousStatus = tournament.approvalStatus;
  if (requiredFrom && previousStatus !== requiredFrom) {
    throw new AppError('Tournament status does not allow this action.', 409, 'TOURNAMENT_INVALID_TRANSITION');
  }
  if (!validateApprovalTransition(previousStatus, toStatus)) {
    throw new AppError('Invalid tournament status transition.', 409, 'TOURNAMENT_INVALID_TRANSITION');
  }
  tournament.approvalStatus = toStatus;
  tournament.reviewedBy = actor._id || actor;
  tournament.reviewedAt = new Date();
  if (toStatus === TOURNAMENT_APPROVAL_STATUS.APPROVED) {
    tournament.approvedAt = new Date();
    tournament.rejectedAt = null;
    tournament.rejectionReason = '';
    tournament.changeRequest = '';
  }
  if (toStatus === TOURNAMENT_APPROVAL_STATUS.REJECTED) {
    tournament.rejectedAt = new Date();
    tournament.rejectionReason = message;
    tournament.isPublished = false;
    tournament.publishedAt = null;
  }
  if (toStatus === TOURNAMENT_APPROVAL_STATUS.CHANGES_REQUESTED) {
    tournament.changeRequest = message;
    tournament.isPublished = false;
    tournament.publishedAt = null;
  }
  if (toStatus === TOURNAMENT_APPROVAL_STATUS.SUSPENDED) {
    tournament.changeRequest = message;
    tournament.isPublished = false;
    tournament.publishedAt = null;
  }
  await tournament.save();
  await createReviewHistory({ tournament, action, actor: actor._id || actor, actorRole: USER_ROLES.SUPER_ADMIN, previousStatus, nextStatus: toStatus, message });
  if (notify) await notify(tournament);
  return serializeTournamentAdmin(tournament.toObject());
};

export const approveTournament = (args) => transition({
  ...args,
  action: 'approved',
  toStatus: TOURNAMENT_APPROVAL_STATUS.APPROVED,
  requiredFrom: TOURNAMENT_APPROVAL_STATUS.APPROVAL_PENDING,
  notify: (tournament) => notifyTournamentHostTeam({
    tournament,
    type: TOURNAMENT_NOTIFICATION_TYPE.APPROVED,
    title: 'Tournament approved',
    message: `${tournament.name} has been approved. You can publish it when ready.`,
    dedupeKeySuffix: `approved:${tournament.reviewedAt.getTime()}`,
  }),
});

export const rejectTournament = (args) => transition({
  ...args,
  action: 'rejected',
  toStatus: TOURNAMENT_APPROVAL_STATUS.REJECTED,
  requiredFrom: TOURNAMENT_APPROVAL_STATUS.APPROVAL_PENDING,
  notify: (tournament) => notifyTournamentHostTeam({
    tournament,
    type: TOURNAMENT_NOTIFICATION_TYPE.REJECTED,
    title: 'Tournament rejected',
    message: `${tournament.name} was rejected. Review the reason and create a new draft if needed.`,
    dedupeKeySuffix: `rejected:${tournament.reviewedAt.getTime()}`,
  }),
});

export const requestChanges = (args) => transition({
  ...args,
  action: 'changes_requested',
  toStatus: TOURNAMENT_APPROVAL_STATUS.CHANGES_REQUESTED,
  requiredFrom: TOURNAMENT_APPROVAL_STATUS.APPROVAL_PENDING,
  notify: (tournament) => notifyTournamentHostTeam({
    tournament,
    type: TOURNAMENT_NOTIFICATION_TYPE.CHANGES_REQUESTED,
    title: 'Tournament changes requested',
    message: `${tournament.name} needs changes before approval.`,
    dedupeKeySuffix: `changes:${tournament.reviewedAt.getTime()}`,
  }),
});

export const suspendTournament = (args) => transition({
  ...args,
  action: 'suspended',
  toStatus: TOURNAMENT_APPROVAL_STATUS.SUSPENDED,
  requiredFrom: TOURNAMENT_APPROVAL_STATUS.APPROVED,
  notify: (tournament) => notifyTournamentHostTeam({
    tournament,
    type: TOURNAMENT_NOTIFICATION_TYPE.SUSPENDED,
    title: 'Tournament suspended',
    message: `${tournament.name} has been suspended and unpublished.`,
    dedupeKeySuffix: `suspended:${tournament.reviewedAt.getTime()}`,
  }),
});

export const unsuspendTournament = (args) => transition({
  ...args,
  action: 'unsuspended',
  toStatus: TOURNAMENT_APPROVAL_STATUS.APPROVED,
  requiredFrom: TOURNAMENT_APPROVAL_STATUS.SUSPENDED,
  notify: (tournament) => notifyTournamentHostTeam({
    tournament,
    type: TOURNAMENT_NOTIFICATION_TYPE.UNSUSPENDED,
    title: 'Tournament restored',
    message: `${tournament.name} has been restored to approved status.`,
    dedupeKeySuffix: `unsuspended:${tournament.reviewedAt.getTime()}`,
  }),
});

export const archiveTournament = async ({ tournamentModel = Tournament, tournamentId, actor, message = '' }) => {
  const tournament = await tournamentModel.findById(tournamentId);
  if (!tournament) throw new AppError('Tournament not found.', 404, 'TOURNAMENT_NOT_FOUND');
  if (tournament.isArchived) return serializeTournamentAdmin(tournament.toObject());
  if (![TOURNAMENT_APPROVAL_STATUS.REJECTED, TOURNAMENT_APPROVAL_STATUS.SUSPENDED, TOURNAMENT_APPROVAL_STATUS.APPROVED].includes(tournament.approvalStatus)) {
    throw new AppError('Tournament cannot be archived in its current status.', 409, 'TOURNAMENT_INVALID_TRANSITION');
  }
  const previousStatus = tournament.approvalStatus;
  tournament.isArchived = true;
  tournament.archivedAt = new Date();
  tournament.lifecycleStatus = TOURNAMENT_LIFECYCLE_STATUS.ARCHIVED;
  tournament.isPublished = false;
  tournament.publishedAt = null;
  await tournament.save();
  await createReviewHistory({ tournament, action: 'archived', actor: actor._id || actor, actorRole: USER_ROLES.SUPER_ADMIN, previousStatus, nextStatus: tournament.approvalStatus, message });
  return serializeTournamentAdmin(tournament.toObject());
};

export const getHostReviewHistory = async ({ reviewModel = TournamentReviewHistory, tournamentId, hostTeamId, query = {} }) => {
  const tournament = await Tournament.findOne({ _id: tournamentId, hostTeam: hostTeamId });
  if (!tournament) throw new AppError('Tournament not found.', 404, 'TOURNAMENT_NOT_FOUND');
  const { page, limit } = pageParams(query);
  const [history, total] = await Promise.all([
    reviewModel.find({ tournament: tournamentId }).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit).lean(),
    reviewModel.countDocuments({ tournament: tournamentId }),
  ]);
  return { history: history.map(serializeHostReviewHistory), pagination: { page, limit, total, pages: Math.ceil(total / limit) } };
};

export const hostReviewSerializer = serializeTournamentHost;
