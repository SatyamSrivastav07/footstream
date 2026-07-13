import assert from 'node:assert/strict';
import test from 'node:test';
import { validationResult } from 'express-validator';
import {
  acceptChallenge,
  acceptCounterChallenge,
  cancelChallenge,
  challengeDateTime,
  counterChallenge,
  createChallenge,
  declineChallenge,
  getChallengeHistoryForTeam,
  rejectCounterChallenge,
} from '../src/services/challengeService.js';
import { counterChallengeValidator, createChallengeValidator } from '../src/validators/challengeValidators.js';
import { protect, requireRole } from '../src/middleware/auth.js';
import { USER_ROLES } from '../src/models/User.js';
import adminRoutes from '../src/routes/adminRoutes.js';
import TeamChallenge from '../src/models/TeamChallenge.js';
import Match from '../src/models/Match.js';

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
const counterInput = {
  venue: 'New Ground',
  proposedDate: new Date('2030-02-01T00:00:00.000Z'),
  proposedTime: '18:00',
  message: 'Can we move it?',
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

const matchModel = ({ existing = null } = {}) => {
  const calls = { created: [] };
  return {
    calls,
    findOne: async () => existing,
    create: async (data) => {
      const match = { _id: '65a000000000000000000099', ...data, toObject() { return { ...this }; } };
      calls.created.push(match);
      return match;
    },
  };
};

const runCreateValidators = async (body) => {
  const req = { body, params: {}, query: {} };
  await Promise.all(createChallengeValidator.map((validator) => validator.run(req)));
  return validationResult(req).array();
};
const runCounterValidators = async (body) => {
  const req = { body, params: { challengeId }, query: {} };
  await Promise.all(counterChallengeValidator.map((validator) => validator.run(req)));
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
  assert.equal(challenge.status, 'pending');
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
  const matches = matchModel();
  await acceptChallenge({ teamModel: teamModel(), matchModel: matches, challengeModel: challengeModel({ found: accepted }), teamId: challengedId, userId, challengeId });
  assert.equal(accepted.status, 'accepted');
  assert.equal(accepted.saved, true);
  assert.equal(matches.calls.created.length, 1);
  const declined = challengeDocument();
  await declineChallenge({ challengeModel: challengeModel({ found: declined }), teamId: challengedId, userId, challengeId });
  assert.equal(declined.status, 'declined');
  await assert.rejects(acceptChallenge({
    challengeModel: challengeModel({ found: challengeDocument({ status: 'Accepted' }) }),
    matchModel: matchModel(),
    teamId: challengedId,
    userId,
    challengeId,
  }), (error) => error.code === 'CHALLENGE_NOT_PENDING');
});

test('sender can cancel pending challenge but receiver and outsiders cannot', async () => {
  const cancelled = challengeDocument();
  await cancelChallenge({ challengeModel: challengeModel({ found: cancelled }), teamId: challengerId, userId, challengeId });
  assert.equal(cancelled.status, 'cancelled');
  await assert.rejects(cancelChallenge({
    challengeModel: challengeModel({ found: challengeDocument() }),
    teamId: challengedId,
    userId,
    challengeId,
  }), (error) => error.code === 'CHALLENGE_SENDER_ONLY');
  await assert.rejects(acceptChallenge({
    challengeModel: challengeModel({ found: null }),
    teamId: outsiderId,
    userId,
    challengeId,
  }), (error) => error.code === 'CHALLENGE_NOT_FOUND');
});

test('sender cannot accept own challenge', async () => {
  await assert.rejects(acceptChallenge({
    challengeModel: challengeModel({ found: challengeDocument() }),
    matchModel: matchModel(),
    teamId: challengerId,
    userId,
    challengeId,
  }), (error) => error.code === 'CHALLENGE_RECEIVER_ONLY');
});

test('production challenge model wiring handles team challenge transitions', async () => {
  const originalFindOne = TeamChallenge.findOne;
  const originalMatchFindOne = Match.findOne;
  const originalMatchCreate = Match.create;
  const challenge = challengeDocument();
  try {
    TeamChallenge.findOne = () => ({
      populate() { return this; },
      then: (resolve) => resolve(challenge),
    });
    Match.findOne = async () => null;
    Match.create = async (data) => ({ _id: '65a000000000000000000099', ...data });
    const accepted = await acceptChallenge({ teamModel: teamModel(), teamId: challengedId, userId, challengeId });
    assert.equal(accepted.status, 'accepted');
    assert.equal(challenge.saved, true);
  } finally {
    TeamChallenge.findOne = originalFindOne;
    Match.findOne = originalMatchFindOne;
    Match.create = originalMatchCreate;
  }
});

