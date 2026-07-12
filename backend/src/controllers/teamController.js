import { removeTeamBranding, uploadTeamBranding } from '../services/teamBrandingService.js';
import asyncHandler from '../utils/asyncHandler.js';
import Team from '../models/Team.js';
import AppError from '../utils/AppError.js';

const assignedTeamId = (req) => req.user.team?._id || req.user.team;

export const getAssignedTeam = asyncHandler(async (req, res) => {
  const team = await Team.findOne({ _id: assignedTeamId(req), isArchived: false }).lean();
  if (!team) throw new AppError('Team not found.', 404, 'TEAM_NOT_FOUND');
  res.json({ success: true, data: { team } });
});

export const updateOwnJoinRequestStatus = asyncHandler(async (req, res) => {
  const team = await Team.findOne({ _id: assignedTeamId(req), isArchived: false });
  if (!team) throw new AppError('Team not found.', 404, 'TEAM_NOT_FOUND');
  team.acceptingJoinRequests = req.body.acceptingJoinRequests;
  await team.save();
  res.json({ success: true, data: { team } });
});

const uploadOwnBranding = (kind) => asyncHandler(async (req, res) => {
  const data = await uploadTeamBranding({ teamId: assignedTeamId(req), kind, file: req.file });
  res.json({ success: true, data });
});

const removeOwnBranding = (kind) => asyncHandler(async (req, res) => {
  const data = await removeTeamBranding({ teamId: assignedTeamId(req), kind });
  res.json({ success: true, data });
});

export const uploadOwnLogo = uploadOwnBranding('logo');
export const uploadOwnCover = uploadOwnBranding('coverPhoto');
export const removeOwnLogo = removeOwnBranding('logo');
export const removeOwnCover = removeOwnBranding('coverPhoto');
