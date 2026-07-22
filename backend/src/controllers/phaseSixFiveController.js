import env from '../config/env.js';
import asyncHandler from '../utils/asyncHandler.js';
import { getMatchReport } from '../services/matchReportService.js';
import { getMatchDayChecklist } from '../services/matchChecklistService.js';
import { getTeamAdminWhatsAppSetting, updateTeamAdminWhatsAppSetting } from '../services/platformSettingsService.js';
import { listTeamActivity } from '../services/teamActivityService.js';
import { createTeamGalleryPost, deleteTeamGalleryPost, listTeamGalleryPosts, updateTeamGalleryPost } from '../services/teamGalleryService.js';
import { createAchievement, deleteAchievement, getAchievementDetail, listAchievements, updateAchievement } from '../services/teamAchievementService.js';
import {
  getCollaborationById,
  getCollaborationForMatch,
  inviteCollaborationForMatch,
  listCollaborationsForTeam,
  reviewCollaboration,
} from '../services/matchCollaborationService.js';
import Team from '../models/Team.js';
import AppError from '../utils/AppError.js';

const ownedTeamId = (req) => req.user.team?._id || req.user.team;

export const getAdminWhatsAppSetting = asyncHandler(async (_req, res) => {
  const setting = await getTeamAdminWhatsAppSetting();
  res.json({ success: true, data: { setting } });
});

export const putAdminWhatsAppSetting = asyncHandler(async (req, res) => {
  const setting = await updateTeamAdminWhatsAppSetting({ input: req.body, userId: req.user._id });
  res.json({ success: true, data: { setting } });
});

export const getTeamWhatsAppSetting = asyncHandler(async (_req, res) => {
  const setting = await getTeamAdminWhatsAppSetting();
  res.json({ success: true, data: { setting: setting.enabled ? setting : { url: '', enabled: false, updatedAt: setting.updatedAt } } });
});

export const getTeamActivity = asyncHandler(async (req, res) => {
  const data = await listTeamActivity({ teamId: ownedTeamId(req), query: req.query });
  res.json({ success: true, data });
});

export const getTeamGalleryPosts = asyncHandler(async (req, res) => {
  const data = await listTeamGalleryPosts({ teamId: ownedTeamId(req), query: req.query });
  res.json({ success: true, data });
});

export const postTeamGalleryPost = asyncHandler(async (req, res) => {
  const data = await createTeamGalleryPost({ teamId: ownedTeamId(req), userId: req.user._id, files: req.files, input: req.body });
  res.status(201).json({ success: true, data });
});

export const patchTeamGalleryPost = asyncHandler(async (req, res) => {
  const data = await updateTeamGalleryPost({ teamId: ownedTeamId(req), postId: req.params.postId, input: req.body });
  res.json({ success: true, data });
});

export const removeTeamGalleryPost = asyncHandler(async (req, res) => {
  const data = await deleteTeamGalleryPost({ teamId: ownedTeamId(req), postId: req.params.postId });
  res.json({ success: true, data });
});

export const getTeamAchievements = asyncHandler(async (req, res) => {
  const data = await listAchievements({ teamId: ownedTeamId(req) });
  res.json({ success: true, data });
});

export const getPublicTeamGalleryPosts = asyncHandler(async (req, res) => {
  const team = await Team.findOne({ slug: req.params.teamSlug, isPublished: true, isArchived: false }).select('_id name slug logo coverPhoto').lean();
  if (!team) throw new AppError('Team not found.', 404, 'TEAM_NOT_FOUND');
  const data = await listTeamGalleryPosts({ teamId: team._id, query: req.query });
  res.json({ success: true, data: { team, ...data } });
});

export const getPublicTeamAchievements = asyncHandler(async (req, res) => {
  const team = await Team.findOne({ slug: req.params.teamSlug, isPublished: true, isArchived: false }).select('_id name slug logo coverPhoto').lean();
  if (!team) throw new AppError('Team not found.', 404, 'TEAM_NOT_FOUND');
  const data = await listAchievements({ teamId: team._id });
  res.json({ success: true, data: { team, ...data } });
});

export const getPublicTeamAchievement = asyncHandler(async (req, res) => {
  const team = await Team.findOne({ slug: req.params.teamSlug, isPublished: true, isArchived: false }).select('_id name slug logo coverPhoto').lean();
  if (!team) throw new AppError('Team not found.', 404, 'TEAM_NOT_FOUND');
  const data = await getAchievementDetail({ teamId: team._id, achievementId: req.params.achievementId });
  res.json({ success: true, data: { team, ...data } });
});

export const postTeamAchievement = asyncHandler(async (req, res) => {
  const data = await createAchievement({ teamId: ownedTeamId(req), userId: req.user._id, input: req.body, file: req.file || req.files?.image?.[0] || null, files: req.files });
  res.status(201).json({ success: true, data });
});

