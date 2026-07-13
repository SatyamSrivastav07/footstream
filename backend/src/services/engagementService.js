import Match from '../models/Match.js';
import MatchAnnouncement from '../models/MatchAnnouncement.js';
import MatchChatMessage from '../models/MatchChatMessage.js';
import MatchPoll from '../models/MatchPoll.js';
import MatchPollVote from '../models/MatchPollVote.js';
import MatchReaction, { REACTION_TYPES } from '../models/MatchReaction.js';
import env from '../config/env.js';
import AppError from '../utils/AppError.js';
import mongoose from 'mongoose';

const LIVE_CHAT_STATUSES = new Set(['live', 'half_time']);
const PUBLIC_REACTION_STATUSES = new Set(['live', 'half_time', 'completed']);
const FORBIDDEN_POLL_PATTERN = /\b(motm|man\s*of\s*the\s*match|player\s*ratings?|rating|official\s+award|official\s+awards?|statistics?|stats?|player\s*stats?)\b/i;
const escapeText = (value) => String(value || '')
  .trim()
  .replace(/[<>&"']/g, (char) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;', "'": '&#39;' }[char]));

export const sanitizeDisplayName = (value) => escapeText(value).slice(0, 30);
export const sanitizeMessage = (value, max = 300) => escapeText(value).slice(0, max);
export const supportedReactionTypes = REACTION_TYPES;

const toObjectId = (value) => mongoose.Types.ObjectId.isValid(value) ? new mongoose.Types.ObjectId(value) : value;

const containsBlockedWord = (value, blockedWords = env.moderation.blockedChatWords) => {
  const normalized = String(value || '').toLowerCase();
  return blockedWords.find((word) => word && new RegExp(`(^|\\W)${word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(\\W|$)`, 'i').test(normalized));
};

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

const publicEngagementMatch = async ({ matchModel = Match, matchId, allowedStatuses = PUBLIC_REACTION_STATUSES, message = 'This engagement is not available for this match.' }) => {
  const match = await matchModel.findOne({ _id: matchId, isActive: true }).populate('team', 'name isPublished isArchived');
  if (!match || !match.team?.isPublished || match.team?.isArchived) throw new AppError('Match not found.', 404, 'MATCH_NOT_FOUND');
  if (!allowedStatuses.has(match.status)) throw new AppError(message, 409, 'ENGAGEMENT_NOT_OPEN');
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

export const createChatMessage = async ({ chatModel = MatchChatMessage, matchModel = Match, matchId, input, blockedWords = env.moderation.blockedChatWords }) => {
  await publicLiveMatch({ matchModel, matchId });
  const displayName = sanitizeDisplayName(input.displayName);
  const message = sanitizeMessage(input.message);
  if (displayName.length < 2) throw new AppError('Display name must be 2 to 30 characters.', 400, 'DISPLAY_NAME_INVALID');
  if (message.length < 1 || message.length > 300) throw new AppError('Message must be 1 to 300 characters.', 400, 'CHAT_MESSAGE_INVALID');
  const blockedWord = containsBlockedWord(message, blockedWords);
  if (blockedWord) throw new AppError('Message contains blocked language.', 400, 'CHAT_BLOCKED_WORD');
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

export const emptyReactionCounts = () => Object.fromEntries(REACTION_TYPES.map((type) => [type, 0]));

export const getReactionCounts = async ({ reactionModel = MatchReaction, matchModel = Match, matchId }) => {
  await publicEngagementMatch({ matchModel, matchId });
  const rows = await reactionModel.aggregate([
    { $match: { match: toObjectId(matchId) } },
    { $group: { _id: '$reactionType', count: { $sum: 1 } } },
  ]);
  const counts = emptyReactionCounts();
  rows.forEach((row) => {
    if (REACTION_TYPES.includes(row._id)) counts[row._id] = row.count;
  });
  return counts;
};

export const toggleReaction = async ({ reactionModel = MatchReaction, matchModel = Match, matchId, reactionType, guestSessionId }) => {
  if (!REACTION_TYPES.includes(reactionType)) throw new AppError('Unsupported reaction.', 400, 'REACTION_INVALID');
  await publicEngagementMatch({ matchModel, matchId });
  const existing = await reactionModel.findOne({ match: matchId, guestSessionId, reactionType });
  let selected = false;
  if (existing) {
    await reactionModel.deleteOne({ _id: existing._id });
  } else {
    await reactionModel.create({ match: matchId, guestSessionId, reactionType });
    selected = true;
  }
  const counts = await getReactionCounts({ reactionModel, matchModel, matchId });
  return { counts, selected };
};

const serializePoll = (poll, voteCounts = new Map()) => {
  if (!poll) return null;
  const data = typeof poll?.toJSON === 'function' ? poll.toJSON() : { ...poll };
  delete data.createdBy;
  const options = (data.options || []).map((option) => {
    const optionId = String(option._id);
    return {
      _id: option._id,
      text: option.text,
      votes: voteCounts.get(optionId) || 0,
    };
  });
  const totalVotes = options.reduce((sum, option) => sum + option.votes, 0);
  return { ...data, options, totalVotes };
};

const voteCountMap = async ({ voteModel = MatchPollVote, pollIds }) => {
  if (!pollIds.length) return new Map();
  const rows = await voteModel.aggregate([
    { $match: { poll: { $in: pollIds.map(toObjectId) } } },
    { $group: { _id: { poll: '$poll', optionId: '$optionId' }, count: { $sum: 1 } } },
  ]);
  const map = new Map();
  rows.forEach((row) => {
    map.set(`${row._id.poll}:${row._id.optionId}`, row.count);
  });
  return map;
};

const ensureCommunityPoll = ({ question, options }) => {
  const combined = [question, ...(options || [])].join(' ');
  if (FORBIDDEN_POLL_PATTERN.test(combined)) {
    throw new AppError('Community polls cannot ask for official awards, ratings, or statistic-changing outcomes.', 400, 'POLL_FORBIDDEN_TOPIC');
  }
};

export const listTeamPolls = async ({ pollModel = MatchPoll, voteModel = MatchPollVote, matchModel = Match, teamId, matchId }) => {
  await ownedMatch({ matchModel, teamId, matchId });
  const polls = await pollModel.find({ match: matchId, isDeleted: false }).sort({ createdAt: -1 }).lean();
  const pollIds = polls.map((poll) => poll._id);
  const counts = await voteCountMap({ voteModel, pollIds });
  return polls.map((poll) => {
    const optionCounts = new Map((poll.options || []).map((option) => [String(option._id), counts.get(`${poll._id}:${option._id}`) || 0]));
    return serializePoll(poll, optionCounts);
  });
};

export const listPublicPolls = async ({ pollModel = MatchPoll, voteModel = MatchPollVote, matchModel = Match, matchId }) => {
  await publicEngagementMatch({ matchModel, matchId, allowedStatuses: PUBLIC_REACTION_STATUSES, message: 'Polls are not available for this match.' });
  const polls = await pollModel.find({ match: matchId, isDeleted: false, status: { $in: ['open', 'closed'] } }).sort({ createdAt: -1 }).lean();
  const pollIds = polls.map((poll) => poll._id);
  const counts = await voteCountMap({ voteModel, pollIds });
  return polls.map((poll) => {
    const optionCounts = new Map((poll.options || []).map((option) => [String(option._id), counts.get(`${poll._id}:${option._id}`) || 0]));
    return serializePoll(poll, optionCounts);
  });
};

export const createPoll = async ({ pollModel = MatchPoll, matchModel = Match, teamId, userId, matchId, input }) => {
  const match = await ownedMatch({ matchModel, teamId, matchId });
  const question = sanitizeMessage(input.question, 160);
  const options = (input.options || []).map((option) => sanitizeMessage(option, 80)).filter(Boolean);
  if (!question) throw new AppError('Poll question is required.', 400, 'POLL_QUESTION_REQUIRED');
  if (options.length < 2 || options.length > 6) throw new AppError('Polls must include 2 to 6 options.', 400, 'POLL_OPTIONS_INVALID');
  if (new Set(options.map((option) => option.toLowerCase())).size !== options.length) throw new AppError('Poll options must be unique.', 400, 'POLL_OPTIONS_DUPLICATE');
  ensureCommunityPoll({ question, options });
  const poll = await pollModel.create({
    match: matchId,
    team: match.team,
    question,
    options: options.map((text) => ({ text })),
    createdBy: userId,
  });
  return serializePoll(poll);
};

export const updatePoll = async ({ pollModel = MatchPoll, voteModel = MatchPollVote, matchModel = Match, teamId, matchId, pollId, input }) => {
  await ownedMatch({ matchModel, teamId, matchId });
  const poll = await pollModel.findOne({ _id: pollId, match: matchId, isDeleted: false });
  if (!poll) throw new AppError('Poll not found.', 404, 'POLL_NOT_FOUND');
  if (poll.status !== 'draft') throw new AppError('Only draft polls can be edited.', 409, 'POLL_NOT_EDITABLE');
  const question = sanitizeMessage(input.question, 160);
  const options = (input.options || []).map((option) => sanitizeMessage(option, 80)).filter(Boolean);
  if (!question || options.length < 2 || options.length > 6) throw new AppError('Poll question and 2 to 6 options are required.', 400, 'POLL_INVALID');
  if (new Set(options.map((option) => option.toLowerCase())).size !== options.length) throw new AppError('Poll options must be unique.', 400, 'POLL_OPTIONS_DUPLICATE');
  ensureCommunityPoll({ question, options });
  poll.question = question;
  poll.options = options.map((text) => ({ text }));
  await poll.save();
  const counts = await voteCountMap({ voteModel, pollIds: [poll._id] });
  const optionCounts = new Map((poll.options || []).map((option) => [String(option._id), counts.get(`${poll._id}:${option._id}`) || 0]));
  return serializePoll(poll, optionCounts);
};

export const openPoll = async ({ pollModel = MatchPoll, voteModel = MatchPollVote, matchModel = Match, teamId, matchId, pollId, now = new Date() }) => {
  await ownedMatch({ matchModel, teamId, matchId });
  const poll = await pollModel.findOne({ _id: pollId, match: matchId, isDeleted: false });
  if (!poll) throw new AppError('Poll not found.', 404, 'POLL_NOT_FOUND');
  if (poll.status !== 'draft' && poll.status !== 'closed') throw new AppError('Poll is already open.', 409, 'POLL_ALREADY_OPEN');
  poll.status = 'open';
  poll.openedAt = now;
  poll.closedAt = null;
  await poll.save();
  const counts = await voteCountMap({ voteModel, pollIds: [poll._id] });
  const optionCounts = new Map((poll.options || []).map((option) => [String(option._id), counts.get(`${poll._id}:${option._id}`) || 0]));
  return serializePoll(poll, optionCounts);
};

export const closePoll = async ({ pollModel = MatchPoll, voteModel = MatchPollVote, matchModel = Match, teamId, matchId, pollId, now = new Date() }) => {
  await ownedMatch({ matchModel, teamId, matchId });
  const poll = await pollModel.findOne({ _id: pollId, match: matchId, isDeleted: false });
  if (!poll) throw new AppError('Poll not found.', 404, 'POLL_NOT_FOUND');
  if (poll.status !== 'open') throw new AppError('Only open polls can be closed.', 409, 'POLL_NOT_OPEN');
  poll.status = 'closed';
  poll.closedAt = now;
  await poll.save();
  const counts = await voteCountMap({ voteModel, pollIds: [poll._id] });
  const optionCounts = new Map((poll.options || []).map((option) => [String(option._id), counts.get(`${poll._id}:${option._id}`) || 0]));
  return serializePoll(poll, optionCounts);
};

export const deletePoll = async ({ pollModel = MatchPoll, matchModel = Match, teamId, matchId, pollId }) => {
  await ownedMatch({ matchModel, teamId, matchId });
  const poll = await pollModel.findOneAndUpdate({ _id: pollId, match: matchId, isDeleted: false }, { $set: { isDeleted: true, status: 'closed', closedAt: new Date() } }, { new: true });
  if (!poll) throw new AppError('Poll not found.', 404, 'POLL_NOT_FOUND');
  return serializePoll(poll);
};

export const votePoll = async ({ pollModel = MatchPoll, voteModel = MatchPollVote, matchModel = Match, matchId, pollId, guestSessionId, optionId }) => {
  await publicEngagementMatch({ matchModel, matchId, allowedStatuses: PUBLIC_REACTION_STATUSES, message: 'Polls are not available for this match.' });
  const poll = await pollModel.findOne({ _id: pollId, match: matchId, isDeleted: false });
  if (!poll) throw new AppError('Poll not found.', 404, 'POLL_NOT_FOUND');
  if (poll.status !== 'open') throw new AppError('Poll is closed.', 409, 'POLL_CLOSED');
  const optionExists = poll.options.some((option) => String(option._id) === String(optionId));
  if (!optionExists) throw new AppError('Invalid poll option.', 400, 'POLL_OPTION_INVALID');
  try {
    await voteModel.create({ match: matchId, poll: pollId, optionId, guestSessionId });
  } catch (error) {
    if (error?.code === 11000) throw new AppError('You have already voted in this poll.', 409, 'POLL_ALREADY_VOTED');
    throw error;
  }
  const counts = await voteCountMap({ voteModel, pollIds: [poll._id] });
  const optionCounts = new Map((poll.options || []).map((option) => [String(option._id), counts.get(`${poll._id}:${option._id}`) || 0]));
  return serializePoll(poll, optionCounts);
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
