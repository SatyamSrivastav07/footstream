import asyncHandler from '../utils/asyncHandler.js';
import {
  acceptChallenge,
  acceptCounterChallenge,
  cancelChallenge,
  counterChallenge,
  createChallenge,
  declineChallenge,
  getChallengeForAdmin,
  getChallengeHistoryForAdmin,
  getChallengeHistoryForTeam,
  getChallengeForTeam,
  listAllChallenges,
  listChallengeableTeams,
  listChallenges,
  rejectCounterChallenge,
} from '../services/challengeService.js';
import { createNotificationForTeam } from '../services/notificationService.js';

const assignedTeamId = (req) => req.user.team?._id || req.user.team;

export const postTeamChallenge = asyncHandler(async (req, res) => {
  const challenge = await createChallenge({
    teamId: assignedTeamId(req),
    userId: req.user._id,
    input: req.body,
    notifyTeam: createNotificationForTeam,
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
  const challenge = await acceptChallenge({ teamId: assignedTeamId(req), userId: req.user._id, challengeId: req.params.challengeId, notifyTeam: createNotificationForTeam });
  res.json({ success: true, data: { challenge } });
});

export const declineTeamChallenge = asyncHandler(async (req, res) => {
  const challenge = await declineChallenge({ teamId: assignedTeamId(req), userId: req.user._id, challengeId: req.params.challengeId, notifyTeam: createNotificationForTeam });
  res.json({ success: true, data: { challenge } });
});

export const cancelTeamChallenge = asyncHandler(async (req, res) => {
  const challenge = await cancelChallenge({ teamId: assignedTeamId(req), userId: req.user._id, challengeId: req.params.challengeId, notifyTeam: createNotificationForTeam });
  res.json({ success: true, data: { challenge } });
});

export const counterTeamChallenge = asyncHandler(async (req, res) => {
  const challenge = await counterChallenge({ teamId: assignedTeamId(req), userId: req.user._id, challengeId: req.params.challengeId, input: req.body, notifyTeam: createNotificationForTeam });
  res.json({ success: true, data: { challenge } });
});

export const acceptCounterTeamChallenge = asyncHandler(async (req, res) => {
  const challenge = await acceptCounterChallenge({ teamId: assignedTeamId(req), userId: req.user._id, challengeId: req.params.challengeId, notifyTeam: createNotificationForTeam });
  res.json({ success: true, data: { challenge } });
});

export const rejectCounterTeamChallenge = asyncHandler(async (req, res) => {
  const challenge = await rejectCounterChallenge({ teamId: assignedTeamId(req), userId: req.user._id, challengeId: req.params.challengeId, notifyTeam: createNotificationForTeam });
  res.json({ success: true, data: { challenge } });
});

export const getTeamChallengeHistory = asyncHandler(async (req, res) => {
  const data = await getChallengeHistoryForTeam({ teamId: assignedTeamId(req), challengeId: req.params.challengeId });
  res.json({ success: true, data });
});

export const getAdminChallengeHistory = asyncHandler(async (req, res) => {
  const data = await getChallengeHistoryForAdmin({ challengeId: req.params.challengeId });
  res.json({ success: true, data });
});

export const listAdminChallenges = asyncHandler(async (req, res) => {
  const data = await listAllChallenges({ query: req.query });
  res.json({ success: true, data });
});

export const getAdminChallenge = asyncHandler(async (req, res) => {
  const challenge = await getChallengeForAdmin({ challengeId: req.params.challengeId });
  res.json({ success: true, data: { challenge } });
});
