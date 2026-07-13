import assert from 'node:assert/strict';
import test from 'node:test';
import {
  createChatMessage,
  deleteChatMessage,
  getPublicAnnouncement,
  listChatMessages,
  removeAnnouncement,
  serializeChatMessage,
  upsertAnnouncement,
} from '../src/services/engagementService.js';

const ids = {
  match: '65f000000000000000000001',
  team: '65f000000000000000000002',
  user: '65f000000000000000000003',
  message: '65f000000000000000000004',
};

const matchDoc = (overrides = {}) => ({
  _id: ids.match,
  team: { _id: ids.team, isPublished: true, isArchived: false },
  status: 'live',
  isActive: true,
  ...overrides,
});

const matchModel = (match = matchDoc()) => ({
  findOne: () => ({
    populate: async () => match,
  }),
});

const chatDocument = (overrides = {}) => ({
  _id: ids.message,
  match: ids.match,
  guestSessionId: 'b0fd2df5-a5b0-4835-9d45-0922af722111',
  displayName: 'Guest',
  message: 'Hello',
  status: 'visible',
  visible: true,
  deleted: false,
  hidden: false,
  async save() { this.saved = true; return this; },
  toJSON() { return { ...this }; },
  ...overrides,
});

test('public chat creates sanitized messages only for live or half-time public matches', async () => {
  let created;
  const chatModel = {
    exists: async () => null,
    create: async (data) => { created = chatDocument(data); return created; },
  };
  const message = await createChatMessage({
    matchModel: matchModel(),
    chatModel,
    matchId: ids.match,
    input: {
      guestSessionId: 'b0fd2df5-a5b0-4835-9d45-0922af722111',
      displayName: '  <Fan>  ',
      message: '<b>Goal!</b>',
    },
  });
  assert.equal(created.displayName, '&lt;Fan&gt;');
  assert.equal(created.message, '&lt;b&gt;Goal!&lt;/b&gt;');
  assert.equal(message.guestSessionId, undefined);

  await assert.rejects(createChatMessage({
    matchModel: matchModel(matchDoc({ status: 'scheduled' })),
    chatModel,
    matchId: ids.match,
    input: { guestSessionId: 'b0fd2df5-a5b0-4835-9d45-0922af722111', displayName: 'Fan', message: 'Hi' },
  }), (error) => error.code === 'CHAT_NOT_OPEN');
});

test('chat listing returns latest visible messages without guest session identifiers', async () => {
  const chatModel = {
    find: () => ({
      sort: () => ({
        limit: () => ({
          lean: async () => [
            chatDocument({ _id: '65f000000000000000000006', createdAt: new Date('2030-01-01T10:01:00Z') }),
            chatDocument({ _id: '65f000000000000000000005', createdAt: new Date('2030-01-01T10:00:00Z') }),
          ],
        }),
      }),
    }),
  };
  const result = await listChatMessages({ matchModel: matchModel(), chatModel, matchId: ids.match });
  assert.equal(result.messages.length, 2);
  assert.equal(result.messages[0].guestSessionId, undefined);
});

test('team moderation soft deletes chat messages', async () => {
  const message = chatDocument();
  const chatModel = { findOne: async () => message };
  const result = await deleteChatMessage({
    matchModel: { findOne: async () => matchDoc({ team: ids.team }) },
    chatModel,
    teamId: ids.team,
    userId: ids.user,
    matchId: ids.match,
    messageId: ids.message,
  });
  assert.equal(message.visible, false);
  assert.equal(message.deleted, true);
  assert.equal(message.status, 'deleted');
  assert.equal(result.deletedBy, undefined);
});

test('announcement upsert remove and public read use safe fields', async () => {
  let stored = null;
  const announcementModel = {
    findOneAndUpdate: async (_filter, update) => {
      stored = { _id: '65f000000000000000000007', match: ids.match, team: ids.team, ...update.$set, toJSON() { return { ...this }; } };
      return stored;
    },
    findOne: () => ({
      sort: () => ({
        lean: async () => stored,
      }),
    }),
  };
  const saved = await upsertAnnouncement({
    announcementModel,
    matchModel: { findOne: async () => matchDoc({ team: ids.team }) },
    teamId: ids.team,
    userId: ids.user,
    matchId: ids.match,
    input: { message: '<strong>Kickoff soon</strong>' },
  });
  assert.equal(saved.message, '&lt;strong&gt;Kickoff soon&lt;/strong&gt;');
  assert.equal(saved.createdBy, undefined);

  const publicAnnouncement = await getPublicAnnouncement({ announcementModel, matchModel: matchModel(), matchId: ids.match });
  assert.equal(publicAnnouncement.createdBy, undefined);

  const removed = await removeAnnouncement({
    announcementModel,
    matchModel: { findOne: async () => matchDoc({ team: ids.team }) },
    teamId: ids.team,
    matchId: ids.match,
  });
  assert.equal(removed.isActive, false);
});

test('chat serializer never exposes guest session or moderator identity', () => {
  const message = serializeChatMessage(chatDocument({ deletedBy: ids.user }));
  assert.equal(message.guestSessionId, undefined);
  assert.equal(message.deletedBy, undefined);
});
