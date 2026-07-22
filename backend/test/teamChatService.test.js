import assert from 'node:assert/strict';
import test from 'node:test';
import {
  createCommunityMessage,
  createDirectConversation,
  createDirectMessage,
  directConversationKey,
  getTeamAdminChatUnreadCount,
  listAdminChatTeams,
  listCommunityMessages,
  listDirectConversations,
  markCommunityRead,
  serializeTeamAdminConversation,
  serializeTeamAdminMessage,
} from '../src/services/teamChatService.js';
import { TEAM_ADMIN_CHAT_SCOPES } from '../src/models/TeamAdminMessage.js';

const ownTeamId = '64b000000000000000000001';
const otherTeamId = '64b000000000000000000002';
const conversationId = '64b000000000000000000003';

const user = {
  _id: '64b0000000000000000000aa',
  id: '64b0000000000000000000aa',
  name: 'Satyam Admin',
  role: 'teamAdmin',
  isActive: true,
  team: { _id: ownTeamId, name: 'FC KIET', status: 'approved', isArchived: false },
};

const findClause = (filter, predicate) => filter.$and.find(predicate);

test('serializes admin chat messages without private account data', () => {
  const message = serializeTeamAdminMessage({
    _id: 'msg-1',
    scope: TEAM_ADMIN_CHAT_SCOPES.COMMUNITY,
    conversation: null,
    team: { _id: ownTeamId, name: 'FC KIET', logo: 'logo.png', city: 'Ghaziabad' },
    sender: { _id: user._id, name: 'Satyam Admin', role: 'teamAdmin', email: 'hidden@example.com' },
    senderNameSnapshot: 'Satyam Admin',
    senderTeamNameSnapshot: 'FC KIET',
    message: 'Hello admins',
    createdAt: '2030-01-01T10:00:00Z',
    __v: 0,
  });

  assert.equal(message.sender.name, 'Satyam Admin');
  assert.equal(message.sender.email, undefined);
  assert.equal(message.senderTeam.name, 'FC KIET');
  assert.equal(message.message, 'Hello admins');
  assert.equal(message.conversationId, null);
});

test('community message sanitizes text and requires assigned active team admin', async () => {
  const createdPayloads = [];
  const messageModel = {
    create: async (payload) => {
      createdPayloads.push(payload);
      return { ...payload, _id: 'msg-2', createdAt: '2030-01-01T10:00:00Z' };
    },
  };

  const message = await createCommunityMessage({ messageModel, user, input: { message: '  <b>Hello</b>  ' } });
  assert.equal(message.message, '&lt;b&gt;Hello&lt;/b&gt;');
  assert.equal(createdPayloads[0].scope, TEAM_ADMIN_CHAT_SCOPES.COMMUNITY);
  assert.equal(createdPayloads[0].team, ownTeamId);

  await assert.rejects(
    () => createCommunityMessage({ messageModel, user: null, input: { message: 'Hi' } }),
    /This account is unavailable/,
  );
  await assert.rejects(
    () => createCommunityMessage({ messageModel, user: { ...user, isActive: false }, input: { message: 'Hi' } }),
    /This account is unavailable/,
  );
  await assert.rejects(
    () => createCommunityMessage({ messageModel, user: { ...user, role: 'superAdmin' }, input: { message: 'Hi' } }),
    /Team admin chat is available only/,
  );
});

test('lists community messages with pagination', async () => {
  const messageModel = {
    find: (filter) => ({
      populate: () => ({
        populate: () => ({
          sort: () => ({
            limit: () => ({
              lean: async () => [
                { _id: 'msg-new', scope: TEAM_ADMIN_CHAT_SCOPES.COMMUNITY, team: ownTeamId, sender: user._id, senderNameSnapshot: 'A', senderTeamNameSnapshot: 'FC KIET', message: 'New', createdAt: '2030-01-02T00:00:00Z' },
                { _id: 'msg-old', scope: TEAM_ADMIN_CHAT_SCOPES.COMMUNITY, team: ownTeamId, sender: user._id, senderNameSnapshot: 'A', senderTeamNameSnapshot: 'FC KIET', message: 'Old', createdAt: '2030-01-01T00:00:00Z' },
              ],
            }),
          }),
        }),
      }),
      filter,
    }),
  };

  const data = await listCommunityMessages({ messageModel, user, limit: 2 });
  assert.deepEqual(data.messages.map((message) => message.message), ['Old', 'New']);
  assert.equal(data.pagination.hasMore, true);
  assert.equal(data.room.name, 'Team Admin Community');
});

