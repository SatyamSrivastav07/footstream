import crypto from 'node:crypto';
import { cloudinaryClient } from '../config/cloudinary.js';
import Player from '../models/Player.js';
import Team from '../models/Team.js';
import TeamJoinRequest from '../models/TeamJoinRequest.js';
import AppError from '../utils/AppError.js';
import { metadataFromUpload, publicImage, removeImageAsset } from './imageAssetService.js';
import { enforceSquadRules } from './playerService.js';
import { serializePublicTeam } from './publicProfileService.js';

const idString = (value) => String(value?._id || value || '');

export const normalizePhone = (value = '') => {
  const trimmed = String(value).trim();
  const plus = trimmed.startsWith('+') ? '+' : '';
  return `${plus}${trimmed.replace(/[^\d]/g, '')}`;
};

const requestCode = () => `FS-${crypto.randomBytes(6).toString('hex').toUpperCase()}`;

const compactTeam = (team) => ({ name: team.name, slug: team.slug });

export const publicSubmissionResponse = (request) => ({
  message: 'Join request submitted.',
  requestCode: request.requestCode,
  status: request.status,
  submittedAt: request.createdAt,
  team: compactTeam(request.team),
});

export const publicStatusResponse = (request) => ({
  requestCode: request.requestCode,
  team: compactTeam(request.team),
  status: request.status,
  submittedAt: request.createdAt,
  ...(request.reviewedAt ? { reviewedAt: request.reviewedAt } : {}),
  ...(request.status === 'rejected' && request.rejectionReason ? { rejectionReason: request.rejectionReason } : {}),
  ...(request.status === 'approved' && request.createdPlayer ? { createdPlayerPath: `/players/${idString(request.createdPlayer)}` } : {}),
});

const requestPhoto = (value) => publicImage(value).imageUrl;

export const adminRequestResponse = (request) => ({
  _id: request._id,
  requestCode: request.requestCode,
  team: request.team && typeof request.team === 'object' ? serializePublicTeam(request.team) : request.team,
  applicantName: request.applicantName,
  photoUrl: requestPhoto(request.photo),
  position: request.position,
  age: request.age,
  academicYear: request.academicYear,
  preferredFoot: request.preferredFoot,
  email: request.email,
  phone: request.phone,
  shortBio: request.shortBio,
  previousExperience: request.previousExperience,
  motivation: request.motivation,
  highlightsUrl: request.highlightsUrl,
  status: request.status,
  reviewedAt: request.reviewedAt,
  rejectionReason: request.rejectionReason,
  approvalData: request.approvalData,
  createdPlayer: request.createdPlayer,
  createdAt: request.createdAt,
  updatedAt: request.updatedAt,
});

const publicTeamForJoin = async ({ teamModel, teamSlug }) => {
  const team = await teamModel.findOne({ slug: teamSlug, isPublished: true, isArchived: false });
  if (!team) throw new AppError('Team not found.', 404, 'TEAM_NOT_FOUND');
  if (!team.acceptingJoinRequests) throw new AppError('This team is not accepting join requests right now.', 403, 'JOIN_REQUESTS_CLOSED');
  return team;
};