test('production challenge model wiring returns operational transition errors', async () => {
  const originalFindOne = TeamChallenge.findOne;
  const originalMatchFindOne = Match.findOne;
  const originalMatchCreate = Match.create;
  try {
    Match.findOne = async () => null;
    Match.create = async (data) => ({ _id: '65a000000000000000000099', ...data });
    TeamChallenge.findOne = () => ({
      populate() { return this; },
      then: (resolve) => resolve(challengeDocument()),
    });
    await assert.rejects(acceptChallenge({ teamModel: teamModel(), teamId: challengerId, userId, challengeId }), (error) => error.statusCode === 403 && error.code === 'CHALLENGE_RECEIVER_ONLY');

    TeamChallenge.findOne = () => ({
      populate() { return this; },
      then: (resolve) => resolve(null),
    });
    await assert.rejects(acceptChallenge({ teamId: outsiderId, userId, challengeId }), (error) => error.statusCode === 404 && error.code === 'CHALLENGE_NOT_FOUND');
    await assert.rejects(acceptChallenge({ teamId: challengedId, userId, challengeId }), (error) => error.statusCode === 404 && error.code === 'CHALLENGE_NOT_FOUND');

    TeamChallenge.findOne = () => ({
      populate() { return this; },
      then: (resolve) => resolve(challengeDocument({ status: 'Accepted' })),
    });
    await assert.rejects(acceptChallenge({ teamId: challengedId, userId, challengeId }), (error) => error.statusCode === 409 && error.code === 'CHALLENGE_NOT_PENDING');

    const declined = challengeDocument();
    TeamChallenge.findOne = () => ({
      populate() { return this; },
      then: (resolve) => resolve(declined),
    });
    const declineResponse = await declineChallenge({ teamId: challengedId, userId, challengeId });
    assert.equal(declineResponse.status, 'declined');

    const cancelled = challengeDocument();
    TeamChallenge.findOne = () => ({
      populate() { return this; },
      then: (resolve) => resolve(cancelled),
    });
    const cancelResponse = await cancelChallenge({ teamId: challengerId, userId, challengeId });
    assert.equal(cancelResponse.status, 'cancelled');
  } finally {
    TeamChallenge.findOne = originalFindOne;
    Match.findOne = originalMatchFindOne;
    Match.create = originalMatchCreate;
  }
});

test('challenged team counters pending challenge and challenger resolves it', async () => {
  const countered = challengeDocument();
  const counterResponse = await counterChallenge({
    challengeModel: challengeModel({ found: countered }),
    teamId: challengedId,
    userId,
    challengeId,
    input: counterInput,
    now: new Date('2029-01-01T00:00:00.000Z'),
  });
  assert.equal(counterResponse.status, 'countered');
  assert.equal(countered.counterProposal.venue, 'New Ground');
  assert.equal(countered.history.at(-1).action, 'countered');

  await assert.rejects(counterChallenge({
    challengeModel: challengeModel({ found: challengeDocument() }),
    teamId: challengerId,
    userId,
    challengeId,
    input: counterInput,
  }), (error) => error.code === 'CHALLENGE_RECEIVER_ONLY');
  await assert.rejects(counterChallenge({
    challengeModel: challengeModel({ found: null }),
    teamId: outsiderId,
    userId,
    challengeId,
    input: counterInput,
  }), (error) => error.code === 'CHALLENGE_NOT_FOUND');
  await assert.rejects(counterChallenge({
    challengeModel: challengeModel({ found: challengeDocument({ status: 'countered' }) }),
    teamId: challengedId,
    userId,
    challengeId,
    input: counterInput,
  }), (error) => error.code === 'CHALLENGE_NOT_PENDING');

  const rejected = challengeDocument({ status: 'countered', counterProposal: { ...counterInput, proposedByTeam: challengedId, createdAt: new Date() } });
  const rejectResponse = await rejectCounterChallenge({ challengeModel: challengeModel({ found: rejected }), teamId: challengerId, userId, challengeId });
  assert.equal(rejectResponse.status, 'pending');
  assert.equal(rejected.counterProposal, null);
  assert.equal(rejected.history.at(-1).action, 'counter-rejected');

  await assert.rejects(acceptCounterChallenge({
    challengeModel: challengeModel({ found: challengeDocument({ status: 'countered', counterProposal: { ...counterInput, proposedByTeam: challengedId, createdAt: new Date() } }) }),
    matchModel: matchModel(),
    teamId: challengedId,
    userId,
    challengeId,
  }), (error) => error.code === 'CHALLENGE_CHALLENGER_ONLY');
});

