import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { validationResult } from 'express-validator';
import Notification, { NOTIFICATION_TYPES } from '../src/models/Notification.js';
import { TOURNAMENT_REVIEW_ACTIONS } from '../src/models/TournamentReviewHistory.js';
import { TOURNAMENT_SQUAD_HISTORY_ACTIONS } from '../src/models/TournamentSquadHistory.js';
import TournamentMatchdayLineup from '../src/models/TournamentMatchdayLineup.js';
import { TOURNAMENT_LINEUP_HISTORY_ACTIONS } from '../src/models/TournamentLineupHistory.js';
import {
  TOURNAMENT_FORMATION_PRESETS,
  TOURNAMENT_LINEUP_STATUS,
  outfieldPlayersForMatchFormat,
  startersForMatchFormat,
} from '../src/constants/tournamentConstants.js';
import {
  assertNoProtectedTournamentFields,
  deleteHostedTournamentDraft,
  ensureTournamentEditableByHost,
  submitForApproval,
} from '../src/services/tournamentService.js';
import { listTournamentsForAdmin, serializeHostReviewHistory } from '../src/services/tournamentReviewService.js';
import { createTournamentValidator, requiredReasonValidator } from '../src/validators/tournamentValidators.js';
import { manualParticipantValidator, registeredParticipantValidator } from '../src/validators/tournamentParticipantValidators.js';
import { registeredSquadPlayerValidator } from '../src/validators/tournamentSquadValidators.js';
import { createLineupValidator, updateLineupSideValidator } from '../src/validators/tournamentLineupValidators.js';
import { serializeTournamentSquadPublic } from '../src/serializers/tournamentSerializers.js';
import { autoPlaceStarters, formationSlots, validateTournamentFormation } from '../src/services/tournamentLineupService.js';
import { validateWithStatus } from '../src/middleware/validate.js';
import { errorHandler } from '../src/middleware/errorHandler.js';
const runValidators = async (validators, req) => {
  for (const validator of validators) await validator.run(req);
  return validationResult(req);
};
const leanSelectChain = (rows = []) => ({ select: () => ({ lean: async () => rows }) });
const tournamentDoc = (overrides = {}) => ({
  _id: '650000000000000000000010',
  hostTeam: '650000000000000000000011',
  createdBy: '650000000000000000000012',
  name: 'RANN',
  slug: 'rann',
  scope: 'inter_college',
  competitionFormat: 'league',
  matchFormat: '11v11',
  city: 'Ghaziabad',
  primaryVenue: 'Main Ground',
  startDate: new Date('2027-01-01T00:00:00Z'),
  endDate: new Date('2027-01-10T00:00:00Z'),
  minimumTeams: 2,
  approvalStatus: 'draft',
  lifecycleStatus: 'draft',
  isArchived: false,
  submittedAt: null,
  logo: {},
  coverImage: {},
  save: async function save() { return this; },
  deleteOne: async function deleteOne() { this.deleted = true; },
  toObject: function toObject() { return { ...this }; },
  ...overrides,
});

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
    'tournament_squad_submitted',
    'tournament_squad_approved',
    'tournament_squad_locked',
    'tournament_squad_unlocked',
  ].forEach((type) => assert.ok(NOTIFICATION_TYPES.includes(type)));
  assert.ok(Notification.schema.path('entityType').enumValues.includes('tournament'));
  assert.ok(Notification.schema.path('entityType').enumValues.includes('tournamentParticipant'));
  assert.ok(Notification.schema.path('entityType').enumValues.includes('tournamentSquad'));
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
    'branding_updated',
    'branding_removed',
    'participant_branding_updated',
    'participant_branding_removed',
  ].forEach((action) => assert.ok(TOURNAMENT_REVIEW_ACTIONS.includes(action)));
});

