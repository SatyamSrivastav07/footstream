import crypto from 'node:crypto';
import Team from '../models/Team.js';
import TeamRegistrationRequest from '../models/TeamRegistrationRequest.js';
import User, { USER_ROLES } from '../models/User.js';
import { cloudinaryClient } from '../config/cloudinary.js';
import AppError from '../utils/AppError.js';
import { metadataFromUpload, publicImage } from './imageAssetService.js';
import { normalizePhone } from './joinRequestService.js';
import { slugify } from '../utils/slugify.js';

const idString = (value) => String(value?._id || value || '');
export const normalizeTeamName = (value = '') => String(value).trim().replace(/\s+/g, ' ').toLowerCase();
const requestCode = () => `FSTR-${crypto.randomBytes(6).toString('hex').toUpperCase()}`;
const clean = (value = '') => String(value).trim().replace(/[<>]/g, '');
const imageUrl = (value) => publicImage(value).imageUrl;

const safeRequest = (request, { admin = false } = {}) => ({
  _id: admin ? request._id : undefined,
  requestCode: request.requestCode,
  status: request.status,
  teamName: request.teamName,
  shortName: request.shortName,
  city: request.city,
  state: request.state,
  country: request.country,
  foundedYear: request.foundedYear,
  primaryColor: request.primaryColor,
  secondaryColor: request.secondaryColor,
  description: request.description,
  instagramUrl: request.instagramUrl,
  websiteUrl: request.websiteUrl,
  representativeName: admin ? request.representativeName : undefined,
  roleInTeam: admin ? request.roleInTeam : undefined,
  email: admin ? request.email : undefined,
  phone: admin ? request.phone : undefined,
  message: admin ? request.message : undefined,
  logoUrl: imageUrl(request.logo),
  coverUrl: imageUrl(request.cover),
  submittedAt: request.submittedAt || request.createdAt,
  reviewedAt: request.reviewedAt,
  rejectionReason: request.status === 'rejected' ? request.rejectionReason : undefined,
  changeRequestMessage: request.status === 'changesRequested' ? request.changeRequestMessage : undefined,
  changesRequestedAt: request.changesRequestedAt,
  createdTeam: admin && request.createdTeam ? idString(request.createdTeam) : undefined,
  createdAdmin: admin && request.createdAdmin ? idString(request.createdAdmin) : undefined,
  createdAt: admin ? request.createdAt : undefined,
  updatedAt: admin ? request.updatedAt : undefined,
});

const uploadOptional = async ({ storage, file, folder, publicId }) => {
  if (!file) return null;
  const result = await storage.upload({ buffer: file.buffer, folder, publicId });
  return metadataFromUpload(result, file.size);
};