test('available admin chat teams includes approved registered teams even when public profile is unpublished', async () => {
  let capturedFilter;
  const teamModel = {
    find: (filter) => {
      capturedFilter = filter;
      return {
        select: () => ({
          sort: () => ({
            limit: () => ({
              lean: async () => [{ _id: otherTeamId, name: 'IMS FC', slug: 'ims-fc', isPublished: false, status: 'approved', isArchived: false }],
            }),
          }),
        }),
      };
    },
  };

  const data = await listAdminChatTeams({ teamModel, user, query: { search: 'IMS' } });
  assert.equal(data.teams[0].name, 'IMS FC');
  assert.equal(String(findClause(capturedFilter, (clause) => clause._id?.$ne)._id.$ne), ownTeamId);
  assert.equal(capturedFilter.isPublished, undefined);
  assert.ok(findClause(capturedFilter, (clause) => clause.$or?.some((item) => item.status === 'approved')));
  assert.equal(findClause(capturedFilter, (clause) => clause.$or?.some((item) => item.shortName))?.$or.length, 5);
});

test('available admin chat teams includes legacy operational teams with missing status', async () => {
  let capturedFilter;
  const teamModel = {
    find: (filter) => {
      capturedFilter = filter;
      return {
        select: () => ({
          sort: () => ({
            limit: () => ({
              lean: async () => [{ _id: otherTeamId, name: 'ABES ENGINEERING COLLEGE', slug: 'abes-engineering-college', isPublished: true, isArchived: false }],
            }),
          }),
        }),
      };
    },
  };

  const data = await listAdminChatTeams({ teamModel, user, query: { search: 'ABES' } });
  const statusClause = findClause(capturedFilter, (clause) => clause.$or?.some((item) => item.status === 'approved'));
  assert.equal(data.teams[0].name, 'ABES ENGINEERING COLLEGE');
  assert.ok(statusClause.$or.some((item) => item.status?.$exists === false));
  assert.ok(statusClause.$or.some((item) => item.status === null));
  assert.ok(statusClause.$or.some((item) => item.status === ''));
});

test('direct conversation uses deterministic key and cannot target own team', async () => {
  let capturedTargetFilter;
  const teamModel = {
    findOne: (filter) => ({
      get filter() {
        return filter;
      },
      select: () => ({
        lean: async () => {
          capturedTargetFilter = filter;
          return { _id: otherTeamId, name: 'IMS FC', isPublished: false, isArchived: false };
        },
      }),
    }),
  };
  const conversationModel = {
    findOneAndUpdate: (filter, update) => ({
      populate: async () => ({
        _id: conversationId,
        ...update.$setOnInsert,
        conversationKey: filter.conversationKey,
        participantTeams: [
          { _id: ownTeamId, name: 'FC KIET' },
          { _id: otherTeamId, name: 'IMS FC' },
        ],
      }),
    }),
  };

  const data = await createDirectConversation({ conversationModel, teamModel, user, input: { opponentTeamId: otherTeamId } });
  assert.equal(data.conversation.opponent.name, 'IMS FC');
  assert.equal(directConversationKey(otherTeamId, ownTeamId), `${ownTeamId}:${otherTeamId}`);
  assert.ok(findClause(capturedTargetFilter, (clause) => clause.$or?.some((item) => item.status?.$exists === false)));

  await assert.rejects(
    () => createDirectConversation({ conversationModel, teamModel, user, input: { opponentTeamId: ownTeamId } }),
    /own team/,
  );
});