test('tournament squad routes validators serializers and fixture endpoints stay bounded', async () => {
  const teamRoutes = readFileSync(resolve('src/routes/teamRoutes.js'), 'utf8');
  const adminRoutes = readFileSync(resolve('src/routes/adminRoutes.js'), 'utf8');
  const publicRoutes = readFileSync(resolve('src/routes/publicRoutes.js'), 'utf8');
  const squadService = readFileSync(resolve('src/services/tournamentSquadService.js'), 'utf8');
  [
    'squad_created',
    'player_added',
    'captain_changed',
    'vice_captain_changed',
    'squad_submitted',
    'squad_approved',
    'squad_locked',
    'squad_unlocked',
  ].forEach((action) => assert.ok(TOURNAMENT_SQUAD_HISTORY_ACTIONS.includes(action)));
  assert.match(teamRoutes, /eligible-players/);
  assert.match(teamRoutes, /squad\/players\/registered/);
  assert.match(teamRoutes, /squad\/players\/manual/);
  assert.match(teamRoutes, /squad\/captain/);
  assert.doesNotMatch(squadService, /Registered participants must select permanent registered players/);
  assert.match(adminRoutes, /participants\/:participantId\/squad/);
  assert.match(publicRoutes, /participants\/:participantSlug\/squad/);
  assert.match(teamRoutes, /fixtures\/generate/);
  assert.match(teamRoutes, /standings/);
  assert.doesNotMatch(teamRoutes, /playing-xi|challenges/i);

  const invalid = await runValidators(registeredSquadPlayerValidator, {
    params: { tournamentId: '650000000000000000000001', participantId: '650000000000000000000002' },
    body: { playerId: '650000000000000000000003', statistics: { goals: 10 } },
  });
  assert.equal(invalid.isEmpty(), false);
  assert.match(invalid.array()[0].msg, /Protected squad-player fields/);

  const safe = serializeTournamentSquadPublic(
    { _id: '650000000000000000000004', participant: '650000000000000000000002', status: 'locked', captain: '650000000000000000000005' },
    [{ _id: '650000000000000000000005', name: 'Aman', position: 'GK', jersey: 1, photo: { imageUrl: 'https://cdn.test/a.png', publicId: 'secret' }, captain: true, goalkeeper: true, registeredPlayer: '650000000000000000000006' }],
  );
  assert.equal(safe.captain.name, 'Aman');
  assert.equal(safe.players[0].photo.imageUrl, 'https://cdn.test/a.png');
  assert.equal(safe.players[0].photo.publicId, undefined);
  assert.equal(safe.players[0].registeredPlayer, undefined);
});

test('tournament matchday lineup and competition routes stay challenge-free', async () => {
  const teamRoutes = readFileSync(resolve('src/routes/teamRoutes.js'), 'utf8');
  const adminRoutes = readFileSync(resolve('src/routes/adminRoutes.js'), 'utf8');
  const packageJson = readFileSync(resolve('package.json'), 'utf8');
  [
    'lineup_created',
    'player_added_to_starting',
    'player_added_to_bench',
    'player_removed',
    'captain_changed',
    'goalkeeper_changed',
    'formation_changed',
    'lineup_submitted',
    'lineup_locked',
    'lineup_unlocked',
  ].forEach((action) => assert.ok(TOURNAMENT_LINEUP_HISTORY_ACTIONS.includes(action)));
  assert.deepEqual(Object.values(TOURNAMENT_LINEUP_STATUS), ['draft', 'submitted', 'locked']);
  assert.match(teamRoutes, /hosted-tournaments\/:tournamentId\/lineups/);
  assert.match(teamRoutes, /lineups\/:lineupId\/home\/eligible-players/);
  assert.match(teamRoutes, /lineups\/:lineupId\/away\/eligible-players/);
  assert.match(adminRoutes, /tournaments\/:tournamentId\/lineups/);
  assert.match(teamRoutes, /fixtures\/generate/);
  assert.match(teamRoutes, /create-match/);
  assert.match(teamRoutes, /standings/);
  assert.doesNotMatch(teamRoutes, /tournament-matches|playing-xi|challenges/i);
  assert.match(packageJson, /TournamentMatchdayLineup\.js/);
  assert.match(packageJson, /tournamentLineupService\.js/);
  assert.match(packageJson, /tournamentCompetitionService\.js/);

  const result = await runValidators(createLineupValidator, {
    params: { tournamentId: '64b000000000000000000001' },
    body: { provisionalFixtureKey: 'RANN-M1', homeParticipant: '64b000000000000000000002', awayParticipant: '64b000000000000000000003' },
  });
  assert.equal(result.isEmpty(), true);

  const badAction = await runValidators(updateLineupSideValidator, {
    params: { tournamentId: '64b000000000000000000001', lineupId: '64b000000000000000000004' },
    body: { action: 'startMatch' },
  });
  assert.equal(badAction.isEmpty(), false);

  const slotAction = await runValidators(updateLineupSideValidator, {
    params: { tournamentId: '64b000000000000000000001', lineupId: '64b000000000000000000004' },
    body: { action: 'assignSlot', squadPlayerId: '64b000000000000000000005', slotId: 'L1-P1' },
  });
  assert.equal(slotAction.isEmpty(), true);

  const autoPlaceAction = await runValidators(updateLineupSideValidator, {
    params: { tournamentId: '64b000000000000000000001', lineupId: '64b000000000000000000004' },
    body: { action: 'autoPlace' },
  });
  assert.equal(autoPlaceAction.isEmpty(), true);
});

