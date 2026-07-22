import mongoose from 'mongoose';
import Match from '../models/Match.js';
import MatchCollaboration from '../models/MatchCollaboration.js';
import AppError from '../utils/AppError.js';
import { createNotificationForTeam } from './notificationService.js';
import { logTeamActivity } from './teamActivityService.js';

const idString = (value) => String(value?._id || value || '');
const plain = (value) => (typeof value?.toJSON === 'function' ? value.toJSON() : value);

export const collaborationBadgeFor = (match, collaboration) => {
  if (!match?.registeredOpponentTeam) return 'Hosted by FootStream team';
  if (collaboration?.status === 'accepted') return 'Verified by Both Teams';
  if (collaboration?.status === 'pending') return 'Opponent Verification Pending';
  if (collaboration?.status === 'changes_requested') return 'Opponent requested changes';
  if (collaboration?.status === 'rejected') return 'Opponent did not verify';
  if (collaboration?.status === 'changes_rejected') return 'Opponent changes rejected';
  if (collaboration?.status === 'cancelled') return 'Verification request cancelled';
  if (collaboration?.status === 're_verification_required') return 'Re-verification required';
  return `Hosted by ${match.team?.name || 'host team'}`;
};

const teamSummary = (team) => {
  const value = plain(team);
  if (!value || typeof value !== 'object' || value instanceof mongoose.Types.ObjectId) return { id: idString(team), name: '' };
  return {
    id: idString(value),
    name: value.name || '',
    shortName: value.shortName || '',
    slug: value.slug || '',
    logo: value.logo || '',
  };
};

const matchSummary = (match) => {
  const value = plain(match);
  if (!value || typeof value !== 'object' || value instanceof mongoose.Types.ObjectId) return { id: idString(match) };
  return {
    id: idString(value),
    opponentName: value.opponent?.name || '',
    scheduledAt: value.scheduledAt || null,
    venue: value.venue || '',
    matchType: value.matchType || '',
    matchMode: value.matchMode || '',
    status: value.status || '',
    result: value.result || null,
  };
};

export const serializeCollaborationSummary = (collaboration, teamId = null) => {
  if (!collaboration) return null;
  const match = collaboration.match;
  const role = teamId
    ? (idString(collaboration.hostTeam) === idString(teamId) ? 'host' : idString(collaboration.opponentTeam) === idString(teamId) ? 'opponent' : 'viewer')
    : 'viewer';
  return {
    id: idString(collaboration._id || collaboration.id),
    match: matchSummary(match),
    matchId: idString(match),
    hostTeam: teamSummary(collaboration.hostTeam),
    opponentTeam: teamSummary(collaboration.opponentTeam),
    role,
    status: collaboration.status,
    badge: collaborationBadgeFor({ registeredOpponentTeam: collaboration.opponentTeam, team: collaboration.hostTeam }, collaboration),
  };
};

const serialize = (collaboration, teamId = null) => ({
  ...serializeCollaborationSummary(collaboration, teamId),
  status: collaboration.status,
  rejectionReason: collaboration.rejectionReason || '',
  hostDecisionReason: collaboration.hostDecisionReason || '',
  opponentStatsApplied: Boolean(collaboration.opponentStatsApplied),
  opponentStatsAppliedAt: collaboration.opponentStatsAppliedAt || null,
  verificationVersion: collaboration.verificationVersion || 1,
  changeRequests: (collaboration.changeRequests || []).map((request) => ({
    message: request.message,
    requestedAt: request.requestedAt,
    hostResponse: request.hostResponse || 'pending',
    respondedAt: request.respondedAt || null,
  })),
  createdAt: collaboration.createdAt,
  updatedAt: collaboration.updatedAt,
});

const assertParticipant = (match, teamId) => {
  const host = idString(match.team) === idString(teamId);
  const opponent = idString(match.registeredOpponentTeam) === idString(teamId);
  if (!host && !opponent) throw new AppError('Match not found.', 404, 'MATCH_NOT_FOUND');
  return { host, opponent };
};

