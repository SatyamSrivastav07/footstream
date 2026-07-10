import assert from 'node:assert/strict';
import test from 'node:test';
import { validationResult } from 'express-validator';
import { requireRole } from '../src/middleware/auth.js';
import { USER_ROLES } from '../src/models/User.js';
import {
  assertScheduled,
  buildLineupSnapshots,
  cancelMatchForTeam,
  createMatchForTeam,
  getOwnedMatch,
  playerSnapshot,
  updateMatchForTeam,
  validateFormation,
  validateSelections,
} from '../src/services/matchService.js';
import { createMatchValidator } from '../src/validators/matchValidators.js';

const ids = {
  teamA: '64c000000000000000000001',
  teamB: '64c000000000000000000002',
  user: '64c000000000000000000003',
  match: '64c000000000000000000004',
};

const playerId = (index) => `64d0000000000000000000${String(index).padStart(2, '0')}`;
const starterIds = Array.from({ length: 11 }, (_, index) => playerId(index + 1));
const substituteIds = [playerId(12), playerId(13)];
const future = '2035-06-15T14:30:00.000Z';

const makePlayer = (id, overrides = {}) => ({
  _id: id,
  team: ids.teamA,
  name: `Player ${id.slice(-2)}`,
  jerseyNumber: Number(id.slice(-2)),
  position: 'CM',
  photoUrl: 'https://example.com/player.jpg',
  isCaptain: false,
  isViceCaptain: false,
  isActive: true,
  availabilityStatus: 'available',
  ...overrides,
});

const allPlayers = [...starterIds, ...substituteIds].map((id) => makePlayer(id));
const playerModel = (players = allPlayers) => ({ find: async () => players });
const document = (values) => ({
  ...values,
  async save() { this.saved = true; return this; },
  toJSON() { return { ...this }; },
});

const input = (overrides = {}) => ({
  opponent: { name: 'Riverside United', temporaryPlayers: [{ name: 'Guest Forward', position: 'ST', jerseyNumber: 9 }] },
  tournament: 'Campus Cup',
  venue: 'Central Ground',
  matchType: 'league',
  teamSide: 'home',
  scheduledAt: future,
  formation: '4-3-3',
  customFormation: '',
  startingPlayerIds: starterIds,
  substitutePlayerIds: substituteIds,
  notes: 'Arrive one hour early.',
  ...overrides,
});

test('team admin creates a match for own team and server builds snapshots', async () => {
  let created;
  const matchModel = { create: async (values) => { created = document(values); return created; } };
  const result = await createMatchForTeam({
    matchModel,
    playerModel: playerModel(),
    teamId: ids.teamA,
    userId: ids.user,
    input: input({ team: ids.teamB, teamId: ids.teamB, status: 'completed' }),
    now: new Date('2030-01-01T00:00:00Z'),
  });
  assert.equal(created.team, ids.teamA);
  assert.equal(created.status, 'scheduled');
  assert.equal(result.startingXI.length, 11);
  assert.equal(result.substitutes.length, 2);
});

test('team and teamId request fields and completed status are rejected by validation', async () => {
  const req = { body: input({ team: ids.teamB, teamId: ids.teamB, status: 'completed' }) };
  await Promise.all(createMatchValidator.map((validator) => validator.run(req)));
  const errors = validationResult(req).array();
  assert.ok(errors.some((error) => error.msg.includes('Unsupported match fields')));
});

test('exactly 11 unique starters are required', () => {
  assert.throws(() => validateSelections(starterIds.slice(0, 10), []), (error) => error.code === 'STARTING_XI_SIZE');
  assert.throws(() => validateSelections([...starterIds.slice(0, 10), starterIds[0]], []), (error) => error.code === 'DUPLICATE_STARTER');
});

test('starter and substitute overlap is rejected', () => {
  assert.throws(() => validateSelections(starterIds, [starterIds[0]]), (error) => error.code === 'LINEUP_OVERLAP');
});

test('cross-team player is rejected', async () => {
  const players = allPlayers.map((player, index) => index === 0 ? { ...player, team: ids.teamB } : player);
  await assert.rejects(buildLineupSnapshots({ playerModel: playerModel(players), teamId: ids.teamA, startingPlayerIds: starterIds, substitutePlayerIds: substituteIds }), (error) => error.code === 'INVALID_TEAM_PLAYER');
});

