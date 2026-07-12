import asyncHandler from '../utils/asyncHandler.js';
import {
  approveJoinRequest,
  getJoinRequestForAdmin,
  getJoinRequestForTeam,
  getJoinRequestStatus,
  listJoinRequestsForAdminTeam,
  listJoinRequestsForTeam,
  rejectJoinRequest,
  submitJoinRequest,
} from '../services/joinRequestService.js';

const assignedTeamId = (req) => req.user.team?._id || req.user.team;

export const submitPublicJoinRequest = asyncHandler(async (req, res) => {
  const data = await submitJoinRequest({
    teamSlug: req.params.teamSlug,
    input: req.body,
    file: req.file,
  });
  res.status(201).json({ success: true, data });
});

export const publicJoinRequestStatus = asyncHandler(async (req, res) => {
  const data = await getJoinRequestStatus({ requestCode: req.params.requestCode });
  res.json({ success: true, data });
});

export const listTeamJoinRequests = asyncHandler(async (req, res) => {
  const data = await listJoinRequestsForTeam({ teamId: assignedTeamId(req), query: req.query });
  res.json({ success: true, data });
});

export const getTeamJoinRequest = asyncHandler(async (req, res) => {
  const request = await getJoinRequestForTeam({ teamId: assignedTeamId(req), requestId: req.params.requestId });
  res.json({ success: true, data: { request } });
});

export const approveTeamJoinRequest = asyncHandler(async (req, res) => {
  const data = await approveJoinRequest({
    teamId: assignedTeamId(req),
    requestId: req.params.requestId,
    userId: req.user._id,
    input: req.body,
  });
  res.json({ success: true, data });
});

export const rejectTeamJoinRequest = asyncHandler(async (req, res) => {
  const request = await rejectJoinRequest({
    teamId: assignedTeamId(req),
    requestId: req.params.requestId,
    userId: req.user._id,
    rejectionReason: req.body.rejectionReason || '',
  });
  res.json({ success: true, data: { request } });
});

export const listAdminTeamJoinRequests = asyncHandler(async (req, res) => {
  const data = await listJoinRequestsForAdminTeam({ teamId: req.params.teamId, query: req.query });
  res.json({ success: true, data });
});

export const getAdminJoinRequest = asyncHandler(async (req, res) => {
  const request = await getJoinRequestForAdmin({ requestId: req.params.requestId });
  res.json({ success: true, data: { request } });
});