export const ensureCollaborationRequest = async ({
  collaborationModel = MatchCollaboration,
  notificationForTeam = createNotificationForTeam,
  activityLogger = logTeamActivity,
  match,
  userId,
}) => {
  if (!match.registeredOpponentTeam) return null;
  const collaboration = await collaborationModel.findOneAndUpdate(
    { match: match._id },
    {
      $setOnInsert: {
        match: match._id,
        hostTeam: match.team,
        opponentTeam: match.registeredOpponentTeam,
        requestedBy: userId,
        status: 'pending',
      },
    },
    { upsert: true, new: true, setDefaultsOnInsert: true },
  );
  if (collaboration.status === 'accepted') return collaboration;
  await notificationForTeam({
    teamId: match.registeredOpponentTeam,
    type: 'match_collaboration_requested',
    title: 'Match verification requested',
    message: `${match.opponent?.name || 'A registered opponent'} match result is ready for verification.`,
    entityType: 'matchCollaboration',
    entityId: collaboration._id,
    actionUrl: `/team/collaborations/${collaboration._id}`,
    dedupeKey: `match-collaboration-requested:${collaboration._id}`,
  });
  await activityLogger({
    teamId: match.registeredOpponentTeam,
    actor: userId,
    type: 'collaboration_requested',
    title: 'Collaboration request received',
    message: 'A host team requested match verification.',
    metadata: { matchId: match._id, collaborationId: collaboration._id },
  });
  return collaboration;
};

export const listCollaborationsForTeam = async ({ collaborationModel = MatchCollaboration, teamId, query = {} }) => {
  const filter = { $or: [{ hostTeam: teamId }, { opponentTeam: teamId }] };
  if (query.status) filter.status = query.status;
  const collaborations = await collaborationModel.find(filter)
    .populate('match', 'opponent scheduledAt venue matchType matchMode status result')
    .populate('hostTeam', 'name shortName slug logo')
    .populate('opponentTeam', 'name shortName slug logo')
    .sort({ updatedAt: -1 })
    .lean();
  return { collaborations: collaborations.map((item) => serialize(item, teamId)) };
};

export const getCollaborationForMatch = async ({ collaborationModel = MatchCollaboration, matchId, teamId }) => {
  const collaboration = await collaborationModel.findOne({ match: matchId })
    .populate('match', 'opponent scheduledAt venue matchType matchMode status result')
    .populate('hostTeam', 'name shortName slug logo')
    .populate('opponentTeam', 'name shortName slug logo')
    .lean();
  if (!collaboration) return { collaboration: null };
  if (teamId && idString(collaboration.hostTeam) !== idString(teamId) && idString(collaboration.opponentTeam) !== idString(teamId)) {
    throw new AppError('Match collaboration not found.', 404, 'MATCH_COLLABORATION_NOT_FOUND');
  }
  return { collaboration: serialize(collaboration, teamId) };
};

export const getCollaborationById = async ({ collaborationModel = MatchCollaboration, collaborationId, teamId }) => {
  if (!mongoose.Types.ObjectId.isValid(collaborationId)) throw new AppError('Match collaboration not found.', 404, 'MATCH_COLLABORATION_NOT_FOUND');
  const collaboration = await collaborationModel.findOne({ _id: collaborationId })
    .populate('match', 'opponent scheduledAt venue matchType matchMode status result')
    .populate('hostTeam', 'name shortName slug logo')
    .populate('opponentTeam', 'name shortName slug logo')
    .lean();
  if (!collaboration) throw new AppError('Match collaboration not found.', 404, 'MATCH_COLLABORATION_NOT_FOUND');
  if (teamId && idString(collaboration.hostTeam) !== idString(teamId) && idString(collaboration.opponentTeam) !== idString(teamId)) {
    throw new AppError('Match collaboration not found.', 404, 'MATCH_COLLABORATION_NOT_FOUND');
  }
  return { collaboration: serialize(collaboration, teamId) };
};

