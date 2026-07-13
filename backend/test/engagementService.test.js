import assert from 'node:assert/strict';
import test from 'node:test';
import {
  createChatMessage,
  createPoll,
  deleteChatMessage,
  getReactionCounts,
  getPublicAnnouncement,
  listChatMessages,
  listPublicPolls,
  openPoll,
  removeAnnouncement,
  serializeChatMessage,
  toggleReaction,
  upsertAnnouncement,
  votePoll,
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

test('chat moderation rejects configured blocked words', async () => {
  const chatModel = {
    exists: async () => null,
    create: async () => chatDocument(),
  };
  await assert.rejects(createChatMessage({
    matchModel: matchModel(),
    chatModel,
    matchId: ids.match,
    blockedWords: ['badword'],
    input: { guestSessionId: 'b0fd2df5-a5b0-4835-9d45-0922af722111', displayName: 'Fan', message: 'badword' },
  }), (error) => error.code === 'CHAT_BLOCKED_WORD');
});

test('reaction toggle creates removes and returns aggregate counts only', async () => {
  let stored = null;
  const reactionModel = {
    findOne: async () => stored,
    create: async (data) => { stored = { _id: '65f000000000000000000099', ...data }; return stored; },
    deleteOne: async () => { stored = null; },
    aggregate: async () => stored ? [{ _id: stored.reactionType, count: 1 }] : [],
  };
  const first = await toggleReaction({
    reactionModel,
    matchModel: matchModel(matchDoc({ status: 'completed' })),
    matchId: ids.match,
    reactionType: 'fire',
    guestSessionId: 'b0fd2df5-a5b0-4835-9d45-0922af722111',
  });
  assert.equal(first.selected, true);
  assert.equal(first.counts.fire, 1);
  assert.equal(first.guestSessionId, undefined);

  const second = await toggleReaction({
    reactionModel,
    matchModel: matchModel(matchDoc({ status: 'completed' })),
    matchId: ids.match,
    reactionType: 'fire',
    guestSessionId: 'b0fd2df5-a5b0-4835-9d45-0922af722111',
  });
  assert.equal(second.selected, false);
  assert.equal(second.counts.fire, 0);
});

test('reaction aggregation rejects scheduled or private matches', async () => {
  const reactionModel = { aggregate: async () => [{ _id: 'like', count: 3 }] };
  const counts = await getReactionCounts({ reactionModel, matchModel: matchModel(matchDoc({ status: 'half_time' })), matchId: ids.match });
  assert.equal(counts.like, 3);
  assert.equal(counts.heart, 0);

  await assert.rejects(getReactionCounts({
    reactionModel,
    matchModel: matchModel(matchDoc({ status: 'scheduled' })),
    matchId: ids.match,
  }), (error) => error.code === 'ENGAGEMENT_NOT_OPEN');
});

test('poll creation voting and one vote rule keep polls community-only', async () => {
  const pollId = '65f000000000000000000100';
  const optionOne = '65f000000000000000000101';
  const optionTwo = '65f000000000000000000102';
  const pollDoc = {
    _id: pollId,
    match: ids.match,
    team: ids.team,
    question: 'Who attacks better?',
    options: [{ _id: optionOne, text: 'Home' }, { _id: optionTwo, text: 'Away' }],
    status: 'draft',
    isDeleted: false,
    async save() { return this; },
    toJSON() { return { ...this }; },
  };
  const pollModel = {
    create: async (data) => ({ ...pollDoc, ...data, _id: pollId, options: data.options.map((option, index) => ({ _id: index === 0 ? optionOne : optionTwo, ...option })) }),
    findOne: async () => pollDoc,
    find: () => ({ sort: () => ({ lean: async () => [pollDoc] }) }),
  };
  const votes = [];
  const voteModel = {
    create: async (data) => {
      if (votes.some((vote) => vote.poll === data.poll && vote.guestSessionId === data.guestSessionId)) {
        const error = new Error('duplicate');
        error.code = 11000;
        throw error;
      }
      votes.push(data);
      return data;
    },
    aggregate: async () => votes.length ? [{ _id: { poll: pollId, optionId: optionOne }, count: votes.length }] : [],
  };

  const created = await createPoll({
    pollModel,
    matchModel: { findOne: async () => matchDoc({ team: ids.team }) },
    teamId: ids.team,
    userId: ids.user,
    matchId: ids.match,
    input: { question: '<b>Who attacks better?</b>', options: ['Home', 'Away'] },
  });
  assert.equal(created.createdBy, undefined);
  assert.equal(created.question, '&lt;b&gt;Who attacks better?&lt;/b&gt;');

  const opened = await openPoll({ pollModel, voteModel, matchModel: { findOne: async () => matchDoc({ team: ids.team }) }, teamId: ids.team, matchId: ids.match, pollId });
  assert.equal(opened.status, 'open');

  const voted = await votePoll({
    pollModel,
    voteModel,
    matchModel: matchModel(matchDoc({ status: 'live' })),
    matchId: ids.match,
    pollId,
    optionId: optionOne,
    guestSessionId: 'b0fd2df5-a5b0-4835-9d45-0922af722111',
  });
  assert.equal(voted.totalVotes, 1);
  assert.equal(voted.options[0].votes, 1);

  await assert.rejects(votePoll({
    pollModel,
    voteModel,
    matchModel: matchModel(matchDoc({ status: 'live' })),
    matchId: ids.match,
    pollId,
    optionId: optionTwo,
    guestSessionId: 'b0fd2df5-a5b0-4835-9d45-0922af722111',
  }), (error) => error.code === 'POLL_ALREADY_VOTED');

  const publicPolls = await listPublicPolls({ pollModel, voteModel, matchModel: matchModel(matchDoc({ status: 'completed' })), matchId: ids.match });
  assert.equal(publicPolls[0].createdBy, undefined);
});

test('poll creation rejects official awards ratings and statistics topics', async () => {
  const pollModel = { create: async () => ({}) };
  await assert.rejects(createPoll({
    pollModel,
    matchModel: { findOne: async () => matchDoc({ team: ids.team }) },
    teamId: ids.team,
    userId: ids.user,
    matchId: ids.match,
    input: { question: 'Official Man of the Match?', options: ['A', 'B'] },
  }), (error) => error.code === 'POLL_FORBIDDEN_TOPIC');
});
