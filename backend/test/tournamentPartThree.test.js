import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { validationResult } from 'express-validator';
import Notification, { NOTIFICATION_TYPES } from '../src/models/Notification.js';
import { TOURNAMENT_REVIEW_ACTIONS } from '../src/models/TournamentReviewHistory.js';
import {
  assertNoProtectedTournamentFields,
  ensureTournamentEditableByHost,
} from '../src/services/tournamentService.js';
import { serializeHostReviewHistory } from '../src/services/tournamentReviewService.js';
import { createTournamentValidator, requiredReasonValidator } from '../src/validators/tournamentValidators.js';
import { registeredParticipantValidator } from '../src/validators/tournamentParticipantValidators.js';
const runValidators = async (validators, req) => {
  for (const validator of validators) await validator.run(req);
  return validationResult(req);
};

test('tournament notification and review-history contracts include Phase 8A Part 3 actions', () => {
  [
    'tournament_approval_submitted',
    'tournament_changes_requested',
    'tournament_approved',
    'tournament_rejected',
    'tournament_suspended',
    'tournament_unsuspended',
    'tournament_participation_added',
    'tournament_participation_removed',
    'tournament_participation_confirmed',
  ].forEach((type) => assert.ok(NOTIFICATION_TYPES.includes(type)));
  assert.ok(Notification.schema.path('entityType').enumValues.includes('tournament'));
  assert.ok(Notification.schema.path('entityType').enumValues.includes('tournamentParticipant'));
  [
    'created',
    'updated',
    'submitted',
    'resubmitted',
    'approved',
    'rejected',
    'changes_requested',
    'suspended',
    'unsuspended',
    'published',
    'unpublished',
    'archived',
    'participant_added',
    'participant_removed',
    'participant_status_changed',
  ].forEach((action) => assert.ok(TOURNAMENT_REVIEW_ACTIONS.includes(action)));
});

test('host editability and protected tournament fields are enforced by service helpers', () => {
  assert.throws(
    () => assertNoProtectedTournamentFields({ createdBy: 'user1', approvalStatus: 'approved' }),
    /Protected tournament fields/,
  );
  assert.doesNotThrow(() => ensureTournamentEditableByHost({
    hostTeam: 'team1',
    approvalStatus: 'draft',
    lifecycleStatus: 'draft',
    isArchived: false,
  }, { team: 'team1' }));
  assert.throws(() => ensureTournamentEditableByHost({
    hostTeam: 'team2',
    approvalStatus: 'draft',
    lifecycleStatus: 'draft',
    isArchived: false,
  }, { team: 'team1' }), /not editable/);
  assert.throws(() => ensureTournamentEditableByHost({
    hostTeam: 'team1',
    approvalStatus: 'approval_pending',
    lifecycleStatus: 'draft',
    isArchived: false,
  }, { team: 'team1' }), /not editable/);
});

test('tournament validators reject protected fields and enforce reasons/participant payloads', async () => {
  const createResult = await runValidators(createTournamentValidator, {
    body: { name: 'RANN', scope: 'inter_college', createdBy: 'attacker' },
  });
  assert.equal(createResult.isEmpty(), false);
  assert.match(createResult.array()[0].msg, /Protected tournament fields/);

  const reasonResult = await runValidators(requiredReasonValidator, {
    params: { tournamentId: '650000000000000000000001' },
    body: { reason: 'bad' },
  });
  assert.equal(reasonResult.isEmpty(), false);

  const participantResult = await runValidators(registeredParticipantValidator, {
    params: { tournamentId: '650000000000000000000001' },
    body: { registeredTeam: '650000000000000000000002', publicId: 'secret' },
  });
  assert.equal(participantResult.isEmpty(), false);
  assert.match(participantResult.array()[0].msg, /Protected participant fields/);
});

test('tournament routes are registered without frontend or challenge restoration', () => {
  const teamRoutes = readFileSync(resolve('src/routes/teamRoutes.js'), 'utf8');
  const adminRoutes = readFileSync(resolve('src/routes/adminRoutes.js'), 'utf8');
  const publicRoutes = readFileSync(resolve('src/routes/publicRoutes.js'), 'utf8');
  assert.match(teamRoutes, /hosted-tournaments/);
  assert.match(teamRoutes, /participants\/registered/);
  assert.match(teamRoutes, /\/tournaments\/:tournamentId/);
  assert.match(adminRoutes, /\/tournaments\/:tournamentId\/approve/);
  assert.match(adminRoutes, /\/tournaments\/:tournamentId\/archive/);
  assert.match(publicRoutes, /\/tournaments/);
  assert.match(publicRoutes, /\/tournaments\/:slug/);
  assert.doesNotMatch(teamRoutes, /challenge/i);
});

test('host review history serializer is safe for team admins', () => {
  const payload = serializeHostReviewHistory({
    action: 'changes_requested',
    actor: '650000000000000000000001',
    actorRole: 'superAdmin',
    previousStatus: 'approval_pending',
    nextStatus: 'changes_requested',
    message: 'Please add venue details.',
    metadata: { internal: true },
    createdAt: new Date('2027-01-01T00:00:00Z'),
  });
  assert.deepEqual(Object.keys(payload).sort(), ['action', 'actorRole', 'createdAt', 'nextStatus', 'previousStatus', 'safeMessage']);
  assert.equal(payload.safeMessage, 'Please add venue details.');
});