export const submitJoinRequest = async ({
  teamModel = Team,
  requestModel = TeamJoinRequest,
  storage = cloudinaryClient,
  teamSlug,
  input,
  file,
  notifyTeam = async () => {},
}) => {
  const team = await publicTeamForJoin({ teamModel, teamSlug });
  const email = String(input.email).trim().toLowerCase();
  const phone = normalizePhone(input.phone);
  if (!/^\+?\d{7,15}$/.test(phone)) throw new AppError('Enter a valid phone number.', 400, 'INVALID_PHONE');
  const duplicate = await requestModel.exists({ team: team._id, status: 'pending', $or: [{ email }, { phone }] });
  if (duplicate) throw new AppError('A pending request already exists for this team with that email or phone.', 409, 'JOIN_REQUEST_DUPLICATE');
  const code = requestCode();
  let photo = null;
  if (file) {
    const result = await storage.upload({
      buffer: file.buffer,
      folder: `footstream/join-requests/${team._id}/${code}`,
      publicId: `${Date.now()}-${crypto.randomUUID()}`,
    });
    photo = metadataFromUpload(result, file.size);
  }
  try {
    const request = await requestModel.create({
      team: team._id,
      applicantName: input.applicantName,
      photo,
      position: input.position,
      age: input.age || null,
      academicYear: input.academicYear || null,
      preferredFoot: input.preferredFoot || null,
      email,
      phone,
      shortBio: input.shortBio || '',
      previousExperience: input.previousExperience || '',
      motivation: input.motivation || '',
      highlightsUrl: input.highlightsUrl || '',
      requestCode: code,
    });
    request.team = team;
    await notifyTeam({
      teamId: team._id,
      type: 'join_request_received',
      title: 'New join request',
      message: `${request.applicantName} submitted a join request.`,
      entityType: 'joinRequest',
      entityId: request._id,
      actionUrl: `/team/join-requests/${request._id}`,
      dedupeKey: `join-request:${request._id}:received`,
    });
    return publicSubmissionResponse(request);
  } catch (error) {
    if (photo?.publicId) await storage.destroy(photo.publicId).catch(() => {});
    throw error;
  }
};

export const getJoinRequestStatus = async ({ requestModel = TeamJoinRequest, requestCode: code }) => {
  const request = await requestModel.findOne({ requestCode: code, isActive: true }).populate('team', 'name slug').lean();
  if (!request) throw new AppError('Join request not found.', 404, 'JOIN_REQUEST_NOT_FOUND');
  return publicStatusResponse(request);
};

const buildListFilter = (teamId, query = {}) => {
  const filter = { team: teamId, isActive: true };
  if (query.status) filter.status = query.status;
  if (query.position) filter.position = query.position;
  if (query.academicYear) filter.academicYear = query.academicYear;
  if (query.from || query.to) {
    filter.createdAt = {};
    if (query.from) filter.createdAt.$gte = new Date(query.from);
    if (query.to) filter.createdAt.$lte = new Date(query.to);
  }
  if (query.search) {
    const safe = query.search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    filter.$or = [{ applicantName: { $regex: safe, $options: 'i' } }, { email: { $regex: safe, $options: 'i' } }, { phone: { $regex: safe, $options: 'i' } }];
  }
  return filter;
};

export const listJoinRequestsForTeam = async ({ requestModel = TeamJoinRequest, teamId, query = {} }) => {
  const page = Number(query.page) || 1;
  const limit = Math.min(50, Number(query.limit) || 12);
  const filter = buildListFilter(teamId, query);
  const [requests, total, counts] = await Promise.all([
    requestModel.find(filter).sort({ createdAt: -1, _id: -1 }).skip((page - 1) * limit).limit(limit).lean(),
    requestModel.countDocuments(filter),
    requestModel.aggregate([{ $match: { team: teamId, isActive: true } }, { $group: { _id: '$status', count: { $sum: 1 } } }]),
  ]);
  return {
    requests: requests.map(adminRequestResponse),
    summary: {
      total: counts.reduce((sum, item) => sum + item.count, 0),
      pending: counts.find((item) => item._id === 'pending')?.count || 0,
      approved: counts.find((item) => item._id === 'approved')?.count || 0,
      rejected: counts.find((item) => item._id === 'rejected')?.count || 0,
    },
    pagination: { page, limit, total, pages: Math.ceil(total / limit) },
  };
};

export const getJoinRequestForTeam = async ({ requestModel = TeamJoinRequest, teamId, requestId }) => {
  const request = await requestModel.findOne({ _id: requestId, team: teamId, isActive: true }).lean();
  if (!request) throw new AppError('Join request not found.', 404, 'JOIN_REQUEST_NOT_FOUND');
  return adminRequestResponse(request);
};

