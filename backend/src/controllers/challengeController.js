import asyncHandler from '../utils/asyncHandler.js';
import {
  acceptChallenge,
  cancelChallenge,
  createChallenge,
  declineChallenge,
  getChallengeForAdmin,
  getChallengeForTeam,
  listAllChallenges,
  listChallengeableTeams,
  listChallenges,
} from '../services/challengeService.js';

const assignedTeamId = (req) => req.user.team?._id || req.user.team;

export const postTeamChallenge = asyncHandler(async (req, res) => {
  const challenge = await createChallenge({
    teamId: assignedTeamId(req),
    userId: req.user._id,
    input: req.body,
  });
  res.status(201).json({ success: true, data: { challenge } });
});

export const listTeamChallengeableTeams = asyncHandler(async (req, res) => {
  const data = await listChallengeableTeams({ teamId: assignedTeamId(req), query: req.query });
  res.json({ success: true, data });
});

export const listSentTeamChallenges = asyncHandler(async (req, res) => {
  const data = await listChallenges({ teamId: assignedTeamId(req), direction: 'sent', query: req.query });
  res.json({ success: true, data });
});

export const listReceivedTeamChallenges = asyncHandler(async (req, res) => {
  const data = await listChallenges({ teamId: assignedTeamId(req), direction: 'received', query: req.query });
  res.json({ success: true, data });
});

export const getTeamChallenge = asyncHandler(async (req, res) => {
  const challenge = await getChallengeForTeam({ teamId: assignedTeamId(req), challengeId: req.params.challengeId });
  res.json({ success: true, data: { challenge } });
});

export const acceptTeamChallenge = asyncHandler(async (req, res) => {
  const challenge = await acceptChallenge({ teamId: assignedTeamId(req), challengeId: req.params.challengeId });
  res.json({ success: true, data: { challenge } });
});

export const declineTeamChallenge = asyncHandler(async (req, res) => {
  const challenge = await declineChallenge({ teamId: assignedTeamId(req), challengeId: req.params.challengeId });
  res.json({ success: true, data: { challenge } });
});

export const cancelTeamChallenge = asyncHandler(async (req, res) => {
  const challenge = await cancelChallenge({ teamId: assignedTeamId(req), challengeId: req.params.challengeId });
  res.json({ success: true, data: { challenge } });
});

export const listAdminChallenges = asyncHandler(async (req, res) => {
  const data = await listAllChallenges({ query: req.query });
  res.json({ success: true, data });
});

export const getAdminChallenge = asyncHandler(async (req, res) => {
  const challenge = await getChallengeForAdmin({ challengeId: req.params.challengeId });
  res.json({ success: true, data: { challenge } });
});
