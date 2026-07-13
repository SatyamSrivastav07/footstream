import assert from 'node:assert/strict';
import test from 'node:test';
import {
  followTeam,
  getFollowStatus,
  subscribePush,
  unfollowTeam,
  updateFollowPreferences,
  validateSubscription,
} from '../src/services/followService.js';
import {
  deliverToFollowers,
  fullTimeBody,
  goalBody,
  halfTimeBody,
  matchStartedBody,
  reminderBody,
  resultPublishedBody,
  serializePushPayload,
} from '../src/services/pushService.js';
import { followStatusValidator } from '../src/validators/followValidators.js';
import { validationResult } from 'express-validator';

const teamA = { _id: '65f100000000000000000001', slug: 'fc-kiet', isPublished: true, isArchived: false };
const teamB = { _id: '65f100000000000000000002', slug: 'ims', isPublished: true, isArchived: false };
const followerSessionId = 'b0fd2df5-a5b0-4835-9d45-0922af722111';

const teamModel = (team = teamA) => ({ findOne: async () => team });

const createFollowStore = () => {
  const rows = [];
  const model = {
    rows,
    findOne: async (filter) => rows.find((row) => row.team === filter.team && row.followerSessionId === filter.followerSessionId) || null,
    countDocuments: async (filter) => rows.filter((row) => row.team === filter.team && row.isActive === filter.isActive).length,
    findOneAndUpdate: async (filter, update) => {
      let row = rows.find((item) => item.team === filter.team && item.followerSessionId === filter.followerSessionId);
      if (!row && update.$setOnInsert) {
        row = { _id: `follow-${rows.length + 1}`, team: filter.team, followerSessionId: filter.followerSessionId, preferences: {}, isActive: true, async save() { return this; }, toJSON() { return { ...this }; } };
        rows.push(row);
      }
      if (!row) return null;
      Object.entries(update.$set || {}).forEach(([key, value]) => {
        if (key.startsWith('preferences.')) row.preferences[key.split('.')[1]] = value;
        else row[key] = value;
      });
      return row;
    },
    updateMany: async (filter, update) => {
      const matches = rows.filter((row) => row.followerSessionId === filter.followerSessionId && (filter.isActive === undefined || row.isActive === filter.isActive));
      matches.forEach((row) => Object.assign(row, update.$set));
      return { modifiedCount: matches.length };
    },
  };
  return model;
};

test('public active team follow is idempotent, private data is hidden, and unfollow refollow works', async () => {
  const followModel = createFollowStore();
  const first = await followTeam({ teamModel: teamModel(), followModel, teamSlug: 'fc-kiet', followerSessionId });
  const second = await followTeam({ teamModel: teamModel(), followModel, teamSlug: 'fc-kiet', followerSessionId });
  assert.equal(first.isFollowing, true);
  assert.equal(second.followerCount, 1);
  assert.equal(second.followerSessionId, undefined);

  const unfollowed = await unfollowTeam({ teamModel: teamModel(), followModel, teamSlug: 'fc-kiet', followerSessionId });
  assert.equal(unfollowed.isFollowing, false);
  assert.equal(unfollowed.followerCount, 0);

  const refollowed = await followTeam({ teamModel: teamModel(), followModel, teamSlug: 'fc-kiet', followerSessionId });
  assert.equal(refollowed.isFollowing, true);
  assert.equal(followModel.rows.length, 1);
});

test('follow status handles active inactive missing session and no record without private fields', async () => {
  const followModel = createFollowStore();
  const missingSession = await getFollowStatus({ teamModel: teamModel(), followModel, teamSlug: 'fc-kiet' });
  assert.equal(missingSession.following, false);
  assert.equal(missingSession.followerCount, 0);

  const noRecord = await getFollowStatus({ teamModel: teamModel(), followModel, teamSlug: 'fc-kiet', followerSessionId });
  assert.equal(noRecord.following, false);

  await followTeam({ teamModel: teamModel(), followModel, teamSlug: 'fc-kiet', followerSessionId });
  followModel.rows[0].pushSubscription = { endpoint: 'https://push.example.test/sub', keys: { p256dh: 'secret-p256dh', auth: 'secret-auth' } };
  const active = await getFollowStatus({ teamModel: teamModel(), followModel, teamSlug: 'fc-kiet', followerSessionId });
  assert.equal(active.following, true);
  assert.equal(active.pushConfigured, true);
  assert.equal(active.followerSessionId, undefined);
  assert.equal(active.pushSubscription, undefined);

  await unfollowTeam({ teamModel: teamModel(), followModel, teamSlug: 'fc-kiet', followerSessionId });
  const inactive = await getFollowStatus({ teamModel: teamModel(), followModel, teamSlug: 'fc-kiet', followerSessionId });
  assert.equal(inactive.following, false);
  assert.equal(inactive.notificationsEnabled, false);
});

test('private or archived teams cannot be followed and one browser may follow multiple teams', async () => {
  const followModel = createFollowStore();
  await assert.rejects(followTeam({ teamModel: teamModel(null), followModel, teamSlug: 'private', followerSessionId }), (error) => error.code === 'TEAM_NOT_FOUND');
  await followTeam({ teamModel: teamModel(teamA), followModel, teamSlug: 'fc-kiet', followerSessionId });
  await followTeam({ teamModel: teamModel(teamB), followModel, teamSlug: 'ims', followerSessionId });
  assert.equal(followModel.rows.length, 2);
});

test('follow status validator rejects malformed follower session cleanly', async () => {
  const req = { params: { teamSlug: 'fc-kiet' }, query: { followerSessionId: 'not-a-uuid' } };
  await Promise.all(followStatusValidator.map((validator) => validator.run(req)));
  assert.equal(validationResult(req).array()[0].msg, 'Follower session is invalid.');
});

