import { emitToTeam, emitToTeamAdminsCommunity } from '../realtime/realtimeHub.js';
import {
  createCommunityMessage,
  createDirectConversation,
  createDirectMessage,
  getTeamAdminChatUnreadCount,
  listAdminChatTeams,
  listCommunityMessages,
  listDirectConversations,
  listDirectMessages,
  markCommunityRead,
  markDirectRead,
} from '../services/teamChatService.js';
import asyncHandler from '../utils/asyncHandler.js';

export const getCommunityMessages = asyncHandler(async (req, res) => {
  const data = await listCommunityMessages({ user: req.user, before: req.query.before, limit: req.query.limit });
  res.json({ success: true, data });
});

export const postCommunityMessage = asyncHandler(async (req, res) => {
  const message = await createCommunityMessage({ user: req.user, input: req.body });
  emitToTeamAdminsCommunity('team-admin-chat:community-message', { message });
  res.status(201).json({ success: true, data: { message } });
});

export const postCommunityRead = asyncHandler(async (req, res) => {
  const data = await markCommunityRead({ user: req.user });
  res.json({ success: true, data });
});

export const getAdminChatTeams = asyncHandler(async (req, res) => {
  const data = await listAdminChatTeams({ user: req.user, query: req.query });
  res.json({ success: true, data });
});

export const getDirectConversations = asyncHandler(async (req, res) => {
  const data = await listDirectConversations({ user: req.user });
  res.json({ success: true, data });
});

export const postDirectConversation = asyncHandler(async (req, res) => {
  const data = await createDirectConversation({ user: req.user, input: req.body });
  res.status(201).json({ success: true, data });
});

export const getDirectMessages = asyncHandler(async (req, res) => {
  const data = await listDirectMessages({
    user: req.user,
    conversationId: req.params.conversationId,
    before: req.query.before,
    limit: req.query.limit,
  });
  res.json({ success: true, data });
});

export const postDirectMessage = asyncHandler(async (req, res) => {
  const data = await createDirectMessage({
    user: req.user,
    conversationId: req.params.conversationId,
    input: req.body,
  });
  for (const team of data.conversation.participantTeams || []) {
    emitToTeam(team.id, 'team-admin-chat:direct-message', {
      conversationId: data.conversation.id,
      conversation: data.conversation,
      message: data.message,
    });
  }
  res.status(201).json({ success: true, data: { message: data.message, conversation: data.conversation } });
});

export const postDirectRead = asyncHandler(async (req, res) => {
  const data = await markDirectRead({ user: req.user, conversationId: req.params.conversationId });
  res.json({ success: true, data });
});

export const getTeamAdminChatUnread = asyncHandler(async (req, res) => {
  const data = await getTeamAdminChatUnreadCount({ user: req.user });
  res.json({ success: true, data });
});
