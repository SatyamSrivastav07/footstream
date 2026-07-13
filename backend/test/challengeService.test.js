import assert from 'node:assert/strict';
import test from 'node:test';
import { validationResult } from 'express-validator';
import {
  acceptChallenge,
  cancelChallenge,
  challengeDateTime,
  createChallenge,
  declineChallenge,
} from '../src/services/challengeService.js';
import { createChallengeValidator } from '../src/validators/challengeValidators.js';
import { protect, requireRole } from '../src/middleware/auth.js';
import { USER_ROLES } from '../src/models/User.js';
import adminRoutes from '../src/routes/adminRoutes.js';
import TeamChallenge from '../src/models/TeamChallenge.js';

const challengerId = '65a000000000000000000001';
const challengedId = '65a000000000000000000002';
const outsiderId = '65a000000000000000000003';
const userId = '65a000000000000000000004';
const challengeId = '65a000000000000000000005';
const team = (id, name) => ({ _id: id, name, slug: name.toLowerCase().replaceAll(' ', '-'), isPublished: true, isArchived: false });
const input = {
  challengedTeam: challengedId,
  matchType: 'Friendly',
  squadSize: '11v11',
  venue: 'Central Ground',
  proposedDate: new Date('2030-01-01T00:00:00.000Z'),
  proposedTime: '16:30',
  message: 'Let us play.',
};

const teamModel = (teams = [team(challengerId, 'FC KIET'), team(challengedId, 'United FC')]) => ({
  findOne: async (filter) => teams.find((item) => String(item._id) === String(filter._id) && item.isPublished === filter.isPublished && item.isArchived === filter.isArchived) || null,
});

const challengeDocument = (overrides = {}) => ({
  _id: challengeId,
  challengerTeam: team(challengerId, 'FC KIET'),
  challengedTeam: team(challengedId, 'United FC'),
  createdBy: userId,
  matchType: 'Friendly',
  squadSize: '11v11',
  venue: 'Central Ground',
  proposedDate: new Date('2030-01-01T00:00:00.000Z'),
  proposedTime: '16:30',
  message: 'Let us play.',
  status: 'Pending',
  createdAt: new Date('2029-12-01T10:00:00.000Z'),
  updatedAt: new Date('2029-12-01T10:00:00.000Z'),
  async save() { this.saved = true; return this; },
  toObject() { return { ...this }; },
  ...overrides,
});

const challengeModel = ({ exists = null, found = challengeDocument() } = {}) => ({
  exists: async () => exists,
  create: async (data) => ({ ...challengeDocument(), ...data, _id: challengeId }),
  findOne: () => ({
    populate() { return this; },
    then: (resolve) => resolve(found),
  }),
});

const runCreateValidators = async (body) => {
  const req = { body, params: {}, query: {} };
  await Promise.all(createChallengeValidator.map((validator) => validator.run(req)));
  return validationResult(req).array();
};

const runMiddleware = (middleware, req) => new Promise((resolve) => middleware(req, {}, (error) => resolve(error || null)));

test('team admin creates a challenge between active published teams', async () => {
  const challenge = await createChallenge({
    teamModel: teamModel(),
    challengeModel: challengeModel(),
    teamId: challengerId,
    userId,
    input,
    now: new Date('2029-01-01T00:00:00.000Z'),
  });
  assert.equal(challenge.status, 'Pending');
  assert.equal(challenge.challengerTeam.name, 'FC KIET');
  assert.equal(challenge.challengedTeam.name, 'United FC');
});

test('challenge creation rejects same team duplicate pending and past date', async () => {
  await assert.rejects(createChallenge({
    teamModel: teamModel(),
    challengeModel: challengeModel(),
    teamId: challengerId,
    userId,
    input: { ...input, challengedTeam: challengerId },
  }), (error) => error.code === 'CHALLENGE_SAME_TEAM');
  await assert.rejects(createChallenge({
    teamModel: teamModel(),
    challengeModel: challengeModel({ exists: { _id: challengeId } }),
    teamId: challengerId,
    userId,
    input,
  }), (error) => error.code === 'CHALLENGE_DUPLICATE_PENDING');
  await assert.rejects(createChallenge({
    teamModel: teamModel(),
    challengeModel: challengeModel(),
    teamId: challengerId,
    userId,
    input,
    now: new Date('2031-01-01T00:00:00.000Z'),
  }), (error) => error.code === 'CHALLENGE_PAST_DATE');
});

test('challenge creation rejects unpublished archived or missing teams', async () => {
  await assert.rejects(createChallenge({
    teamModel: teamModel([team(challengerId, 'FC KIET')]),
    challengeModel: challengeModel(),
    teamId: challengerId,
    userId,
    input,
  }), (error) => error.code === 'TEAM_NOT_FOUND');
  await assert.rejects(createChallenge({
    teamModel: teamModel([{ ...team(challengerId, 'FC KIET'), isPublished: false }, team(challengedId, 'United FC')]),
    challengeModel: challengeModel(),
    teamId: challengerId,
    userId,
    input,
  }), (error) => error.code === 'TEAM_NOT_FOUND');
});

