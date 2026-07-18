import { TEAM_STATUSES } from '../models/Team.js';
import {
  assignTeamAdmin,
  changeAdminTeamStatus,
  getAdminTeamDetail,
  listAdminTeams,
  listPendingAdminTeams,
  searchAssignableTeamAdmins,
  updateAdminTeamInfo,
} from '../services/adminTeamService.js';
import asyncHandler from '../utils/asyncHandler.js';

const reason = (req) => req.body.reason || req.body.message || req.body.rejectionReason || '';

export const listTeamsForAdmin = asyncHandler(async (req, res) => {
  const data = await listAdminTeams({ query: req.query });
  res.json({ success: true, data });
});

export const listPendingTeamsForAdmin = asyncHandler(async (req, res) => {
  const data = await listPendingAdminTeams({ query: req.query });
  res.json({ success: true, data });
});

export const getTeamForAdmin = asyncHandler(async (req, res) => {
  const data = await getAdminTeamDetail({ teamId: req.params.teamId });
  res.json({ success: true, data });
});

export const patchTeamForAdmin = asyncHandler(async (req, res) => {
  const team = await updateAdminTeamInfo({ teamId: req.params.teamId, userId: req.user._id, input: req.body });
  res.json({ success: true, data: { team } });
});

export const patchTeamStatusForAdmin = asyncHandler(async (req, res) => {
  const team = await changeAdminTeamStatus({
    teamId: req.params.teamId,
    userId: req.user._id,
    nextStatus: req.body.status,
    reason: reason(req),
  });
  res.json({ success: true, data: { team } });
});

export const approveTeamForAdmin = asyncHandler(async (req, res) => {
  const team = await changeAdminTeamStatus({ teamId: req.params.teamId, userId: req.user._id, nextStatus: TEAM_STATUSES.APPROVED, reason: reason(req) || 'Team approved.' });
  res.json({ success: true, data: { team } });
});

export const rejectTeamForAdmin = asyncHandler(async (req, res) => {
  const team = await changeAdminTeamStatus({ teamId: req.params.teamId, userId: req.user._id, nextStatus: TEAM_STATUSES.REJECTED, reason: reason(req) });
  res.json({ success: true, data: { team } });
});

export const requestTeamChangesForAdmin = asyncHandler(async (req, res) => {
  const team = await changeAdminTeamStatus({ teamId: req.params.teamId, userId: req.user._id, nextStatus: TEAM_STATUSES.CHANGES_REQUESTED, reason: reason(req) });
  res.json({ success: true, data: { team } });
});

export const suspendTeamForAdmin = asyncHandler(async (req, res) => {
  const team = await changeAdminTeamStatus({ teamId: req.params.teamId, userId: req.user._id, nextStatus: TEAM_STATUSES.SUSPENDED, reason: reason(req) });
  res.json({ success: true, data: { team } });
});

export const reactivateTeamForAdmin = asyncHandler(async (req, res) => {
  const team = await changeAdminTeamStatus({ teamId: req.params.teamId, userId: req.user._id, nextStatus: TEAM_STATUSES.APPROVED, reason: reason(req) || 'Team reactivated.' });
  res.json({ success: true, data: { team } });
});

export const archiveTeamForAdmin = asyncHandler(async (req, res) => {
  const team = await changeAdminTeamStatus({ teamId: req.params.teamId, userId: req.user._id, nextStatus: TEAM_STATUSES.ARCHIVED, reason: reason(req) });
  res.json({ success: true, data: { team } });
});

export const patchTeamAdminForAdmin = asyncHandler(async (req, res) => {
  const data = await assignTeamAdmin({ teamId: req.params.teamId, userId: req.user._id, adminUserId: req.body.userId });
  res.json({ success: true, data });
});

export const listAssignableAdminsForAdmin = asyncHandler(async (req, res) => {
  const data = await searchAssignableTeamAdmins({ query: req.query });
  res.json({ success: true, data });
});
