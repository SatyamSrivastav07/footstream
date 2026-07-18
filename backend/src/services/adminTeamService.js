import Match from '../models/Match.js';
import Player from '../models/Player.js';
import Team, { TEAM_STATUSES } from '../models/Team.js';
import TeamJoinRequest from '../models/TeamJoinRequest.js';
import TeamRegistrationRequest from '../models/TeamRegistrationRequest.js';
import User, { USER_ROLES } from '../models/User.js';
import AppError from '../utils/AppError.js';
import { slugify } from '../utils/slugify.js';
import { assertTeamTransition, normalizeTeamStatus } from './teamStatusTransitions.js';

const idString = (value) => String(value?._id || value || '');
const escapeRegex = (value = '') => String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const clean = (value = '') => String(value).trim().replace(/[<>]/g, '');
const toPage = (query) => Math.max(Number(query.page) || 1, 1);
const toLimit = (query) => Math.min(Math.max(Number(query.limit) || 20, 1), 50);

const imageUrl = (value) => {
  if (!value) return '';
  if (typeof value === 'string') return value;
  return value.imageUrl || value.url || value.secure_url || '';
};

export const publicTeamSummary = (team, extras = {}) => ({
  _id: team._id,
  id: idString(team._id),
  name: team.name,
  slug: team.slug,
  logo: team.logo,
  logoUrl: imageUrl(team.logo),
  coverPhoto: team.coverPhoto,
  shortName: team.shortName || '',
  organization: team.organization || '',
  college: team.organization || team.location || '',
  location: team.location || '',
  city: team.city || '',
  teamType: team.teamType || '',
  coach: team.coach || '',
  homeGround: team.homeGround || '',
  founded: team.founded || null,
  description: team.description || '',
  socialLinks: team.socialLinks || {},
  isPublished: Boolean(team.isPublished),
  acceptingJoinRequests: Boolean(team.acceptingJoinRequests),
  isArchived: Boolean(team.isArchived),
  status: normalizeTeamStatus(team),
  approvedAt: team.approvedAt || null,
  rejectedAt: team.rejectedAt || null,
  rejectionReason: team.rejectionReason || '',
  changeRequestMessage: team.changeRequestMessage || '',
  changesRequestedAt: team.changesRequestedAt || null,
  suspensionReason: team.suspensionReason || '',
  suspendedAt: team.suspendedAt || null,
  reactivatedAt: team.reactivatedAt || null,
  archivedAt: team.archivedAt || null,
  archiveReason: team.archiveReason || '',
  createdAt: team.createdAt,
  updatedAt: team.updatedAt,
  ...extras,
});

const serializeAdmin = (user) => user ? ({
  _id: user._id,
  id: idString(user._id),
  name: user.name,
  email: user.email,
  isActive: Boolean(user.isActive),
  team: user.team ? idString(user.team) : null,
}) : null;

const buildTeamFilter = (query = {}) => {
  const filter = {};
  const and = [];
  if (query.status) {
    if (query.status === TEAM_STATUSES.ARCHIVED) and.push({ $or: [{ status: TEAM_STATUSES.ARCHIVED }, { isArchived: true }] });
    else filter.status = query.status;
  } else if (query.includeArchived !== 'true') {
    filter.isArchived = false;
  }
  if (query.teamType) filter.teamType = query.teamType;
  if (query.search) {
    const safe = escapeRegex(query.search);
    and.push({ $or: [
      { name: { $regex: safe, $options: 'i' } },
      { shortName: { $regex: safe, $options: 'i' } },
      { organization: { $regex: safe, $options: 'i' } },
      { location: { $regex: safe, $options: 'i' } },
      { city: { $regex: safe, $options: 'i' } },
    ] });
  }
  if (and.length) filter.$and = and;
  return filter;
};

const teamSearchClause = (search, adminTeamIds = []) => {
  const safe = escapeRegex(search);
  return { $or: [
    { name: { $regex: safe, $options: 'i' } },
    { shortName: { $regex: safe, $options: 'i' } },
    { organization: { $regex: safe, $options: 'i' } },
    { location: { $regex: safe, $options: 'i' } },
    { city: { $regex: safe, $options: 'i' } },
    ...(adminTeamIds.length ? [{ _id: { $in: adminTeamIds } }] : []),
  ] };
};

const sortFor = (sort = 'newest') => {
  if (sort === 'oldest') return { createdAt: 1 };
  if (sort === 'alpha') return { name: 1 };
  return { createdAt: -1 };
};