test('direct message requires the current team to be in the conversation', async () => {
  const conversationModel = {
    findOne: () => ({
      populate: () => ({
        lean: async () => ({
          _id: conversationId,
          participantTeams: [
            { _id: ownTeamId, name: 'FC KIET' },
            { _id: otherTeamId, name: 'IMS FC' },
          ],
        }),
      }),
    }),
    updateOne: async () => ({}),
  };
  const messageModel = {
    create: async (payload) => ({ ...payload, _id: 'msg-direct', createdAt: '2030-01-01T10:00:00Z' }),
  };

  const data = await createDirectMessage({ conversationModel, messageModel, user, conversationId, input: { message: 'Friendly this weekend?' } });
  assert.equal(data.message.scope, TEAM_ADMIN_CHAT_SCOPES.DIRECT);
  assert.equal(data.message.conversationId, conversationId);
  assert.equal(data.conversation.opponent.name, 'IMS FC');
});

test('direct conversation list includes per-team unread counts for row badges', async () => {
  const readStateModel = {
    findOne: () => ({
      lean: async () => ({ lastReadAt: new Date('2030-01-01T00:00:00Z') }),
    }),
  };
  const countFilters = [];
  const messageModel = {
    countDocuments: async (filter) => {
      countFilters.push(filter);
      return 2;
    },
  };
  const conversationModel = {
    find: () => ({
      populate: () => ({
        sort: () => ({
          lean: async () => [{
            _id: conversationId,
            participantTeams: [
              { _id: ownTeamId, name: 'FC KIET' },
              { _id: otherTeamId, name: 'IMS FC' },
            ],
            lastMessageAt: '2030-01-01T10:00:00Z',
          }],
        }),
      }),
    }),
  };

  const data = await listDirectConversations({ conversationModel, messageModel, readStateModel, user });
  assert.equal(data.conversations[0].opponent.name, 'IMS FC');
  assert.equal(data.conversations[0].unreadCount, 2);
  assert.equal(String(countFilters[0].conversation), conversationId);
  assert.equal(countFilters[0].scope, TEAM_ADMIN_CHAT_SCOPES.DIRECT);
});

test('unread count combines community and direct messages', async () => {
  const readStateModel = { findOne: () => ({ lean: async () => ({ lastReadAt: new Date('2030-01-01T00:00:00Z') }) }) };
  const conversationModel = { find: () => ({ select: () => ({ lean: async () => [{ _id: conversationId }] }) }) };
  const scopes = [];
  const messageModel = {
    countDocuments: async (filter) => {
      scopes.push(filter.scope);
      return filter.scope === TEAM_ADMIN_CHAT_SCOPES.COMMUNITY ? 2 : 3;
    },
  };

  const data = await getTeamAdminChatUnreadCount({ conversationModel, messageModel, readStateModel, user });
  assert.deepEqual(scopes, [TEAM_ADMIN_CHAT_SCOPES.COMMUNITY, TEAM_ADMIN_CHAT_SCOPES.DIRECT]);
  assert.equal(data.community, 2);
  assert.equal(data.direct, 3);
  assert.equal(data.count, 5);
});

test('mark community read upserts team-specific read state', async () => {
  let capturedFilter;
  const readStateModel = {
    findOneAndUpdate: async (filter) => {
      capturedFilter = filter;
      return {};
    },
  };
  await markCommunityRead({ readStateModel, user, now: new Date('2030-01-01T00:00:00Z') });
  assert.equal(capturedFilter.scope, TEAM_ADMIN_CHAT_SCOPES.COMMUNITY);
  assert.equal(capturedFilter.conversation, null);
  assert.equal(capturedFilter.team, ownTeamId);
});

test('conversation serializer returns the opponent from current admin perspective', () => {
  const conversation = serializeTeamAdminConversation({
    _id: conversationId,
    participantTeams: [
      { _id: ownTeamId, name: 'FC KIET' },
      { _id: otherTeamId, name: 'IMS FC' },
    ],
    lastMessageAt: '2030-01-01T10:00:00Z',
  }, ownTeamId);

  assert.equal(conversation.opponent.name, 'IMS FC');
  assert.equal(conversation.participantTeams.length, 2);
});