for (const status of ['injured', 'suspended', 'unavailable']) {
  test(`${status} player is rejected`, async () => {
    const players = allPlayers.map((player, index) => index === 0 ? { ...player, availabilityStatus: status } : player);
    await assert.rejects(buildLineupSnapshots({ playerModel: playerModel(players), teamId: ids.teamA, startingPlayerIds: starterIds, substitutePlayerIds: substituteIds }), (error) => error.code === 'PLAYER_UNAVAILABLE');
  });
}

test('inactive player is rejected', async () => {
  const players = allPlayers.map((player, index) => index === 0 ? { ...player, isActive: false } : player);
  await assert.rejects(buildLineupSnapshots({ playerModel: playerModel(players), teamId: ids.teamA, startingPlayerIds: starterIds, substitutePlayerIds: substituteIds }), (error) => error.code === 'INACTIVE_PLAYER');
});

test('custom formation requires a description and standard formation rejects one', () => {
  assert.throws(() => validateFormation('custom', ''), (error) => error.code === 'CUSTOM_FORMATION_REQUIRED');
  assert.throws(() => validateFormation('4-3-3', '2-3-5'), (error) => error.code === 'CUSTOM_FORMATION_NOT_ALLOWED');
  assert.doesNotThrow(() => validateFormation('custom', '2-3-2-3'));
});

test('snapshot copies match-day player values and later profile edits do not mutate it', () => {
  const source = makePlayer(starterIds[0], { name: 'Original Name', jerseyNumber: 7, position: 'RW', isCaptain: true });
  const snapshot = playerSnapshot(source);
  source.name = 'Changed Name'; source.jerseyNumber = 19; source.position = 'ST';
  assert.equal(snapshot.name, 'Original Name');
  assert.equal(snapshot.jerseyNumber, 7);
  assert.equal(snapshot.position, 'RW');
  assert.equal(snapshot.isCaptain, true);
});

test('team admin cannot read another team match', async () => {
  const matchModel = { findOne: async (filter) => filter.team === ids.teamA ? null : document({}) };
  await assert.rejects(getOwnedMatch({ matchModel, teamId: ids.teamA, matchId: ids.match }), (error) => error.statusCode === 404);
});

test('team admin cannot edit another team match', async () => {
  const matchModel = { findOne: async () => null };
  await assert.rejects(updateMatchForTeam({ matchModel, playerModel: playerModel(), teamId: ids.teamA, matchId: ids.match, userId: ids.user, input: { venue: 'New Ground' } }), (error) => error.code === 'MATCH_NOT_FOUND');
});

test('only scheduled matches can be edited and cancelled match cannot be edited', () => {
  assert.throws(() => assertScheduled({ status: 'cancelled' }), (error) => error.code === 'MATCH_NOT_SCHEDULED');
  assert.throws(() => assertScheduled({ status: 'completed' }), (error) => error.code === 'MATCH_NOT_SCHEDULED');
  assert.doesNotThrow(() => assertScheduled({ status: 'scheduled' }));
});

test('scheduled match can be cancelled', async () => {
  const match = document({ status: 'scheduled', team: ids.teamA });
  const matchModel = { findOne: async () => match };
  const result = await cancelMatchForTeam({ matchModel, teamId: ids.teamA, matchId: ids.match, userId: ids.user, now: new Date('2031-01-01') });
  assert.equal(result.status, 'cancelled');
  assert.ok(result.cancelledAt);
  assert.equal(match.saved, true);
});

test('super admin can access all-match routes and team admin cannot', () => {
  const middleware = requireRole(USER_ROLES.SUPER_ADMIN);
  let allowed = false;
  middleware({ user: { role: USER_ROLES.SUPER_ADMIN } }, {}, () => { allowed = true; });
  assert.equal(allowed, true);
  let denied;
  middleware({ user: { role: USER_ROLES.TEAM_ADMIN } }, {}, (error) => { denied = error; });
  assert.equal(denied.statusCode, 403);
});