export const listAdminTeams = async ({ teamModel = Team, userModel = User, playerModel = Player, query = {} }) => {
  const page = toPage(query);
  const limit = toLimit(query);
  const baseFilter = buildTeamFilter({ ...query, search: '' });
  const adminSearch = clean(query.search || '');
  let filter = baseFilter;

  if (adminSearch) {
    const safe = escapeRegex(adminSearch);
    const adminTeamIds = await userModel.distinct('team', {
      role: USER_ROLES.TEAM_ADMIN,
      $or: [{ name: { $regex: safe, $options: 'i' } }, { email: { $regex: safe, $options: 'i' } }],
    });
    filter = { ...baseFilter, $and: [...(baseFilter.$and || []), teamSearchClause(adminSearch, adminTeamIds)] };
  }

  const [teams, total] = await Promise.all([
    teamModel.find(filter).sort(sortFor(query.sort)).skip((page - 1) * limit).limit(limit).lean(),
    teamModel.countDocuments(filter),
  ]);
  const ids = teams.map((team) => team._id);
  const [admins, playerCounts] = await Promise.all([
    userModel.find({ role: USER_ROLES.TEAM_ADMIN, team: { $in: ids } }).select('name email isActive team').lean(),
    playerModel.aggregate([{ $match: { team: { $in: ids } } }, { $group: { _id: '$team', total: { $sum: 1 }, active: { $sum: { $cond: ['$isActive', 1, 0] } } } }]),
  ]);
  const adminMap = new Map();
  admins.forEach((admin) => {
    const key = idString(admin.team);
    if (!adminMap.has(key)) adminMap.set(key, []);
    adminMap.get(key).push(serializeAdmin(admin));
  });
  const playerCountMap = new Map(playerCounts.map((item) => [idString(item._id), item]));

  return {
    teams: teams.map((team) => publicTeamSummary(team, {
      teamAdmins: adminMap.get(idString(team._id)) || [],
      teamAdmin: adminMap.get(idString(team._id))?.[0] || null,
      adminCount: adminMap.get(idString(team._id))?.length || 0,
      playerCount: playerCountMap.get(idString(team._id))?.total || 0,
      activePlayerCount: playerCountMap.get(idString(team._id))?.active || 0,
    })),
    pagination: { page, limit, total, pages: Math.ceil(total / limit) },
  };
};

export const listPendingAdminTeams = async ({ requestModel = TeamRegistrationRequest, query = {} }) => {
  const page = toPage(query);
  const limit = toLimit(query);
  const statuses = query.status ? [query.status] : ['pending', 'changesRequested'];
  const filter = { status: { $in: statuses } };
  if (query.search) {
    const safe = escapeRegex(query.search);
    filter.$or = [
      { teamName: { $regex: safe, $options: 'i' } },
      { city: { $regex: safe, $options: 'i' } },
      { representativeName: { $regex: safe, $options: 'i' } },
      { email: { $regex: safe, $options: 'i' } },
    ];
  }
  const [requests, total] = await Promise.all([
    requestModel.find(filter).sort({ status: 1, createdAt: -1 }).skip((page - 1) * limit).limit(limit).lean(),
    requestModel.countDocuments(filter),
  ]);
  return {
    requests: requests.map((request) => ({
      _id: request._id,
      id: idString(request._id),
      requestCode: request.requestCode,
      status: request.status,
      teamName: request.teamName,
      logoUrl: imageUrl(request.logo),
      college: request.city || '',
      teamType: request.roleInTeam || '',
      city: request.city,
      country: request.country,
      representativeName: request.representativeName,
      roleInTeam: request.roleInTeam,
      email: request.email,
      phone: request.phone,
      message: request.message,
      changeRequestMessage: request.changeRequestMessage || '',
      submittedAt: request.submittedAt || request.createdAt,
      updatedAt: request.updatedAt,
    })),
    pagination: { page, limit, total, pages: Math.ceil(total / limit) },
  };
};