export const inviteCollaborationForMatch = async ({ matchModel = Match, matchId, teamId, userId }) => {
  if (!mongoose.Types.ObjectId.isValid(matchId)) throw new AppError('Match not found.', 404, 'MATCH_NOT_FOUND');
  const match = await matchModel.findOne({ _id: matchId, isActive: true });
  if (!match) throw new AppError('Match not found.', 404, 'MATCH_NOT_FOUND');
  const role = assertParticipant(match, teamId);
  if (!role.host) throw new AppError('Only the host team can invite match verification.', 403, 'COLLABORATION_HOST_FORBIDDEN');
  if (!match.registeredOpponentTeam) throw new AppError('Verification is available only for registered opponent teams.', 400, 'COLLABORATION_REGISTERED_OPPONENT_REQUIRED');
  const collaboration = await ensureCollaborationRequest({ match, userId });
  return { collaboration: serialize(collaboration, teamId) };
};

export const reviewCollaboration = async ({
  matchModel = Match,
  collaborationModel = MatchCollaboration,
  notificationForTeam = createNotificationForTeam,
  activityLogger = logTeamActivity,
  matchId,
  teamId,
  userId,
  action,
  input = {},
}) => {
  if (!mongoose.Types.ObjectId.isValid(matchId)) throw new AppError('Match not found.', 404, 'MATCH_NOT_FOUND');
  const match = await matchModel.findOne({ _id: matchId, isActive: true });
  if (!match) throw new AppError('Match not found.', 404, 'MATCH_NOT_FOUND');
  const role = assertParticipant(match, teamId);
  const collaboration = await collaborationModel.findOne({ match: matchId });
  if (!collaboration) throw new AppError('Match collaboration not found.', 404, 'MATCH_COLLABORATION_NOT_FOUND');

  if (action === 'accept') {
    if (!role.opponent) throw new AppError('Only the registered opponent can accept verification.', 403, 'COLLABORATION_REVIEW_FORBIDDEN');
    if (!['pending', 'changes_requested'].includes(collaboration.status)) throw new AppError('This collaboration request cannot be accepted now.', 409, 'COLLABORATION_NOT_REVIEWABLE');
    collaboration.status = 'accepted';
    collaboration.acceptedBy = userId;
    collaboration.acceptedAt = new Date();
    collaboration.opponentStatsApplied = true;
    collaboration.opponentStatsAppliedAt = collaboration.opponentStatsAppliedAt || new Date();
    await collaboration.save();
    await notificationForTeam({ teamId: match.team, type: 'match_collaboration_accepted', title: 'Match verified', message: 'Opponent team verified the match result.', entityType: 'matchCollaboration', entityId: collaboration._id, actionUrl: `/team/collaborations/${collaboration._id}`, dedupeKey: `match-collaboration-accepted:${collaboration._id}` });
    await activityLogger({ teamId: match.team, actor: userId, type: 'collaboration_accepted', title: 'Collaboration accepted', message: 'Opponent verified the match result.', metadata: { matchId, collaborationId: collaboration._id } });
    await activityLogger({ teamId, actor: userId, type: 'collaboration_accepted', title: 'Collaboration accepted', message: 'Your team verified a shared match result.', metadata: { matchId, collaborationId: collaboration._id } });
    return { collaboration: serialize(collaboration) };
  }

  if (action === 'request-changes') {
    if (!role.opponent) throw new AppError('Only the registered opponent can request changes.', 403, 'COLLABORATION_REVIEW_FORBIDDEN');
    const message = String(input.message || '').trim();
    if (!message) throw new AppError('Enter what needs to be corrected.', 400, 'COLLABORATION_MESSAGE_REQUIRED');
    collaboration.status = 'changes_requested';
    collaboration.changeRequests.push({ message, requestedBy: userId, requestedAt: new Date(), hostResponse: 'pending' });
    await collaboration.save();
    await notificationForTeam({ teamId: match.team, type: 'match_collaboration_changes_requested', title: 'Match changes requested', message, entityType: 'matchCollaboration', entityId: collaboration._id, actionUrl: `/team/collaborations/${collaboration._id}`, dedupeKey: `match-collaboration-changes:${collaboration._id}:${collaboration.changeRequests.length}` });
    return { collaboration: serialize(collaboration) };
  }

  if (action === 'reject') {
    if (!role.opponent) throw new AppError('Only the registered opponent can reject verification.', 403, 'COLLABORATION_REVIEW_FORBIDDEN');
    if (!['pending', 'changes_requested', 're_verification_required'].includes(collaboration.status)) throw new AppError('This collaboration request cannot be rejected now.', 409, 'COLLABORATION_NOT_REVIEWABLE');
    collaboration.status = 'rejected';
    collaboration.rejectedBy = userId;
    collaboration.rejectedAt = new Date();
    collaboration.rejectionReason = String(input.reason || '').trim();
    await collaboration.save();
    await notificationForTeam({ teamId: match.team, type: 'match_collaboration_rejected', title: 'Match verification rejected', message: collaboration.rejectionReason || 'Opponent did not verify the match result.', entityType: 'matchCollaboration', entityId: collaboration._id, actionUrl: `/team/collaborations/${collaboration._id}`, dedupeKey: `match-collaboration-rejected:${collaboration._id}` });
    return { collaboration: serialize(collaboration) };
  }

  if (['accept-changes', 'reject-changes'].includes(action)) {
    if (!role.host) throw new AppError('Only the host team can respond to requested changes.', 403, 'COLLABORATION_HOST_FORBIDDEN');
    const pending = [...collaboration.changeRequests].reverse().find((request) => request.hostResponse === 'pending');
    if (!pending) throw new AppError('No pending change request found.', 409, 'NO_PENDING_COLLABORATION_CHANGE');
    pending.hostResponse = action === 'accept-changes' ? 'accepted' : 'rejected';
    pending.respondedBy = userId;
    pending.respondedAt = new Date();
    collaboration.hostDecisionReason = String(input.reason || '').trim();
    if (action === 'accept-changes') {
      collaboration.status = 'accepted';
      collaboration.acceptedBy = userId;
      collaboration.acceptedAt = new Date();
      collaboration.opponentStatsApplied = true;
      collaboration.opponentStatsAppliedAt = collaboration.opponentStatsAppliedAt || new Date();
    }
    if (action === 'reject-changes') collaboration.status = 'changes_rejected';
    await collaboration.save();
    return { collaboration: serialize(collaboration) };
  }

  if (action === 'cancel') {
    if (!role.host) throw new AppError('Only the host team can cancel verification.', 403, 'COLLABORATION_HOST_FORBIDDEN');
    if (!['pending', 'changes_requested', 'changes_rejected'].includes(collaboration.status)) throw new AppError('This collaboration request cannot be cancelled now.', 409, 'COLLABORATION_NOT_CANCELLABLE');
    collaboration.status = 'cancelled';
    collaboration.cancelledBy = userId;
    collaboration.cancelledAt = new Date();
    await collaboration.save();
    await notificationForTeam({ teamId: match.registeredOpponentTeam, type: 'match_collaboration_rejected', title: 'Match verification cancelled', message: 'The host team cancelled the verification request.', entityType: 'matchCollaboration', entityId: collaboration._id, actionUrl: `/team/collaborations/${collaboration._id}`, dedupeKey: `match-collaboration-cancelled:${collaboration._id}` });
    return { collaboration: serialize(collaboration, teamId) };
  }

  throw new AppError('Unsupported collaboration action.', 400, 'INVALID_COLLABORATION_ACTION');
};
