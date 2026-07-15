import asyncHandler from '../utils/asyncHandler.js';
import {
  approveTeamRegistrationRequest,
  getPublicTeamRegistrationStatus,
  getTeamRegistrationRequest,
  listTeamRegistrationRequests,
  rejectTeamRegistrationRequest,
  submitTeamRegistrationRequest,
} from '../services/teamRegistrationService.js';
import { createNotificationForSuperAdmins } from '../services/notificationService.js';

export const submitPublicTeamRegistration = asyncHandler(async (req, res) => {
  const data = await submitTeamRegistrationRequest({
    input: req.body,
    files: req.files,
    notifySuperAdmins: createNotificationForSuperAdmins,
  });
  res.status(201).json({ success: true, data });
});

export const publicTeamRegistrationStatus = asyncHandler(async (req, res) => {
  const request = await getPublicTeamRegistrationStatus({ requestCode: req.params.requestCode });
  res.json({ success: true, data: { request } });
});

export const listAdminTeamRegistrationRequests = asyncHandler(async (req, res) => {
  const data = await listTeamRegistrationRequests({ query: req.query });
  res.json({ success: true, data });
});

export const getAdminTeamRegistrationRequest = asyncHandler(async (req, res) => {
  const request = await getTeamRegistrationRequest({ requestId: req.params.requestId });
  res.json({ success: true, data: { request } });
});

export const approveAdminTeamRegistrationRequest = asyncHandler(async (req, res) => {
  const data = await approveTeamRegistrationRequest({ requestId: req.params.requestId, reviewerId: req.user._id, input: req.body });
  res.json({ success: true, data });
});

export const rejectAdminTeamRegistrationRequest = asyncHandler(async (req, res) => {
  const request = await rejectTeamRegistrationRequest({ requestId: req.params.requestId, reviewerId: req.user._id, rejectionReason: req.body.rejectionReason });
  res.json({ success: true, data: { request } });
});