export const getAdminTeamDetail = async ({
  teamModel = Team,
  userModel = User,
  playerModel = Player,
  matchModel = Match,
  joinRequestModel = TeamJoinRequest,
  requestModel = TeamRegistrationRequest,
  teamId,
}) => {
  const team = await teamModel.findById(teamId).lean();
  if (!team) throw new AppError('Team not found.', 404, 'TEAM_NOT_FOUND');
  const [admins, players, pendingJoinRequests, registration, matchStats] = await Promise.all([
    userModel.find({ role: USER_ROLES.TEAM_ADMIN, team: team._id }).select('name email isActive team createdAt updatedAt').lean(),
    playerModel.find({ team: team._id }).select('name position jerseyNumber isActive isCaptain isViceCaptain availabilityStatus').lean(),
    joinRequestModel.countDocuments({ team: team._id, status: 'pending', isActive: true }).catch(() => 0),
    requestModel.findOne({ createdTeam: team._id }).select('-__v').lean().catch(() => null),
    matchModel.aggregate([
      { $match: { isActive: true, $or: [{ team: team._id }, { registeredOpponentTeam: team._id }] } },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 },
          wins: { $sum: { $cond: ['$result.teamWon', 1, 0] } },
          draws: { $sum: { $cond: ['$result.draw', 1, 0] } },
        },
      },
    ]).catch(() => []),
  ]);

  const matchSummary = matchStats.reduce((summary, item) => {
    summary.totalMatches += item.count;
    if (item._id === 'scheduled') summary.upcomingMatches += item.count;
    if (['live', 'half_time'].includes(item._id)) summary.liveMatches += item.count;
    if (item._id === 'completed') {
      summary.wins += item.wins || 0;
      summary.draws += item.draws || 0;
      summary.losses = Math.max(item.count - (item.wins || 0) - (item.draws || 0), 0);
    }
    return summary;
  }, { totalMatches: 0, wins: 0, draws: 0, losses: 0, upcomingMatches: 0, liveMatches: 0 });

  const activePlayers = players.filter((player) => player.isActive);
  const squadSummary = {
    totalPlayers: players.length,
    activePlayers: activePlayers.length,
    pendingJoinRequests,
    captain: activePlayers.find((player) => player.isCaptain) || null,
    viceCaptain: activePlayers.find((player) => player.isViceCaptain) || null,
    goalkeepersCount: activePlayers.filter((player) => String(player.position).toUpperCase() === 'GK').length,
  };
  const recentActivity = [
    team.approvedAt ? { type: 'approved', message: 'Team approved.', at: team.approvedAt } : null,
    team.suspendedAt ? { type: 'suspended', message: team.suspensionReason || 'Team suspended.', at: team.suspendedAt } : null,
    team.reactivatedAt ? { type: 'reactivated', message: 'Team reactivated.', at: team.reactivatedAt } : null,
    team.archivedAt ? { type: 'archived', message: team.archiveReason || 'Team archived.', at: team.archivedAt } : null,
    ...(team.statusHistory || []).map((item) => ({ type: item.status, message: item.reason || `Status changed to ${item.status}.`, at: item.at })),
  ].filter(Boolean).sort((a, b) => new Date(b.at) - new Date(a.at)).slice(0, 8);

  return {
    team: publicTeamSummary(team, {
      teamAdmins: admins.map(serializeAdmin),
      teamAdmin: admins.map(serializeAdmin)[0] || null,
      registrationApplicant: registration ? {
        requestId: registration._id,
        teamName: registration.teamName,
        representativeName: registration.representativeName,
        email: registration.email,
        phone: registration.phone,
        status: registration.status,
        submittedAt: registration.submittedAt,
      } : null,
    }),
    squadSummary,
    matchSummary,
    recentActivity,
  };
};

const findTeamForAction = async (teamModel, teamId) => {
  const team = await teamModel.findById(teamId);
  if (!team) throw new AppError('Team not found.', 404, 'TEAM_NOT_FOUND');
  return team;
};

const pushHistory = (team, status, reason, actor) => {
  team.statusHistory = [...(team.statusHistory || []), { status, reason: clean(reason), actor, at: new Date() }].slice(-30);
};

export const updateAdminTeamInfo = async ({ teamModel = Team, teamId, userId, input }) => {
  const team = await findTeamForAction(teamModel, teamId);
  if (normalizeTeamStatus(team) === TEAM_STATUSES.ARCHIVED) throw new AppError('Archived teams are read-only.', 409, 'TEAM_ARCHIVED');
  const allowed = ['name', 'shortName', 'description', 'location', 'city', 'coach', 'homeGround', 'founded', 'organization', 'teamType', 'socialLinks', 'isPublished', 'acceptingJoinRequests'];
  for (const field of allowed) {
    if (Object.hasOwn(input, field)) team[field] = input[field];
  }
  if (Object.hasOwn(input, 'name')) {
    const nextSlug = slugify(input.slug || input.name);
    if (nextSlug && nextSlug !== team.slug) {
      const exists = await teamModel.exists({ slug: nextSlug, _id: { $ne: team._id } });
      if (exists) throw new AppError('A team with this slug already exists.', 409, 'TEAM_SLUG_EXISTS');
      team.slug = nextSlug;
    }
  }
  pushHistory(team, normalizeTeamStatus(team), 'Team information edited.', userId);
  await team.save();
  return publicTeamSummary(team.toObject());
};

