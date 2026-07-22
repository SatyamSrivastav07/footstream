import assert from 'node:assert/strict';
import test from 'node:test';
import {
  collaborationBadgeFor,
  ensureCollaborationRequest,
  reviewCollaboration,
  serializeCollaborationSummary,
} from '../src/services/matchCollaborationService.js';

const hostTeam = '65a000000000000000000001';
const opponentTeam = '65a000000000000000000002';
const unrelatedTeam = '65a000000000000000000003';
const matchId = '65a000000000000000000004';
const userId = '65a000000000000000000005';
const collaborationId = '65a000000000000000000006';

const match = (overrides = {}) => ({
  _id: matchId,
  team: hostTeam,
  registeredOpponentTeam: opponentTeam,
  opponent: { name: 'IMS FC' },
  isActive: true,
  ...overrides,
});

const collaboration = (overrides = {}) => ({
  _id: collaborationId,
  match: matchId,
  hostTeam,
  opponentTeam,
  status: 'pending',
  rejectionReason: '',
  changeRequests: [],
  async save() { this.saved = true; return this; },
  ...overrides,
});

const matchModel = (value = match()) => ({
  findOne: async () => value,
});

const collaborationModel = (value = collaboration()) => ({
  findOne: async () => value,
});

const noop = async () => {};

test('opponent accepts a pending collaboration exactly once', async () => {
  const record = collaboration();
  const result = await reviewCollaboration({
    matchModel: matchModel(),
    collaborationModel: collaborationModel(record),
    notificationForTeam: noop,
    activityLogger: noop,
    matchId,
    teamId: opponentTeam,
    userId,
    action: 'accept',
  });

  assert.equal(record.status, 'accepted');
  assert.equal(record.opponentStatsApplied, true);
  assert.ok(record.opponentStatsAppliedAt);
  assert.equal(result.collaboration.status, 'accepted');

  await assert.rejects(reviewCollaboration({
    matchModel: matchModel(),
    collaborationModel: collaborationModel(record),
    notificationForTeam: noop,
    activityLogger: noop,
    matchId,
    teamId: opponentTeam,
    userId,
    action: 'accept',
  }), (error) => error.code === 'COLLABORATION_NOT_REVIEWABLE');
});

test('host and unrelated teams cannot accept opponent verification', async () => {
  await assert.rejects(reviewCollaboration({
    matchModel: matchModel(),
    collaborationModel: collaborationModel(),
    notificationForTeam: noop,
    activityLogger: noop,
    matchId,
    teamId: hostTeam,
    userId,
    action: 'accept',
  }), (error) => error.code === 'COLLABORATION_REVIEW_FORBIDDEN');

  await assert.rejects(reviewCollaboration({
    matchModel: matchModel(),
    collaborationModel: collaborationModel(),
    notificationForTeam: noop,
    activityLogger: noop,
    matchId,
    teamId: unrelatedTeam,
    userId,
    action: 'accept',
  }), (error) => error.code === 'MATCH_NOT_FOUND');
});

test('opponent can request changes and host can accept or reject the request', async () => {
  const record = collaboration();
  await reviewCollaboration({
    matchModel: matchModel(),
    collaborationModel: collaborationModel(record),
    notificationForTeam: noop,
    activityLogger: noop,
    matchId,
    teamId: opponentTeam,
    userId,
    action: 'request-changes',
    input: { message: 'Score should be 2-2.' },
  });

  assert.equal(record.status, 'changes_requested');
  assert.equal(record.changeRequests.length, 1);
  assert.equal(record.changeRequests[0].hostResponse, 'pending');

  await reviewCollaboration({
    matchModel: matchModel(),
    collaborationModel: collaborationModel(record),
    notificationForTeam: noop,
    activityLogger: noop,
    matchId,
    teamId: hostTeam,
    userId,
    action: 'reject-changes',
    input: { reason: 'Reviewed footage.' },
  });

  assert.equal(record.status, 'changes_rejected');
  assert.equal(record.changeRequests[0].hostResponse, 'rejected');
  assert.equal(record.hostDecisionReason, 'Reviewed footage.');
});

test('host can cancel a pending collaboration but opponent cannot cancel it', async () => {
  const record = collaboration();
  await assert.rejects(reviewCollaboration({
    matchModel: matchModel(),
    collaborationModel: collaborationModel(record),
    notificationForTeam: noop,
    activityLogger: noop,
    matchId,
    teamId: opponentTeam,
    userId,
    action: 'cancel',
  }), (error) => error.code === 'COLLABORATION_HOST_FORBIDDEN');

  await reviewCollaboration({
    matchModel: matchModel(),
    collaborationModel: collaborationModel(record),
    notificationForTeam: noop,
    activityLogger: noop,
    matchId,
    teamId: hostTeam,
    userId,
    action: 'cancel',
  });

  assert.equal(record.status, 'cancelled');
  assert.equal(record.cancelledBy, userId);
});

test('ensure collaboration request dedupes and creates one notification for an active pending request', async () => {
  let notifications = 0;
  const record = collaboration();
  const model = {
    findOneAndUpdate: async () => record,
  };

  const created = await ensureCollaborationRequest({
    collaborationModel: model,
    notificationForTeam: async () => { notifications += 1; },
    activityLogger: noop,
    match: match(),
    userId,
  });

  assert.equal(created._id, collaborationId);
  assert.equal(notifications, 1);
});

test('collaboration summary and badges are public-safe', () => {
  const summary = serializeCollaborationSummary(collaboration({ status: 'accepted' }), opponentTeam);
  assert.equal(summary.status, 'accepted');
  assert.equal(summary.role, 'opponent');
  assert.equal(summary.badge, 'Verified by Both Teams');
  assert.equal(collaborationBadgeFor(match(), { status: 'pending' }), 'Opponent Verification Pending');
  assert.equal('requestedBy' in summary, false);
});
