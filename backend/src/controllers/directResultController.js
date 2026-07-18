import asyncHandler from '../utils/asyncHandler.js';
import { getDirectResult, submitAdminDirectResult, submitTeamDirectResult } from '../services/directResultService.js';
import { queueResultPublishedPush } from '../services/pushService.js';

const ownedTeamId = (req) => req.user.team?._id || req.user.team;

export const getTeamDirectResult = asyncHandler(async (req, res) => {
  const data = await getDirectResult({ matchId: req.params.matchId, teamId: ownedTeamId(req) });
  res.json({ success: true, data });
});

export const putTeamDirectResult = asyncHandler(async (req, res) => {
  const data = await submitTeamDirectResult({
    matchId: req.params.matchId,
    teamId: ownedTeamId(req),
    userId: req.user._id,
    input: req.body,
  });
  queueResultPublishedPush(req.params.matchId);
  res.json({ success: true, data });
});

export const getAdminDirectResult = asyncHandler(async (req, res) => {
  const data = await getDirectResult({ matchId: req.params.matchId });
  res.json({ success: true, data });
});

export const putAdminDirectResult = asyncHandler(async (req, res) => {
  const data = await submitAdminDirectResult({
    matchId: req.params.matchId,
    userId: req.user._id,
    input: req.body,
  });
  queueResultPublishedPush(req.params.matchId);
  res.json({ success: true, data });
});