export const patchTeamAchievement = asyncHandler(async (req, res) => {
  const data = await updateAchievement({ teamId: ownedTeamId(req), achievementId: req.params.achievementId, input: req.body });
  res.json({ success: true, data });
});

export const removeTeamAchievement = asyncHandler(async (req, res) => {
  const data = await deleteAchievement({ teamId: ownedTeamId(req), achievementId: req.params.achievementId });
  res.json({ success: true, data });
});

export const getMatchChecklist = asyncHandler(async (req, res) => {
  const data = await getMatchDayChecklist({ matchId: req.params.matchId, teamId: ownedTeamId(req) });
  if (!data) throw new AppError('Match not found.', 404, 'MATCH_NOT_FOUND');
  res.json({ success: true, data });
});

export const getTeamMatchReport = asyncHandler(async (req, res) => {
  const { html } = await getMatchReport({ matchId: req.params.matchId, teamId: ownedTeamId(req), publicUrl: env.publicAppUrl });
  res.type('html').send(html);
});

export const getAdminMatchReport = asyncHandler(async (req, res) => {
  const { html } = await getMatchReport({ matchId: req.params.matchId, publicUrl: env.publicAppUrl });
  res.type('html').send(html);
});

export const getTeamCollaborations = asyncHandler(async (req, res) => {
  const data = await listCollaborationsForTeam({ teamId: ownedTeamId(req), query: req.query });
  res.json({ success: true, data });
});

export const getTeamCollaboration = asyncHandler(async (req, res) => {
  const data = await getCollaborationById({ collaborationId: req.params.collaborationId, teamId: ownedTeamId(req) });
  res.json({ success: true, data });
});

export const getTeamMatchCollaboration = asyncHandler(async (req, res) => {
  const data = await getCollaborationForMatch({ matchId: req.params.matchId, teamId: ownedTeamId(req) });
  res.json({ success: true, data });
});

export const postTeamMatchCollaborationInvite = asyncHandler(async (req, res) => {
  const data = await inviteCollaborationForMatch({ matchId: req.params.matchId, teamId: ownedTeamId(req), userId: req.user._id });
  res.status(201).json({ success: true, data });
});

export const patchTeamMatchCollaboration = (action) => asyncHandler(async (req, res) => {
  const data = await reviewCollaboration({ matchId: req.params.matchId, teamId: ownedTeamId(req), userId: req.user._id, action, input: req.body });
  res.json({ success: true, data });
});

const profileStrength = (team) => {
  const checks = [
    ['Team Logo', Boolean(team.logo && (typeof team.logo === 'string' || team.logo.imageUrl))],
    ['Cover Image', Boolean(team.coverPhoto && (typeof team.coverPhoto === 'string' || team.coverPhoto.imageUrl))],
    ['Motto', Boolean(team.motto)],
    ['Description', Boolean(team.description)],
    ['Social Links', Boolean(Object.values(team.socialLinks || {}).some(Boolean))],
    ['Home Ground', Boolean(team.homeGround)],
    ['Coach', Boolean(team.coach)],
  ];
  const missing = checks.filter(([, ok]) => !ok).map(([label]) => label);
  return { percentage: Math.round(((checks.length - missing.length) / checks.length) * 100), missing };
};

export const patchOwnPublicProfile = asyncHandler(async (req, res) => {
  const allowed = ['motto', 'description', 'coach', 'homeGround', 'city', 'location', 'website', 'instagram', 'facebook', 'youtube'];
  const unknown = Object.keys(req.body || {}).filter((key) => !allowed.includes(key));
  if (unknown.length) throw new AppError(`Unsupported profile fields: ${unknown.join(', ')}.`, 400, 'UNSUPPORTED_PROFILE_FIELDS');
  const team = await Team.findOne({ _id: ownedTeamId(req), isArchived: false });
  if (!team) throw new AppError('Team not found.', 404, 'TEAM_NOT_FOUND');
  ['motto', 'description', 'coach', 'homeGround', 'city', 'location'].forEach((field) => {
    if (Object.hasOwn(req.body, field)) team[field] = req.body[field] || '';
  });
  ['website', 'instagram', 'facebook', 'youtube'].forEach((field) => {
    if (Object.hasOwn(req.body, field)) team.socialLinks[field] = req.body[field] || '';
  });
  await team.save();
  res.json({ success: true, data: { team, profileStrength: profileStrength(team) } });
});

export const getOwnProfileStrength = asyncHandler(async (req, res) => {
  const team = await Team.findOne({ _id: ownedTeamId(req), isArchived: false }).lean();
  if (!team) throw new AppError('Team not found.', 404, 'TEAM_NOT_FOUND');
  res.json({ success: true, data: { profileStrength: profileStrength(team) } });
});
