import mongoose from 'mongoose';
import Team, { TEAM_STATUSES } from '../models/Team.js';
import TeamAdminChatReadState from '../models/TeamAdminChatReadState.js';
import TeamAdminConversation from '../models/TeamAdminConversation.js';
import TeamAdminMessage, { TEAM_ADMIN_CHAT_SCOPES } from '../models/TeamAdminMessage.js';
import { USER_ROLES } from '../models/User.js';
import AppError from '../utils/AppError.js';
import { assertTeamOperational } from './teamStatusTransitions.js';

const MAX_MESSAGE_LENGTH = 1000;
const COMMUNITY_ROOM_MEMBER_LABEL = 'Team admins';

const escapeText = (value) => String(value || '')
  .trim()
  .replace(/[<>&"']/g, (char) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;', "'": '&#39;' }[char]));

const idString = (value) => String(value?._id || value || '');
const toObjectId = (value) => mongoose.Types.ObjectId.isValid(value) ? new mongoose.Types.ObjectId(value) : value;

export const directConversationKey = (teamA, teamB) => [idString(teamA), idString(teamB)].sort().join(':');

const operationalTeamClauses = [
  { isArchived: { $ne: true } },
  {
    $or: [
      { status: TEAM_STATUSES.APPROVED },
      { status: { $exists: false } },
      { status: null },
      { status: '' },
    ],
  },
];

const buildOperationalTeamFilter = (...clauses) => ({
  $and: [
    ...operationalTeamClauses,
    ...clauses.filter(Boolean),
  ],
});

const normalizeTeam = (team) => {
  if (!team) return null;
  const raw = typeof team.toJSON === 'function' ? team.toJSON() : team;
  return {
    id: idString(raw._id || raw.id),
    name: raw.name || 'Team',
    shortName: raw.shortName || '',
    slug: raw.slug || '',
    logo: raw.logo || raw.logoUrl || '',
    city: raw.city || raw.location || '',
  };
};

export const assertTeamAdminChatUser = (user) => {
  if (!user?.isActive) throw new AppError('This account is unavailable.', 401, 'ACCOUNT_UNAVAILABLE');
  if (user.role !== USER_ROLES.TEAM_ADMIN || !user.team) {
    throw new AppError('Team admin chat is available only to assigned team administrators.', 403, 'TEAM_ADMIN_CHAT_FORBIDDEN');
  }
  assertTeamOperational(user.team);
  return user.team?._id || user.team;
};

const validateMessageInput = (input) => {
  const safeMessage = escapeText(input?.message);
  if (!safeMessage) throw new AppError('Message cannot be empty.', 400, 'TEAM_ADMIN_CHAT_MESSAGE_REQUIRED');
  if (safeMessage.length > MAX_MESSAGE_LENGTH) {
    throw new AppError(`Message must be ${MAX_MESSAGE_LENGTH} characters or less.`, 400, 'TEAM_ADMIN_CHAT_MESSAGE_TOO_LONG');
  }
  return safeMessage;
};

export const serializeTeamAdminMessage = (message) => {
  const data = typeof message?.toJSON === 'function' ? message.toJSON() : { ...message };
  const sender = data.sender && typeof data.sender === 'object'
    ? {
        id: idString(data.sender),
        name: data.sender.name || data.senderNameSnapshot || 'Team admin',
        role: data.sender.role || USER_ROLES.TEAM_ADMIN,
      }
    : { id: idString(data.sender), name: data.senderNameSnapshot || 'Team admin', role: USER_ROLES.TEAM_ADMIN };
  const team = data.team && typeof data.team === 'object'
    ? normalizeTeam(data.team)
    : {
        id: idString(data.team),
        name: data.senderTeamNameSnapshot || 'Team',
        shortName: '',
        slug: '',
        logo: '',
        city: '',
      };

  return {
    id: idString(data._id || data.id),
    scope: data.scope,
    conversationId: data.conversation ? idString(data.conversation) : null,
    message: data.message || '',
    sender,
    senderName: data.senderNameSnapshot || sender.name,
    senderTeam: team,
    senderTeamName: data.senderTeamNameSnapshot || team.name,
    createdAt: data.createdAt,
    updatedAt: data.updatedAt,
  };
};

export const serializeTeamAdminConversation = (conversation, ownTeamId) => {
  const data = typeof conversation?.toJSON === 'function' ? conversation.toJSON() : { ...conversation };
  const teams = (data.participantTeams || []).map(normalizeTeam).filter(Boolean);
  const ownId = idString(ownTeamId);
  const opponent = teams.find((team) => team.id !== ownId) || teams[0] || null;
  return {
    id: idString(data._id || data.id),
    opponent,
    participantTeams: teams,
    unreadCount: Number(data.unreadCount) || 0,
    lastMessageAt: data.lastMessageAt || data.updatedAt || null,
    createdAt: data.createdAt,
    updatedAt: data.updatedAt,
  };
};

const ensurePublicOperationalTeam = async ({ teamModel = Team, teamId, notTeamId }) => {
  if (!mongoose.Types.ObjectId.isValid(teamId)) throw new AppError('Team was not found.', 404, 'CHAT_TEAM_NOT_FOUND');
  if (idString(teamId) === idString(notTeamId)) throw new AppError('You cannot start an inter-team chat with your own team.', 400, 'CHAT_OWN_TEAM_NOT_ALLOWED');
  const team = await teamModel.findOne(buildOperationalTeamFilter({ _id: teamId })).select('name shortName slug logo city status isArchived isPublished').lean();
  if (!team) throw new AppError('Team was not found or is not available for admin chat.', 404, 'CHAT_TEAM_NOT_FOUND');
  return team;
};

const ensureConversationForTeam = async ({ conversationModel = TeamAdminConversation, conversationId, teamId }) => {
  if (!mongoose.Types.ObjectId.isValid(conversationId)) throw new AppError('Conversation was not found.', 404, 'CHAT_CONVERSATION_NOT_FOUND');
  const conversation = await conversationModel.findOne({ _id: conversationId, participantTeams: toObjectId(teamId) })
    .populate('participantTeams', 'name shortName slug logo city')
    .lean();
  if (!conversation) throw new AppError('Conversation was not found.', 404, 'CHAT_CONVERSATION_NOT_FOUND');
  return conversation;
};

const listMessages = async ({ messageModel, filter, before, limit }) => {
  const safeLimit = Math.min(Math.max(Number(limit) || 50, 1), 50);
  const messageFilter = { ...filter, visible: true, deletedAt: null };
  if (before) {
    const beforeDate = new Date(before);
    if (Number.isNaN(beforeDate.getTime())) throw new AppError('Invalid pagination cursor.', 400, 'CHAT_CURSOR_INVALID');
    messageFilter.createdAt = { $lt: beforeDate };
  }
  const messages = await messageModel.find(messageFilter)
    .populate('sender', 'name role')
    .populate('team', 'name shortName slug logo city')
    .sort({ createdAt: -1 })
    .limit(safeLimit)
    .lean();
  const ordered = messages.reverse().map(serializeTeamAdminMessage);
  return {
    messages: ordered,
    pagination: {
      before: ordered[0]?.createdAt || null,
      hasMore: messages.length === safeLimit,
    },
  };
};

export const listCommunityMessages = async ({ messageModel = TeamAdminMessage, user, before, limit = 50 }) => {
  assertTeamAdminChatUser(user);
  const data = await listMessages({
    messageModel,
    filter: { scope: TEAM_ADMIN_CHAT_SCOPES.COMMUNITY, conversation: null },
    before,
    limit,
  });
  return {
    ...data,
    room: {
      id: 'community',
      name: 'Team Admin Community',
      memberLabel: COMMUNITY_ROOM_MEMBER_LABEL,
    },
  };
};

export const createCommunityMessage = async ({ messageModel = TeamAdminMessage, user, input }) => {
  const teamId = assertTeamAdminChatUser(user);
  const message = validateMessageInput(input);
  const created = await messageModel.create({
    scope: TEAM_ADMIN_CHAT_SCOPES.COMMUNITY,
    conversation: null,
    team: teamId,
    sender: user._id,
    senderNameSnapshot: user.name || 'Team admin',
    senderTeamNameSnapshot: user.team?.name || 'Team',
    message,
  });
  return serializeTeamAdminMessage(created);
};

export const listAdminChatTeams = async ({ teamModel = Team, user, query = {} }) => {
  const ownTeamId = assertTeamAdminChatUser(user);
  const filter = buildOperationalTeamFilter({ _id: { $ne: toObjectId(ownTeamId) } });
  if (query.search) {
    const safe = String(query.search).trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    if (safe) {
      filter.$and.push({
        $or: [
          { name: { $regex: safe, $options: 'i' } },
          { shortName: { $regex: safe, $options: 'i' } },
          { city: { $regex: safe, $options: 'i' } },
          { location: { $regex: safe, $options: 'i' } },
          { organization: { $regex: safe, $options: 'i' } },
        ],
      });
    }
  }
  const limit = Math.min(Math.max(Number(query.limit) || 30, 1), 50);
  const teams = await teamModel.find(filter)
    .select('name shortName slug logo city')
    .sort({ name: 1 })
    .limit(limit)
    .lean();
  return { teams: teams.map(normalizeTeam) };
};

export const listDirectConversations = async ({
  conversationModel = TeamAdminConversation,
  messageModel = TeamAdminMessage,
  readStateModel = TeamAdminChatReadState,
  user,
}) => {
  const teamId = assertTeamAdminChatUser(user);
  const conversations = await conversationModel.find({ participantTeams: toObjectId(teamId) })
    .populate('participantTeams', 'name shortName slug logo city')
    .sort({ lastMessageAt: -1, updatedAt: -1 })
    .lean();
  const unreadCounts = await Promise.all(conversations.map((conversation) => countUnread({
    messageModel,
    readStateModel,
    user,
    teamId,
    scope: TEAM_ADMIN_CHAT_SCOPES.DIRECT,
    conversationId: conversation._id,
  })));
  return {
    conversations: conversations.map((conversation, index) => serializeTeamAdminConversation({
      ...conversation,
      unreadCount: unreadCounts[index],
    }, teamId)),
  };
};

export const createDirectConversation = async ({
  conversationModel = TeamAdminConversation,
  teamModel = Team,
  user,
  input,
}) => {
  const teamId = assertTeamAdminChatUser(user);
  const opponent = await ensurePublicOperationalTeam({ teamModel, teamId: input?.opponentTeamId, notTeamId: teamId });
  const key = directConversationKey(teamId, opponent._id);
  const conversation = await conversationModel.findOneAndUpdate(
    { conversationKey: key },
    {
      $setOnInsert: {
        participantTeams: [toObjectId(teamId), toObjectId(opponent._id)],
        conversationKey: key,
        createdBy: user._id,
      },
    },
    { upsert: true, new: true, setDefaultsOnInsert: true },
  ).populate('participantTeams', 'name shortName slug logo city');
  return { conversation: serializeTeamAdminConversation(conversation, teamId) };
};

export const listDirectMessages = async ({
  conversationModel = TeamAdminConversation,
  messageModel = TeamAdminMessage,
  user,
  conversationId,
  before,
  limit = 50,
}) => {
  const teamId = assertTeamAdminChatUser(user);
  const conversation = await ensureConversationForTeam({ conversationModel, conversationId, teamId });
  const data = await listMessages({
    messageModel,
    filter: { scope: TEAM_ADMIN_CHAT_SCOPES.DIRECT, conversation: conversation._id },
    before,
    limit,
  });
  return {
    ...data,
    conversation: serializeTeamAdminConversation(conversation, teamId),
  };
};

export const createDirectMessage = async ({
  conversationModel = TeamAdminConversation,
  messageModel = TeamAdminMessage,
  user,
  conversationId,
  input,
}) => {
  const teamId = assertTeamAdminChatUser(user);
  const conversation = await ensureConversationForTeam({ conversationModel, conversationId, teamId });
  const message = validateMessageInput(input);
  const created = await messageModel.create({
    scope: TEAM_ADMIN_CHAT_SCOPES.DIRECT,
    conversation: conversation._id,
    team: teamId,
    sender: user._id,
    senderNameSnapshot: user.name || 'Team admin',
    senderTeamNameSnapshot: user.team?.name || 'Team',
    message,
  });
  await conversationModel.updateOne({ _id: conversation._id }, { $set: { lastMessageAt: created.createdAt || new Date() } });
  return {
    message: serializeTeamAdminMessage(created),
    conversation: serializeTeamAdminConversation(conversation, teamId),
  };
};

const readStateFilter = ({ user, teamId, scope, conversationId = null }) => ({
  user: user._id,
  team: teamId,
  scope,
  conversation: conversationId ? toObjectId(conversationId) : null,
});

export const markCommunityRead = async ({ readStateModel = TeamAdminChatReadState, user, now = new Date() }) => {
  const teamId = assertTeamAdminChatUser(user);
  await readStateModel.findOneAndUpdate(
    readStateFilter({ user, teamId, scope: TEAM_ADMIN_CHAT_SCOPES.COMMUNITY }),
    { $set: { lastReadAt: now } },
    { upsert: true, new: true, setDefaultsOnInsert: true },
  );
  return { lastReadAt: now };
};

export const markDirectRead = async ({
  conversationModel = TeamAdminConversation,
  readStateModel = TeamAdminChatReadState,
  user,
  conversationId,
  now = new Date(),
}) => {
  const teamId = assertTeamAdminChatUser(user);
  await ensureConversationForTeam({ conversationModel, conversationId, teamId });
  await readStateModel.findOneAndUpdate(
    readStateFilter({ user, teamId, scope: TEAM_ADMIN_CHAT_SCOPES.DIRECT, conversationId }),
    { $set: { lastReadAt: now } },
    { upsert: true, new: true, setDefaultsOnInsert: true },
  );
  return { lastReadAt: now };
};

const countUnread = async ({ messageModel, readStateModel, user, teamId, scope, conversationId = null }) => {
  const state = await readStateModel.findOne(readStateFilter({ user, teamId, scope, conversationId })).lean();
  const filter = {
    scope,
    visible: true,
    deletedAt: null,
    sender: { $ne: toObjectId(user._id) },
  };
  if (conversationId) filter.conversation = toObjectId(conversationId);
  else filter.conversation = null;
  if (state?.lastReadAt) filter.createdAt = { $gt: state.lastReadAt };
  return messageModel.countDocuments(filter);
};

export const getTeamAdminChatUnreadCount = async ({
  conversationModel = TeamAdminConversation,
  messageModel = TeamAdminMessage,
  readStateModel = TeamAdminChatReadState,
  user,
}) => {
  const teamId = assertTeamAdminChatUser(user);
  const [community, conversations] = await Promise.all([
    countUnread({ messageModel, readStateModel, user, teamId, scope: TEAM_ADMIN_CHAT_SCOPES.COMMUNITY }),
    conversationModel.find({ participantTeams: toObjectId(teamId) }).select('_id').lean(),
  ]);
  const directCounts = await Promise.all(conversations.map((conversation) => countUnread({
    messageModel,
    readStateModel,
    user,
    teamId,
    scope: TEAM_ADMIN_CHAT_SCOPES.DIRECT,
    conversationId: conversation._id,
  })));
  const direct = directCounts.reduce((sum, count) => sum + count, 0);
  return { count: community + direct, community, direct };
};
