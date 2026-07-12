import Team from '../models/Team.js';
import User, { USER_ROLES } from '../models/User.js';
import AppError from '../utils/AppError.js';
import asyncHandler from '../utils/asyncHandler.js';
import { slugify } from '../utils/slugify.js';

const uniqueSlug = async (name) => {
  const base = slugify(name) || 'team';
  let slug = base;
  let count = 1;
  while (await Team.exists({ slug })) {
    count += 1;
    slug = `${base}-${count}`;
  }
  return slug;
};

export const createTeam = asyncHandler(async (req, res) => {
  const { name, description = '', location = '', shortName = '', logo = '', coverPhoto = '', city = '', coach = '', homeGround = '', founded = null, socialLinks = {}, isPublished = false } = req.body;
  const team = await Team.create({
    name,
    slug: await uniqueSlug(name),
    description,
    location,
    shortName,
    logo,
    coverPhoto,
    city,
    coach,
    homeGround,
    founded,
    socialLinks,
    isPublished,
    createdBy: req.user._id,
  });

  res.status(201).json({ success: true, data: { team } });
});

export const updateTeam = asyncHandler(async (req, res) => {
  const team = await Team.findOne({ _id: req.params.teamId, isArchived: false });
  if (!team) throw new AppError('Team not found.', 404, 'TEAM_NOT_FOUND');
  const allowed = ['name', 'shortName', 'logo', 'coverPhoto', 'description', 'location', 'city', 'coach', 'homeGround', 'founded', 'socialLinks', 'isPublished'];
  for (const key of allowed) if (Object.hasOwn(req.body, key)) team[key] = req.body[key];
  await team.save();
  res.json({ success: true, data: { team } });
});

export const getTeams = asyncHandler(async (_req, res) => {
  const teams = await Team.find({ isArchived: false })
    .sort({ createdAt: -1 })
    .lean();

  const teamIds = teams.map((team) => team._id);
  const adminCounts = await User.aggregate([
    { $match: { role: USER_ROLES.TEAM_ADMIN, team: { $in: teamIds } } },
    { $group: { _id: '$team', count: { $sum: 1 } } },
  ]);
  const countMap = new Map(adminCounts.map((item) => [item._id.toString(), item.count]));

  res.json({
    success: true,
    data: { teams: teams.map((team) => ({ ...team, adminCount: countMap.get(team._id.toString()) || 0 })) },
  });
});

export const createTeamAdmin = asyncHandler(async (req, res) => {
  const { name, email, password, teamId } = req.body;
  const team = await Team.findOne({ _id: teamId, isArchived: false });
  if (!team) throw new AppError('The selected team does not exist.', 404, 'TEAM_NOT_FOUND');

  const existing = await User.exists({ email });
  if (existing) throw new AppError('An account with this email already exists.', 409, 'EMAIL_EXISTS');

  const user = await User.create({
    name,
    email,
    password,
    role: USER_ROLES.TEAM_ADMIN,
    team: team._id,
    createdBy: req.user._id,
  });
  await user.populate('team', 'name slug');

  res.status(201).json({ success: true, data: { user } });
});

export const getTeamAdmins = asyncHandler(async (_req, res) => {
  const users = await User.find({ role: USER_ROLES.TEAM_ADMIN })
    .populate('team', 'name slug isArchived')
    .populate('createdBy', 'name email')
    .sort({ createdAt: -1 });

  res.json({ success: true, data: { users } });
});

export const setTeamAdminStatus = asyncHandler(async (req, res) => {
  const user = await User.findOne({ _id: req.params.userId, role: USER_ROLES.TEAM_ADMIN });
  if (!user) throw new AppError('Team administrator not found.', 404, 'USER_NOT_FOUND');

  user.isActive = req.body.isActive;
  await user.save({ validateModifiedOnly: true });
  await user.populate('team', 'name slug');

  res.json({ success: true, data: { user } });
});