test('preferences update rejects unsupported fields and disables delivery preference', async () => {
  const followModel = createFollowStore();
  await followTeam({ teamModel: teamModel(), followModel, teamSlug: 'fc-kiet', followerSessionId });
  const updated = await updateFollowPreferences({ teamModel: teamModel(), followModel, teamSlug: 'fc-kiet', followerSessionId, preferences: { goal: false } });
  assert.equal(updated.preferences.goal, false);
  await assert.rejects(updateFollowPreferences({ teamModel: teamModel(), followModel, teamSlug: 'fc-kiet', followerSessionId, preferences: { email: true } }), (error) => error.code === 'PREFERENCES_INVALID');
});

test('push subscription validation accepts safe subscriptions and rejects invalid shapes', async () => {
  const subscription = { endpoint: 'https://push.example.test/sub', keys: { p256dh: 'a'.repeat(20), auth: 'b'.repeat(20) } };
  assert.equal(validateSubscription(subscription).endpoint, subscription.endpoint);
  assert.throws(() => validateSubscription({ endpoint: 'http://bad.test', keys: subscription.keys }), /valid HTTPS/);
  assert.throws(() => validateSubscription({ endpoint: subscription.endpoint, keys: {} }), /keys/);

  const followModel = createFollowStore();
  await followTeam({ teamModel: teamModel(), followModel, teamSlug: 'fc-kiet', followerSessionId });
  const result = await subscribePush({ followModel, followerSessionId, subscription });
  assert.equal(result.updated, 1);
  const status = await getFollowStatus({ teamModel: teamModel(), followModel, teamSlug: 'fc-kiet', followerSessionId });
  assert.equal(status.notificationsEnabled, true);
  assert.equal(status.pushSubscription, undefined);
});

test('push payload restricts action URLs to same-origin paths', () => {
  assert.equal(serializePushPayload({ actionUrl: 'https://evil.test', title: 'x' }).actionUrl, '/');
  assert.equal(serializePushPayload({ actionUrl: '/live/123', title: 'x' }).actionUrl, '/live/123');
});

test('push notification bodies render backend match data without unresolved placeholders', () => {
  const match = {
    team: { name: 'FC KIET' },
    opponent: { name: 'IMS' },
  };
  const bodies = [
    resultPublishedBody(match),
    matchStartedBody(match),
    goalBody({ match, event: { minute: 42, playerSnapshot: { name: 'Aman' } }, state: { homeScore: 2, awayScore: 1 } }),
    halfTimeBody(match),
    fullTimeBody(match),
    reminderBody(match),
  ];

  assert.equal(resultPublishedBody(match), 'FC KIET match result is now official.');
  assert.equal(matchStartedBody(match), 'FC KIET match has kicked off.');
  assert.equal(halfTimeBody(match), 'FC KIET match has reached half-time.');
  assert.equal(fullTimeBody(match), 'FC KIET match has finished.');
  assert.equal(reminderBody(match), 'FC KIET vs IMS is coming up.');
  assert.equal(goalBody({ match, event: { minute: 42, playerSnapshot: { name: 'Aman' } }, state: { homeScore: 2, awayScore: 1 } }), "Aman scored. 42' minute · Score: 2-1 · vs IMS.");
  bodies.forEach((body) => {
    assert.doesNotMatch(body, /\{(?:teamName|opponentName|score|scorerName|matchTime)\}/);
    assert.doesNotMatch(body, /undefined|null/);
  });
});

test('result push notification falls back when team name is unavailable', () => {
  assert.equal(resultPublishedBody({ team: null, opponent: { name: 'IMS' } }), 'Match result is now official.');
  assert.doesNotMatch(resultPublishedBody({ team: null }), /\{teamName\}|undefined|null/);
});

test('delivery is idempotent and expired subscriptions are deactivated', async () => {
  const follows = [
    { _id: 'f1', team: teamA._id, isActive: true, preferences: { goal: true }, pushSubscription: { endpoint: 'https://push/1', keys: { p256dh: 'a', auth: 'b' } }, async save() { this.saved = true; } },
    { _id: 'f2', team: teamA._id, isActive: true, preferences: { goal: false }, pushSubscription: { endpoint: 'https://push/2', keys: { p256dh: 'a', auth: 'b' } }, async save() { this.saved = true; } },
    { _id: 'f3', team: teamB._id, isActive: true, preferences: { goal: true }, pushSubscription: { endpoint: 'https://push/3', keys: { p256dh: 'a', auth: 'b' } }, async save() { this.saved = true; } },
  ];
  const followModel = { find: () => ({ limit: async () => follows.filter((follow) => follow.preferences.goal !== false) }) };
  const deliveries = new Set();
  const deliveryModel = {
    create: async (data) => {
      const key = `${data.follow}:${data.eventKey}`;
      if (deliveries.has(key)) { const error = new Error('duplicate'); error.code = 11000; throw error; }
      deliveries.add(key);
      return { ...data, async save() { return this; } };
    },
  };
  const webPushClient = {
    sendNotification: async (subscription) => {
      if (subscription.endpoint.endsWith('/3')) { const error = new Error('gone'); error.statusCode = 410; throw error; }
    },
  };
  const result = await deliverToFollowers({
    followModel,
    deliveryModel,
    webPushClient,
    teamIds: [teamA._id, teamB._id],
    matchId: '65f100000000000000000090',
    eventType: 'team_goal',
    eventKey: 'goal:1',
    payload: { title: 'Goal' },
  });
  assert.equal(result.sent, 1);
  assert.equal(result.failed, 1);
  assert.equal(follows[2].isActive, false);
});