export const changeAdminTeamStatus = async ({ teamModel = Team, teamId, userId, nextStatus, reason = '' }) => {
  const team = await findTeamForAction(teamModel, teamId);
  const previousStatus = assertTeamTransition(team, nextStatus);
  const now = new Date();
  team.status = nextStatus;
  if (nextStatus === TEAM_STATUSES.APPROVED) {
    team.isArchived = false;
    team.isPublished = true;
    team.approvedAt = team.approvedAt || now;
    team.approvedBy = team.approvedBy || userId;
    team.reactivatedAt = previousStatus === TEAM_STATUSES.SUSPENDED ? now : team.reactivatedAt;
    team.reactivatedBy = previousStatus === TEAM_STATUSES.SUSPENDED ? userId : team.reactivatedBy;
    team.suspensionReason = '';
  }
  if (nextStatus === TEAM_STATUSES.SUSPENDED) {
    team.isPublished = false;
    team.suspendedAt = now;
    team.suspendedBy = userId;
    team.suspensionReason = clean(reason);
  }
  if (nextStatus === TEAM_STATUSES.ARCHIVED) {
    team.isArchived = true;
    team.isPublished = false;
    team.archivedAt = now;
    team.archivedBy = userId;
    team.archiveReason = clean(reason);
  }
  if (nextStatus === TEAM_STATUSES.REJECTED) {
    team.rejectedAt = now;
    team.rejectedBy = userId;
    team.rejectionReason = clean(reason);
    team.isPublished = false;
  }
  if (nextStatus === TEAM_STATUSES.CHANGES_REQUESTED) {
    team.changesRequestedAt = now;
    team.changesRequestedBy = userId;
    team.changeRequestMessage = clean(reason);
    team.isPublished = false;
  }
  pushHistory(team, nextStatus, reason || `Status changed to ${nextStatus}.`, userId);
  await team.save();
  return publicTeamSummary(team.toObject());
};

export const assignTeamAdmin = async ({ teamModel = Team, userModel = User, teamId, userId, adminUserId }) => {
  const team = await findTeamForAction(teamModel, teamId);
  if (normalizeTeamStatus(team) === TEAM_STATUSES.ARCHIVED) throw new AppError('Archived teams cannot change team admin.', 409, 'TEAM_ARCHIVED');
  const newAdmin = await userModel.findOne({ _id: adminUserId, role: USER_ROLES.TEAM_ADMIN });
  if (!newAdmin) throw new AppError('Team administrator not found.', 404, 'USER_NOT_FOUND');
  if (!newAdmin.isActive) throw new AppError('Disabled team administrators cannot be assigned.', 409, 'USER_DISABLED');
  if (idString(newAdmin.team) === idString(team._id)) throw new AppError('This administrator is already assigned to this team.', 409, 'TEAM_ADMIN_UNCHANGED');
  await userModel.updateMany({ role: USER_ROLES.TEAM_ADMIN, team: team._id, _id: { $ne: newAdmin._id } }, { $set: { team: null, isActive: false } });
  newAdmin.team = team._id;
  newAdmin.isActive = true;
  await newAdmin.save({ validateModifiedOnly: true });
  pushHistory(team, normalizeTeamStatus(team), `Team admin assigned: ${newAdmin.name}.`, userId);
  await team.save();
  return { team: publicTeamSummary(team.toObject()), user: serializeAdmin(newAdmin.toObject()) };
};

export const searchAssignableTeamAdmins = async ({ userModel = User, query = {} }) => {
  const limit = Math.min(Math.max(Number(query.limit) || 20, 1), 50);
  const filter = { role: USER_ROLES.TEAM_ADMIN };
  if (query.search) {
    const safe = escapeRegex(query.search);
    filter.$or = [{ name: { $regex: safe, $options: 'i' } }, { email: { $regex: safe, $options: 'i' } }];
  }
  const users = await userModel.find(filter).select('name email isActive team').populate('team', 'name slug').sort({ name: 1 }).limit(limit).lean();
  return { users: users.map((user) => ({ ...serializeAdmin(user), teamName: user.team?.name || '' })) };
};