export const submitTeamRegistrationRequest = async ({
  requestModel = TeamRegistrationRequest,
  teamModel = Team,
  storage = cloudinaryClient,
  input,
  files = {},
  notifySuperAdmins = async () => {},
}) => {
  const email = clean(input.email).toLowerCase();
  const phone = normalizePhone(input.phone);
  const normalizedTeamName = normalizeTeamName(input.teamName);
  if (!/^\+?\d{7,15}$/.test(phone)) throw new AppError('Enter a valid phone number.', 400, 'INVALID_PHONE');
  const approvedTeam = await teamModel.exists({ name: { $regex: `^${normalizedTeamName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, $options: 'i' }, isArchived: false });
  if (approvedTeam) throw new AppError('A team with this name already exists on FootStream.', 409, 'TEAM_ALREADY_EXISTS');
  const duplicate = await requestModel.exists({
    status: { $in: ['pending', 'changesRequested'] },
    $or: [{ email }, { phone }, { normalizedTeamName }],
  });
  if (duplicate) throw new AppError('A pending team registration request already exists for this team, email, or phone.', 409, 'TEAM_REGISTRATION_DUPLICATE');

  const code = requestCode();
  const uploaded = [];
  try {
    const logo = await uploadOptional({ storage, file: files.logo?.[0], folder: `footstream/team-registration/${code}/logo`, publicId: `${Date.now()}-${crypto.randomUUID()}` });
    if (logo) uploaded.push(logo.publicId);
    const cover = await uploadOptional({ storage, file: files.cover?.[0], folder: `footstream/team-registration/${code}/cover`, publicId: `${Date.now()}-${crypto.randomUUID()}` });
    if (cover) uploaded.push(cover.publicId);
    const request = await requestModel.create({
      requestCode: code,
      teamName: clean(input.teamName),
      normalizedTeamName,
      shortName: clean(input.shortName),
      city: clean(input.city),
      state: clean(input.state),
      country: clean(input.country),
      foundedYear: input.foundedYear || null,
      primaryColor: clean(input.primaryColor),
      secondaryColor: clean(input.secondaryColor),
      description: clean(input.description),
      instagramUrl: clean(input.instagramUrl),
      websiteUrl: clean(input.websiteUrl),
      representativeName: clean(input.representativeName),
      roleInTeam: clean(input.roleInTeam),
      email,
      phone,
      message: clean(input.message),
      logo,
      cover,
    });
    await notifySuperAdmins({
      type: 'team_registration_received',
      title: 'New team registration request',
      message: `${request.teamName} from ${request.city} submitted by ${request.representativeName}.`,
      entityType: 'teamRegistrationRequest',
      entityId: request._id,
      actionUrl: `/admin/team-requests/${request._id}`,
      dedupeKey: `team-registration:${request._id}:received`,
    });
    return { message: 'Your team registration request has been submitted.', request: safeRequest(request) };
  } catch (error) {
    await Promise.all(uploaded.map((publicId) => storage.destroy(publicId).catch(() => {})));
    throw error;
  }
};

export const getPublicTeamRegistrationStatus = async ({ requestModel = TeamRegistrationRequest, requestCode: code }) => {
  const request = await requestModel.findOne({ requestCode: code }).lean();
  if (!request) throw new AppError('Team registration request not found.', 404, 'TEAM_REGISTRATION_NOT_FOUND');
  return safeRequest(request);
};

export const listTeamRegistrationRequests = async ({ requestModel = TeamRegistrationRequest, query = {} }) => {
  const page = Math.max(Number(query.page) || 1, 1);
  const limit = Math.min(Math.max(Number(query.limit) || 20, 1), 50);
  const filter = {};
  if (query.status) filter.status = query.status;
  if (query.search) {
    const safe = query.search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    filter.$or = [{ teamName: { $regex: safe, $options: 'i' } }, { city: { $regex: safe, $options: 'i' } }, { representativeName: { $regex: safe, $options: 'i' } }];
  }
  const [requests, total] = await Promise.all([
    requestModel.find(filter).sort({ status: 1, createdAt: -1 }).skip((page - 1) * limit).limit(limit).lean(),
    requestModel.countDocuments(filter),
  ]);
  return { requests: requests.map((request) => safeRequest(request, { admin: true })), pagination: { page, limit, total, pages: Math.ceil(total / limit) } };
};

export const getTeamRegistrationRequest = async ({ requestModel = TeamRegistrationRequest, requestId }) => {
  const request = await requestModel.findById(requestId).lean();
  if (!request) throw new AppError('Team registration request not found.', 404, 'TEAM_REGISTRATION_NOT_FOUND');
  return safeRequest(request, { admin: true });
};

export const approveTeamRegistrationRequest = async ({
  requestModel = TeamRegistrationRequest,
  teamModel = Team,
  userModel = User,
  requestId,
  reviewerId,
  input,
}) => {
  const request = await requestModel.findById(requestId);
  if (!request) throw new AppError('Team registration request not found.', 404, 'TEAM_REGISTRATION_NOT_FOUND');
  if (!['pending', 'changesRequested'].includes(request.status)) throw new AppError('Only pending or changes-requested team registration requests can be approved.', 409, 'TEAM_REGISTRATION_NOT_PENDING');
  const slug = slugify(input.slug || input.teamName || request.teamName);
  if (!slug) throw new AppError('Enter a valid team slug.', 400, 'TEAM_SLUG_REQUIRED');
  if (await teamModel.exists({ slug })) throw new AppError('Team slug already exists.', 409, 'TEAM_SLUG_EXISTS');
  const email = clean(input.adminEmail).toLowerCase();
  if (await userModel.exists({ email })) throw new AppError('An account with this email already exists.', 409, 'EMAIL_EXISTS');
  let team;
  let admin;
  try {
    team = await teamModel.create({
      name: clean(input.teamName || request.teamName),
      slug,
      shortName: clean(input.shortName ?? request.shortName),
      city: clean(input.city ?? request.city),
      location: [clean(input.city ?? request.city), clean(input.country ?? request.country)].filter(Boolean).join(', '),
      founded: input.foundedYear ?? request.foundedYear ?? null,
      description: clean(input.description ?? request.description),
      socialLinks: { instagram: request.instagramUrl, website: request.websiteUrl },
      logo: request.logo || '',
      coverPhoto: request.cover || '',
      isPublished: true,
      acceptingJoinRequests: true,
      status: 'approved',
      approvedAt: new Date(),
      approvedBy: reviewerId,
      createdBy: reviewerId,
    });
    admin = await userModel.create({
      name: clean(input.adminName),
      email,
      password: input.temporaryPassword,
      role: USER_ROLES.TEAM_ADMIN,
      team: team._id,
      createdBy: reviewerId,
    });
    request.status = 'approved';
    request.reviewedBy = reviewerId;
    request.reviewedAt = new Date();
    request.createdTeam = team._id;
    request.createdAdmin = admin._id;
    await request.save();
  } catch (error) {
    if (admin?._id) await userModel.deleteOne({ _id: admin._id }).catch(() => {});
    if (team?._id) await teamModel.deleteOne({ _id: team._id }).catch(() => {});
    throw error;
  }
  return { request: safeRequest(request.toObject(), { admin: true }), team, admin: { _id: admin._id, name: admin.name, email: admin.email } };
};

export const rejectTeamRegistrationRequest = async ({ requestModel = TeamRegistrationRequest, requestId, reviewerId, rejectionReason }) => {
  const request = await requestModel.findById(requestId);
  if (!request) throw new AppError('Team registration request not found.', 404, 'TEAM_REGISTRATION_NOT_FOUND');
  if (request.status !== 'pending') throw new AppError('Only pending team registration requests can be rejected.', 409, 'TEAM_REGISTRATION_NOT_PENDING');
  request.status = 'rejected';
  request.reviewedBy = reviewerId;
  request.reviewedAt = new Date();
  request.rejectionReason = clean(rejectionReason);
  await request.save();
  return safeRequest(request.toObject(), { admin: true });
};

export const requestTeamRegistrationChanges = async ({ requestModel = TeamRegistrationRequest, requestId, reviewerId, message }) => {
  const request = await requestModel.findById(requestId);
  if (!request) throw new AppError('Team registration request not found.', 404, 'TEAM_REGISTRATION_NOT_FOUND');
  if (request.status !== 'pending') throw new AppError('Only pending team registration requests can receive change requests.', 409, 'TEAM_REGISTRATION_NOT_PENDING');
  request.status = 'changesRequested';
  request.reviewedBy = reviewerId;
  request.reviewedAt = new Date();
  request.changesRequestedBy = reviewerId;
  request.changesRequestedAt = new Date();
  request.changeRequestMessage = clean(message);
  await request.save();
  return safeRequest(request.toObject(), { admin: true });
};
