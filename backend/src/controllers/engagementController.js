import asyncHandler from '../utils/asyncHandler.js';
import { emitToMatch } from '../realtime/realtimeHub.js';
import {
  closePoll,
  createChatMessage,
  createPoll,
  deleteChatMessage,
  deletePoll,
  getAnnouncement,
  getPublicAnnouncement,
  getReactionCounts,
  listChatMessages,
  listPublicPolls,
  listTeamPolls,
  openPoll,
  removeAnnouncement,
  toggleReaction,
  updatePoll,
  upsertAnnouncement,
  votePoll,
} from '../services/engagementService.js';

const ownedTeamId = (req) => req.user.team?._id || req.user.team;

export const getPublicChat = asyncHandler(async (req, res) => {
  const data = await listChatMessages({ matchId: req.params.matchId, before: req.query.before, limit: req.query.limit });
  res.json({ success: true, data });
});

export const postPublicChat = asyncHandler(async (req, res) => {
  const message = await createChatMessage({ matchId: req.params.matchId, input: req.body });
  emitToMatch(req.params.matchId, 'match:chat-message', { message });
  res.status(201).json({ success: true, data: { message } });
});

export const deleteTeamChatMessage = asyncHandler(async (req, res) => {
  const message = await deleteChatMessage({
    teamId: ownedTeamId(req),
    userId: req.user._id,
    matchId: req.params.matchId,
    messageId: req.params.messageId,
  });
  emitToMatch(req.params.matchId, 'match:chat-deleted', { messageId: req.params.messageId });
  res.json({ success: true, data: { message } });
});

export const getTeamAnnouncement = asyncHandler(async (req, res) => {
  const announcement = await getAnnouncement({ matchId: req.params.matchId });
  res.json({ success: true, data: { announcement } });
});

export const putTeamAnnouncement = asyncHandler(async (req, res) => {
  const announcement = await upsertAnnouncement({
    teamId: ownedTeamId(req),
    userId: req.user._id,
    matchId: req.params.matchId,
    input: req.body,
  });
  emitToMatch(req.params.matchId, 'match:announcement-updated', { announcement });
  res.json({ success: true, data: { announcement } });
});

export const deleteTeamAnnouncement = asyncHandler(async (req, res) => {
  await removeAnnouncement({ teamId: ownedTeamId(req), matchId: req.params.matchId });
  emitToMatch(req.params.matchId, 'match:announcement-removed', { matchId: req.params.matchId });
  res.json({ success: true, data: { message: 'Announcement removed.' } });
});

export const getPublicMatchAnnouncement = asyncHandler(async (req, res) => {
  const announcement = await getPublicAnnouncement({ matchId: req.params.matchId });
  res.json({ success: true, data: { announcement } });
});

export const getPublicReactions = asyncHandler(async (req, res) => {
  const counts = await getReactionCounts({ matchId: req.params.matchId });
  res.json({ success: true, data: { reactions: counts } });
});

export const togglePublicReaction = asyncHandler(async (req, res) => {
  const result = await toggleReaction({
    matchId: req.params.matchId,
    reactionType: req.params.reactionType,
    guestSessionId: req.body.guestSessionId,
  });
  emitToMatch(req.params.matchId, 'match:reactions', { reactions: result.counts });
  res.json({ success: true, data: result });
});

export const getTeamPolls = asyncHandler(async (req, res) => {
  const polls = await listTeamPolls({ teamId: ownedTeamId(req), matchId: req.params.matchId });
  res.json({ success: true, data: { polls } });
});

export const postTeamPoll = asyncHandler(async (req, res) => {
  const poll = await createPoll({ teamId: ownedTeamId(req), userId: req.user._id, matchId: req.params.matchId, input: req.body });
  emitToMatch(req.params.matchId, 'poll-created', { poll });
  res.status(201).json({ success: true, data: { poll } });
});

export const patchTeamPoll = asyncHandler(async (req, res) => {
  const poll = await updatePoll({ teamId: ownedTeamId(req), matchId: req.params.matchId, pollId: req.params.pollId, input: req.body });
  emitToMatch(req.params.matchId, 'poll-updated', { poll });
  res.json({ success: true, data: { poll } });
});

export const openTeamPoll = asyncHandler(async (req, res) => {
  const poll = await openPoll({ teamId: ownedTeamId(req), matchId: req.params.matchId, pollId: req.params.pollId });
  emitToMatch(req.params.matchId, 'poll-opened', { poll });
  res.json({ success: true, data: { poll } });
});

export const closeTeamPoll = asyncHandler(async (req, res) => {
  const poll = await closePoll({ teamId: ownedTeamId(req), matchId: req.params.matchId, pollId: req.params.pollId });
  emitToMatch(req.params.matchId, 'poll-closed', { poll });
  res.json({ success: true, data: { poll } });
});

export const deleteTeamPoll = asyncHandler(async (req, res) => {
  const poll = await deletePoll({ teamId: ownedTeamId(req), matchId: req.params.matchId, pollId: req.params.pollId });
  emitToMatch(req.params.matchId, 'poll-closed', { poll });
  res.json({ success: true, data: { poll } });
});

export const getPublicPolls = asyncHandler(async (req, res) => {
  const polls = await listPublicPolls({ matchId: req.params.matchId });
  res.json({ success: true, data: { polls } });
});

export const votePublicPoll = asyncHandler(async (req, res) => {
  const poll = await votePoll({
    matchId: req.params.matchId,
    pollId: req.params.pollId,
    guestSessionId: req.body.guestSessionId,
    optionId: req.body.optionId,
  });
  emitToMatch(req.params.matchId, 'poll-voted', { poll });
  res.json({ success: true, data: { poll } });
});
