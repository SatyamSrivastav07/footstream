import asyncHandler from '../utils/asyncHandler.js';
import { emitToMatch } from '../realtime/realtimeHub.js';
import {
  createChatMessage,
  deleteChatMessage,
  getAnnouncement,
  getPublicAnnouncement,
  listChatMessages,
  removeAnnouncement,
  upsertAnnouncement,
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