test('receiver accepts and declines pending challenge only', async () => {
  const accepted = challengeDocument();
  await acceptChallenge({ challengeModel: challengeModel({ found: accepted }), teamId: challengedId, challengeId });
  assert.equal(accepted.status, 'Accepted');
  assert.equal(accepted.saved, true);
  const declined = challengeDocument();
  await declineChallenge({ challengeModel: challengeModel({ found: declined }), teamId: challengedId, challengeId });
  assert.equal(declined.status, 'Declined');
  await assert.rejects(acceptChallenge({
    challengeModel: challengeModel({ found: challengeDocument({ status: 'Accepted' }) }),
    teamId: challengedId,
    challengeId,
  }), (error) => error.code === 'CHALLENGE_NOT_PENDING');
});

test('sender can cancel pending challenge but receiver and outsiders cannot', async () => {
  const cancelled = challengeDocument();
  await cancelChallenge({ challengeModel: challengeModel({ found: cancelled }), teamId: challengerId, challengeId });
  assert.equal(cancelled.status, 'Cancelled');
  await assert.rejects(cancelChallenge({
    challengeModel: challengeModel({ found: challengeDocument() }),
    teamId: challengedId,
    challengeId,
  }), (error) => error.code === 'CHALLENGE_SENDER_ONLY');
  await assert.rejects(acceptChallenge({
    challengeModel: challengeModel({ found: null }),
    teamId: outsiderId,
    challengeId,
  }), (error) => error.code === 'CHALLENGE_NOT_FOUND');
});

test('sender cannot accept own challenge', async () => {
  await assert.rejects(acceptChallenge({
    challengeModel: challengeModel({ found: challengeDocument() }),
    teamId: challengerId,
    challengeId,
  }), (error) => error.code === 'CHALLENGE_RECEIVER_ONLY');
});

test('production challenge model wiring handles team challenge transitions', async () => {
  const originalFindOne = TeamChallenge.findOne;
  const challenge = challengeDocument();
  try {
    TeamChallenge.findOne = () => ({
      populate() { return this; },
      then: (resolve) => resolve(challenge),
    });
    const accepted = await acceptChallenge({ teamId: challengedId, challengeId });
    assert.equal(accepted.status, 'Accepted');
    assert.equal(challenge.saved, true);
  } finally {
    TeamChallenge.findOne = originalFindOne;
  }
});

test('production challenge model wiring returns operational transition errors', async () => {
  const originalFindOne = TeamChallenge.findOne;
  try {
    TeamChallenge.findOne = () => ({
      populate() { return this; },
      then: (resolve) => resolve(challengeDocument()),
    });
    await assert.rejects(acceptChallenge({ teamId: challengerId, challengeId }), (error) => error.statusCode === 403 && error.code === 'CHALLENGE_RECEIVER_ONLY');

    TeamChallenge.findOne = () => ({
      populate() { return this; },
      then: (resolve) => resolve(null),
    });
    await assert.rejects(acceptChallenge({ teamId: outsiderId, challengeId }), (error) => error.statusCode === 404 && error.code === 'CHALLENGE_NOT_FOUND');
    await assert.rejects(acceptChallenge({ teamId: challengedId, challengeId }), (error) => error.statusCode === 404 && error.code === 'CHALLENGE_NOT_FOUND');

    TeamChallenge.findOne = () => ({
      populate() { return this; },
      then: (resolve) => resolve(challengeDocument({ status: 'Accepted' })),
    });
    await assert.rejects(acceptChallenge({ teamId: challengedId, challengeId }), (error) => error.statusCode === 409 && error.code === 'CHALLENGE_NOT_PENDING');

    const declined = challengeDocument();
    TeamChallenge.findOne = () => ({
      populate() { return this; },
      then: (resolve) => resolve(declined),
    });
    const declineResponse = await declineChallenge({ teamId: challengedId, challengeId });
    assert.equal(declineResponse.status, 'Declined');

    const cancelled = challengeDocument();
    TeamChallenge.findOne = () => ({
      populate() { return this; },
      then: (resolve) => resolve(cancelled),
    });
    const cancelResponse = await cancelChallenge({ teamId: challengerId, challengeId });
    assert.equal(cancelResponse.status, 'Cancelled');
  } finally {
    TeamChallenge.findOne = originalFindOne;
  }
});

test('challenge validator rejects invalid enum and protected fields', async () => {
  const errors = await runCreateValidators({ ...input, matchType: 'Tournament', status: 'Accepted' });
  assert.ok(errors.some((error) => error.msg === 'Select a valid match type.'));
  assert.ok(errors.some((error) => error.msg.includes('Unsupported challenge fields')));
});

test('challenge date time helper safely combines date and time', () => {
  assert.equal(challengeDateTime(input).toISOString(), '2030-01-01T16:30:00.000Z');
  assert.equal(challengeDateTime({ proposedDate: 'not-date', proposedTime: '10:00' }), null);
});

test('anonymous requests are rejected and super admin challenge routes are read-only', async () => {
  const authError = await runMiddleware(protect, { cookies: {} });
  assert.equal(authError.statusCode, 401);
  const teamMutationGuard = requireRole(USER_ROLES.TEAM_ADMIN);
  const denied = await runMiddleware(teamMutationGuard, { user: { role: USER_ROLES.SUPER_ADMIN } });
  assert.equal(denied.statusCode, 403);
  const challengeRoutes = adminRoutes.stack.filter((layer) => layer.route?.path?.startsWith('/challenges'));
  assert.ok(challengeRoutes.length >= 2);
  assert.deepEqual([...new Set(challengeRoutes.flatMap((layer) => Object.keys(layer.route.methods)))], ['get']);
});
