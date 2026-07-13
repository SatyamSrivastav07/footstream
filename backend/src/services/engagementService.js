import Match from '../models/Match.js';
import MatchAnnouncement from '../models/MatchAnnouncement.js';
import MatchChatMessage from '../models/MatchChatMessage.js';
import AppError from '../utils/AppError.js';

const LIVE_CHAT_STATUSES = new Set(['live', 'half_time']);
const escapeText = (value) => String(value || '')
  .trim()
  .replace(/[<>&"']/g, (char) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;', "'": '&#39;' }[char]));

export const sanitizeDisplayName = (value) => escapeText(value).slice(0, 30);
export const sanitizeMessage = (value, max = 300) => escapeText(value).slice(0, max);

export const serializeChatMessage = (message) => {
  const data = typeof message?.toJSON === 'function' ? message.toJSON() : { ...message };
  delete data.guestSessionId;
  delete data.deletedBy;
  return data;
};

export const serializeAnnouncement = (announcement) => {
  if (!announcement) return null;
  const data = typeof announcement?.toJSON === 'function' ? announcement.toJSON() : { ...announcement };
  delete data.createdBy;
  return data;
};

const publicLiveMatch = async ({ matchModel = Match, matchId }) => {
  const match = await matchModel.findOne({ _id: matchId, isActive: true }).populate('team', 'name isPublished isArchived');
  if (!match || !match.team?.isPublished || match.team?.isArchived) throw new AppError('Live chat is not available for this match.', 404, 'MATCH_NOT_FOUND');
  if (!LIVE_CHAT_STATUSES.has(match.status)) throw new AppError('Chat is available only while a match is live or at half time.', 409, 'CHAT_NOT_OPEN');
  return match;
};

const ownedMatch = async ({ matchModel = Match, teamId, matchId }) => {
  const match = await matchModel.findOne({ _id: matchId, team: teamId, isActive: true });
  if (!match) throw new AppError('Match not found.', 404, 'MATCH_NOT_FOUND');
  return match;
};

export const listChatMessages = async ({ chatModel = MatchChatMessage, matchModel = Match, matchId, before, limit = 30 }) => {
  await publicLiveMatch({ matchModel, matchId });
  const filter = { match: matchId, visible: true, deleted: false, hidden: false, status: 'visible' };
  if (before) filter.createdAt = { $lt: new Date(before) };
  const messages = await chatModel.find(filter).sort({ createdAt: -1 }).limit(Math.min(Math.max(Number(limit) || 30, 1), 30)).lean();
  const ordered = messages.reverse().map(serializeChatMessage);
  return { messages: ordered, pagination: { before: ordered[0]?.createdAt || null, hasMore: messages.length === 30 } };
};

export const createChatMessage = async ({ chatModel = MatchChatMessage, matchModel = Match, matchId, input }) => {
  await publicLiveMatch({ matchModel, matchId });
  const displayName = sanitizeDisplayName(input.displayName);
  const message = sanitizeMessage(input.message);
  if (displayName.length < 2) throw new AppError('Display name must be 2 to 30 characters.', 400, 'DISPLAY_NAME_INVALID');
  if (message.length < 1 || message.length > 300) throw new AppError('Message must be 1 to 300 characters.', 400, 'CHAT_MESSAGE_INVALID');
  const recentDuplicate = await chatModel.exists({
    match: matchId,
    guestSessionId: input.guestSessionId,
    message,
    createdAt: { $gte: new Date(Date.now() - 10_000) },
  });
  if (recentDuplicate) throw new AppError('Please avoid repeating the same message.', 429, 'CHAT_SPAM_DETECTED');
  const created = await chatModel.create({
    match: matchId,
    guestSessionId: input.guestSessionId,
    displayName,
    message,
  });
  return serializeChatMessage(created);
};

export const deleteChatMessage = async ({ chatModel = MatchChatMessage, matchModel = Match, teamId, userId, matchId, messageId, now = new Date() }) => {
  await ownedMatch({ matchModel, teamId, matchId });
  const message = await chatModel.findOne({ _id: messageId, match: matchId });
  if (!message) throw new AppError('Chat message not found.', 404, 'CHAT_MESSAGE_NOT_FOUND');
  message.status = 'deleted';
  message.visible = false;
  message.deleted = true;
  message.hidden = false;
  message.deletedBy = userId;
  message.deletedAt = now;
  await message.save();
  return serializeChatMessage(message);
};

export const getAnnouncement = async ({ announcementModel = MatchAnnouncement, matchId }) => {
  const announcement = await announcementModel.findOne({ match: matchId, isActive: true }).sort({ updatedAt: -1 }).lean();
  return serializeAnnouncement(announcement);
};

export const getPublicAnnouncement = async ({ matchModel = Match, announcementModel = MatchAnnouncement, matchId }) => {
  const match = await matchModel.findOne({ _id: matchId, isActive: true }).populate('team', 'isPublished isArchived');
  if (!match || !match.team?.isPublished || match.team?.isArchived) throw new AppError('Match not found.', 404, 'MATCH_NOT_FOUND');
  return getAnnouncement({ announcementModel, matchId });
};

export const upsertAnnouncement = async ({ announcementModel = MatchAnnouncement, matchModel = Match, teamId, userId, matchId, input }) => {
  const match = await ownedMatch({ matchModel, teamId, matchId });
  const message = sanitizeMessage(input.message, 240);
  if (!message) throw new AppError('Announcement message is required.', 400, 'ANNOUNCEMENT_REQUIRED');
  const announcement = await announcementModel.findOneAndUpdate(
    { match: matchId, isActive: true },
    { $set: { team: match.team, message, createdBy: userId, isActive: true } },
    { new: true, upsert: true, runValidators: true },
  );
  return serializeAnnouncement(announcement);
};

export const removeAnnouncement = async ({ announcementModel = MatchAnnouncement, matchModel = Match, teamId, matchId }) => {
  await ownedMatch({ matchModel, teamId, matchId });
  const announcement = await announcementModel.findOneAndUpdate(
    { match: matchId, isActive: true },
    { $set: { isActive: false } },
    { new: true },
  );
  return serializeAnnouncement(announcement);
};