test('accepting original and counter challenges creates one linked scheduled fixture', async () => {
  const pending = challengeDocument();
  const matches = matchModel();
  const accepted = await acceptChallenge({
    challengeModel: challengeModel({ found: pending }),
    matchModel: matches,
    teamModel: teamModel(),
    teamId: challengedId,
    userId,
    challengeId,
    now: new Date('2029-01-01T00:00:00.000Z'),
  });
  assert.equal(accepted.status, 'accepted');
  assert.equal(accepted.createdMatch._id, '65a000000000000000000099');
  assert.equal(matches.calls.created.length, 1);
  assert.equal(matches.calls.created[0].sourceChallenge, challengeId);
  assert.equal(matches.calls.created[0].team, challengerId);
  assert.equal(matches.calls.created[0].registeredOpponentTeam, challengedId);
  assert.equal(matches.calls.created[0].opponent.name, 'United FC');
  assert.equal(matches.calls.created[0].status, 'scheduled');
  assert.deepEqual(matches.calls.created[0].startingXI, []);
  assert.equal(matches.calls.created.length, 1);

  const existingMatch = { _id: '65a000000000000000000099', sourceChallenge: challengeId, status: 'scheduled', isActive: true };
  const repeated = await acceptChallenge({
    challengeModel: challengeModel({ found: challengeDocument({ status: 'accepted', createdMatch: existingMatch }) }),
    matchModel: matchModel({ existing: existingMatch }),
    teamId: challengedId,
    userId,
    challengeId,
  });
  assert.equal(repeated.createdMatch._id, existingMatch._id);

  const countered = challengeDocument({ status: 'countered', counterProposal: { ...counterInput, proposedByTeam: challengedId, createdAt: new Date() } });
  const counterMatches = matchModel();
  const counterAccepted = await acceptCounterChallenge({
    challengeModel: challengeModel({ found: countered }),
    matchModel: counterMatches,
    teamModel: teamModel(),
    teamId: challengerId,
    userId,
    challengeId,
    now: new Date('2029-01-01T00:00:00.000Z'),
  });
  assert.equal(counterAccepted.status, 'accepted');
  assert.equal(counterAccepted.venue, counterInput.venue);
  assert.equal(counterMatches.calls.created.length, 1);
});

test('counter validators reject invalid and protected fields', async () => {
  const errors = await runCounterValidators({
    venue: 'x',
    proposedDate: 'not-date',
    proposedTime: '25:99',
    message: 'ok',
    status: 'accepted',
  });
  assert.ok(errors.some((error) => error.msg === 'Venue must be 2 to 160 characters.'));
  assert.ok(errors.some((error) => error.msg === 'Select a valid proposed date.'));
  assert.ok(errors.some((error) => error.msg === 'Select a valid proposed time.'));
  assert.ok(errors.some((error) => error.msg.includes('Unsupported counter proposal fields')));
});

test('challenge history is chronological and hides actor users', async () => {
  const history = [
    { action: 'fixture-created', actorTeam: team(challengerId, 'FC KIET'), actorUser: userId, previousStatus: 'accepted', nextStatus: 'accepted', snapshot: input, createdAt: new Date('2030-01-03') },
    { action: 'created', actorTeam: team(challengerId, 'FC KIET'), actorUser: userId, previousStatus: null, nextStatus: 'pending', snapshot: input, createdAt: new Date('2030-01-01') },
    { action: 'countered', actorTeam: team(challengedId, 'United FC'), actorUser: userId, previousStatus: 'pending', nextStatus: 'countered', snapshot: counterInput, createdAt: new Date('2030-01-02') },
  ];
  const result = await getChallengeHistoryForTeam({
    challengeModel: {
      findOne: () => ({
        populate() { return this; },
        lean() { return Promise.resolve({ _id: challengeId, challengerTeam: challengerId, challengedTeam: challengedId, history }); },
      }),
    },
    teamId: challengerId,
    challengeId,
  });
  assert.deepEqual(result.history.map((item) => item.action), ['created', 'countered', 'fixture-created']);
  assert.equal(result.history[0].actorUser, undefined);
  assert.equal(result.history[0].actorTeam.name, 'FC KIET');
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