test('tournament lineup model and formation validation enforce matchday contracts', async () => {
  assert.deepEqual(TOURNAMENT_FORMATION_PRESETS[5], ['1-2-1', '1-1-2', '2-1-1']);
  assert.deepEqual(TOURNAMENT_FORMATION_PRESETS[6], ['2-2-1', '2-1-2', '1-3-1']);
  assert.deepEqual(TOURNAMENT_FORMATION_PRESETS[8], ['3-3-1', '2-3-2', '3-2-2']);
  assert.deepEqual(TOURNAMENT_FORMATION_PRESETS[11], ['4-3-3', '4-4-2', '4-2-3-1', '3-5-2', '3-4-3']);
  assert.equal(startersForMatchFormat('6v6'), 6);
  assert.equal(outfieldPlayersForMatchFormat('6v6'), 5);
  assert.doesNotThrow(() => validateTournamentFormation({ formation: '4-3-3', playersOnField: 11 }));
  assert.doesNotThrow(() => validateTournamentFormation({ formation: '2-2-1', playersOnField: 6 }));
  assert.doesNotThrow(() => validateTournamentFormation({ formation: 'custom', customFormation: '4-3-3', playersOnField: 11 }));
  assert.throws(() => validateTournamentFormation({ formation: '4-3-3', playersOnField: 7 }), /compatible/);
  assert.throws(() => validateTournamentFormation({ formation: 'custom', customFormation: '2-2-2', playersOnField: 11 }), /total must equal/);
  const slots = formationSlots({ formation: '2-2-1', playersOnField: 6 });
  assert.equal(slots.length, 6);
  assert.equal(slots[0].slotId, 'GK');
  assert.equal(slots.filter((slot) => slot.slotId !== 'GK').length, 5);
  const placedWithoutGoalkeeper = autoPlaceStarters({
    sideData: {
      formation: '2-2-1',
      startingPlayers: Array.from({ length: 6 }, (_, index) => ({
        squadPlayer: `64b00000000000000000001${index}`,
        name: `Player ${index}`,
        position: 'CM',
      })),
    },
    playersOnField: 6,
  });
  assert.equal(placedWithoutGoalkeeper.every((player) => player.slotId), true);
  assert.equal(new Set(placedWithoutGoalkeeper.map((player) => player.slotId)).size, 6);

  const sameParticipants = new TournamentMatchdayLineup({
    tournament: '64b000000000000000000001',
    provisionalFixtureKey: 'RANN-M1',
    homeParticipant: '64b000000000000000000002',
    awayParticipant: '64b000000000000000000002',
    createdBy: '64b000000000000000000005',
  });
  const error = sameParticipants.validateSync();
  assert.ok(error.errors.awayParticipant);

  const valid = new TournamentMatchdayLineup({
    tournament: '64b000000000000000000001',
    provisionalFixtureKey: 'RANN-M2',
    homeParticipant: '64b000000000000000000002',
    awayParticipant: '64b000000000000000000003',
    home: {
      startingPlayers: [{
        squadPlayer: '64b000000000000000000006',
        name: 'Aman',
        position: 'GK',
        sourceType: 'manual_player',
        slotId: 'GK',
        lineIndex: 0,
        positionIndex: 0,
        x: 0.5,
        y: 0.92,
      }],
    },
    createdBy: '64b000000000000000000005',
  });
  assert.equal(valid.validateSync(), undefined);
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
  assert.doesNotThrow(() => ensureTournamentEditableByHost({
    hostTeam: { _id: 'team1' },
    approvalStatus: 'draft',
    lifecycleStatus: 'draft',
    isArchived: false,
  }, { team: { _id: 'team1' } }));
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

test('tournament delete hard-removes non-completed tournament scoped records and detaches matches', async () => {
  const tournament = tournamentDoc({
    approvalStatus: 'approved',
    lifecycleStatus: 'ongoing',
    logo: { publicId: 'logo-secret' },
    coverImage: { publicId: 'cover-secret' },
  });
  const deleted = [];
  const destroyed = [];
  const matchUpdates = [];
  const modelWithDelete = (rows = []) => ({
    find: () => leanSelectChain(rows),
    deleteMany: async (filter) => { deleted.push(filter); },
  });
  const result = await deleteHostedTournamentDraft({
    user: { _id: '650000000000000000000013', team: tournament.hostTeam },
    tournamentId: tournament._id,
    tournamentModel: { findOne: async () => tournament },
    participantModel: modelWithDelete([{ logo: { publicId: 'participant-logo' } }]),
    squadModel: modelWithDelete(),
    squadPlayerModel: modelWithDelete([{ photo: { publicId: 'player-photo' } }]),
    squadHistoryModel: modelWithDelete(),
    lineupModel: modelWithDelete([{ _id: '650000000000000000000020' }]),
    lineupHistoryModel: modelWithDelete(),
    reviewModel: modelWithDelete(),
    matchModel: { updateMany: async (filter, update) => { matchUpdates.push({ filter, update }); } },
    storage: { destroy: async (publicId) => { destroyed.push(publicId); return { result: 'ok' }; } },
  });
  assert.deepEqual(result, { deleted: true });
  assert.equal(tournament.deleted, true);
  assert.equal(matchUpdates.length, 1);
  assert.deepEqual(matchUpdates[0].filter, { tournamentCompetition: tournament._id });
  assert.equal(Object.hasOwn(matchUpdates[0].update.$unset, 'tournamentCompetition'), true);
  assert.ok(deleted.length >= 6);
  assert.deepEqual(destroyed.sort(), ['cover-secret', 'logo-secret', 'participant-logo', 'player-photo'].sort());
});

test('tournament delete blocks completed tournaments only', async () => {
  await assert.rejects(deleteHostedTournamentDraft({
    user: { _id: '650000000000000000000013', team: '650000000000000000000011' },
    tournamentId: '650000000000000000000010',
    tournamentModel: { findOne: async () => tournamentDoc({ lifecycleStatus: 'completed' }) },
  }), (error) => error.code === 'TOURNAMENT_DELETE_BLOCKED');
});

test('submission rules split intra-college and inter-college requirements', async () => {
  const inter = tournamentDoc({ scope: 'inter_college' });
  await submitForApproval({
    user: { _id: '650000000000000000000013', team: inter.hostTeam },
    tournamentId: inter._id,
    tournamentModel: { findOne: async () => inter },
    participantModel: { find: () => leanSelectChain([]) },
    createHistory: async () => {},
    notifyApprovalSubmitted: async () => {},
  });
  assert.equal(inter.approvalStatus, 'approval_pending');

  const intra = tournamentDoc({ scope: 'intra_college' });
  await assert.rejects(submitForApproval({
    user: { _id: '650000000000000000000013', team: intra.hostTeam },
    tournamentId: intra._id,
    tournamentModel: { findOne: async () => intra },
    participantModel: { find: () => leanSelectChain([{ participantType: 'intra_team', displayName: 'CSE' }]) },
    createHistory: async () => {},
    notifyApprovalSubmitted: async () => {},
  }), (error) => error.code === 'TOURNAMENT_APPROVAL_REQUIRED' && /Add at least 2 intra-college teams/.test(error.message));

  const invalidIntra = tournamentDoc({ scope: 'intra_college' });
  await assert.rejects(submitForApproval({
    user: { _id: '650000000000000000000013', team: invalidIntra.hostTeam },
    tournamentId: invalidIntra._id,
    tournamentModel: { findOne: async () => invalidIntra },
    participantModel: { find: () => leanSelectChain([{ participantType: 'intra_team' }, { participantType: 'external_team' }]) },
    createHistory: async () => {},
    notifyApprovalSubmitted: async () => {},
  }), (error) => error.code === 'TOURNAMENT_APPROVAL_REQUIRED' && /only intra-college teams/.test(error.message));
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

test('validation middleware returns a specific actionable message', async () => {
  const req = {
    params: { tournamentId: '650000000000000000000001' },
    body: { displayName: '', seed: '9999' },
  };
  await runValidators(manualParticipantValidator, req);
  let capturedError;
  validateWithStatus(400)(req, {}, (error) => {
    capturedError = error;
  });
  assert.equal(capturedError.statusCode, 400);
  assert.doesNotMatch(capturedError.message, /highlighted fields/i);
  assert.match(capturedError.message, /Display name|Seed|Please fix/);
  assert.ok(capturedError.details.length >= 1);
});

test('tournament duplicate key errors use participant-specific copy', () => {
  let statusCode;
  let payload;
  const duplicateError = {
    code: 11000,
    keyPattern: { tournament: 1, normalizedName: 1 },
    keyValue: { tournament: '650000000000000000000001', normalizedName: 'ims fc' },
    message: 'E11000 duplicate key error collection: footstream.tournamentparticipants index: tournament_1_normalizedName_1 dup key',
  };
  errorHandler(duplicateError, { id: 'req-test' }, {
    status(code) {
      statusCode = code;
      return this;
    },
    json(data) {
      payload = data;
    },
  });
  assert.equal(statusCode, 409);
  assert.equal(payload.error.code, 'TOURNAMENT_PARTICIPANT_EXISTS');
  assert.match(payload.error.message, /participant/i);
  assert.doesNotMatch(payload.error.message, /team slug/i);
});

test('tournament routes are registered without frontend or challenge restoration', () => {
  const teamRoutes = readFileSync(resolve('src/routes/teamRoutes.js'), 'utf8');
  const adminRoutes = readFileSync(resolve('src/routes/adminRoutes.js'), 'utf8');
  const publicRoutes = readFileSync(resolve('src/routes/publicRoutes.js'), 'utf8');
  assert.match(teamRoutes, /hosted-tournaments/);
  assert.match(teamRoutes, /participants\/registered/);
  assert.match(teamRoutes, /hosted-tournaments\/:tournamentId\/logo/);
  assert.match(teamRoutes, /hosted-tournaments\/:tournamentId\/cover/);
  assert.match(teamRoutes, /participants\/:participantId\/logo/);
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

test('admin tournament list supports an explicit archived queue filter', async () => {
  let capturedFilter;
  const tournamentModel = {
    find: (filter) => {
      capturedFilter = filter;
      const chain = {
        sort: () => chain,
        skip: () => chain,
        limit: () => chain,
        lean: async () => [],
      };
      return chain;
    },
    countDocuments: async () => 0,
  };
  const result = await listTournamentsForAdmin({ tournamentModel, query: { archived: 'true' } });
  assert.deepEqual(capturedFilter, { isArchived: true });
  assert.equal(result.tournaments.length, 0);
});