const pendingRequest = async ({ requestModel, teamId, requestId }) => {
  const request = await requestModel.findOne({ _id: requestId, team: teamId, isActive: true });
  if (!request) throw new AppError('Join request not found.', 404, 'JOIN_REQUEST_NOT_FOUND');
  if (request.status !== 'pending') throw new AppError('Only pending join requests can be reviewed.', 409, 'JOIN_REQUEST_NOT_PENDING');
  if (request.createdPlayer) throw new AppError('This request has already created a player.', 409, 'JOIN_REQUEST_ALREADY_PROCESSED');
  return request;
};

export const approveJoinRequest = async ({
  requestModel = TeamJoinRequest,
  playerModel = Player,
  teamId,
  requestId,
  userId,
  input,
  notifyTeam = async () => {},
}) => {
  const request = await pendingRequest({ requestModel, teamId, requestId });
  const playerValues = {
    name: input.name || request.applicantName,
    photo: request.photo || '',
    position: input.position || request.position,
    jerseyNumber: input.jerseyNumber,
    age: input.age ?? request.age ?? null,
    academicYear: input.academicYear ?? request.academicYear ?? null,
    preferredFoot: input.preferredFoot ?? request.preferredFoot ?? null,
    availabilityStatus: input.availabilityStatus || 'available',
    isCaptain: Boolean(input.isCaptain),
    isViceCaptain: Boolean(input.isViceCaptain),
    isActive: true,
  };
  await enforceSquadRules({ model: playerModel, teamId, values: playerValues });
  const player = await playerModel.create({ ...playerValues, team: teamId, createdBy: userId });
  request.status = 'approved';
  request.reviewedBy = userId;
  request.reviewedAt = new Date();
  request.approvalData = {
    jerseyNumber: playerValues.jerseyNumber,
    availabilityStatus: playerValues.availabilityStatus,
    isCaptain: playerValues.isCaptain,
    isViceCaptain: playerValues.isViceCaptain,
  };
  request.createdPlayer = player._id;
  await request.save();
  await notifyTeam({
    teamId,
    type: 'join_request_approved',
    title: 'Join request approved',
    message: `${request.applicantName} was approved into the squad.`,
    entityType: 'joinRequest',
    entityId: request._id,
    actionUrl: `/team/join-requests/${request._id}`,
    dedupeKey: `join-request:${request._id}:approved`,
  });
  return { request: adminRequestResponse(request.toObject()), player };
};

export const rejectJoinRequest = async ({
  requestModel = TeamJoinRequest,
  storage = cloudinaryClient,
  teamId,
  requestId,
  userId,
  rejectionReason = '',
  notifyTeam = async () => {},
}) => {
  const request = await pendingRequest({ requestModel, teamId, requestId });
  await removeImageAsset({
    document: request,
    field: 'photo',
    storage,
    deleteFailureCode: 'JOIN_REQUEST_PHOTO_DELETE_FAILED',
    deleteFailureMessage: 'Join request photo deletion failed.',
  });
  request.status = 'rejected';
  request.reviewedBy = userId;
  request.reviewedAt = new Date();
  request.rejectionReason = rejectionReason;
  await request.save();
  await notifyTeam({
    teamId,
    type: 'join_request_rejected',
    title: 'Join request rejected',
    message: `${request.applicantName} was rejected.`,
    entityType: 'joinRequest',
    entityId: request._id,
    actionUrl: `/team/join-requests/${request._id}`,
    dedupeKey: `join-request:${request._id}:rejected`,
  });
  return adminRequestResponse(request.toObject());
};

export const listJoinRequestsForAdminTeam = async ({ requestModel = TeamJoinRequest, teamId, query = {} }) =>
  listJoinRequestsForTeam({ requestModel, teamId, query });

export const getJoinRequestForAdmin = async ({ requestModel = TeamJoinRequest, requestId }) => {
  const request = await requestModel.findOne({ _id: requestId, isActive: true }).populate('team').lean();
  if (!request) throw new AppError('Join request not found.', 404, 'JOIN_REQUEST_NOT_FOUND');
  return adminRequestResponse(request);
};
