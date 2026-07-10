import assert from 'node:assert/strict';
import test from 'node:test';
import { requireRole } from '../src/middleware/auth.js';
import { USER_ROLES } from '../src/models/User.js';
import {
  assertActiveAccount,
  createPlayerForTeam,
  enforceSquadRules,
  getPlayerForTeam,
  softDeletePlayerForTeam,
  validateLeadership,
} from '../src/services/playerService.js';

const ids = {
  teamA: '64b000000000000000000001',
  teamB: '64b000000000000000000002',
  user: '64b000000000000000000003',
  player: '64b000000000000000000004',
};

const document = (values) => ({
  ...values,
  async save() { this.saved = true; return this; },
  toObject() { return { ...this }; },
  toJSON() { return { ...this }; },
});

test('team admin creates a player for own team and cannot assign another team', async () => {
  let created;
  const model = {
    exists: async () => null,
    create: async (values) => { created = document(values); return created; },
  };

  const player = await createPlayerForTeam({
    model,
    teamId: ids.teamA,
    userId: ids.user,
    input: { team: ids.teamB, name: 'Maya Singh', position: 'CM', jerseyNumber: 8 },
  });

  assert.equal(created.team, ids.teamA);
  assert.equal(player.team, ids.teamA);
  assert.equal(created.createdBy, ids.user);
});

test('team admin cannot read another team player', async () => {
  const model = {
    findOne: async (filter) => {
      assert.equal(filter.team, ids.teamA);
      return null;
    },
  };

  await assert.rejects(
    getPlayerForTeam({ model, teamId: ids.teamA, playerId: ids.player }),
    (error) => error.statusCode === 404 && error.code === 'PLAYER_NOT_FOUND',
  );
});

test('duplicate active jersey number is rejected', async () => {
  const model = { exists: async (filter) => (filter.jerseyNumber === 10 ? { _id: ids.player } : null) };
  await assert.rejects(
    enforceSquadRules({ model, teamId: ids.teamA, values: { isActive: true, jerseyNumber: 10 } }),
    (error) => error.statusCode === 409 && error.code === 'JERSEY_IN_USE',
  );
});

test('only one active captain is allowed per team', async () => {
  const model = { exists: async (filter) => (filter.isCaptain ? { _id: ids.player } : null) };
  await assert.rejects(
    enforceSquadRules({ model, teamId: ids.teamA, values: { isActive: true, isCaptain: true } }),
    (error) => error.code === 'CAPTAIN_EXISTS',
  );
});

test('only one active vice-captain is allowed per team', async () => {
  const model = { exists: async (filter) => (filter.isViceCaptain ? { _id: ids.player } : null) };
  await assert.rejects(
    enforceSquadRules({ model, teamId: ids.teamA, values: { isActive: true, isViceCaptain: true } }),
    (error) => error.code === 'VICE_CAPTAIN_EXISTS',
  );
});

test('player cannot be captain and vice-captain', () => {
  assert.throws(
    () => validateLeadership({ isCaptain: true, isViceCaptain: true }),
    (error) => error.statusCode === 422 && error.code === 'LEADERSHIP_CONFLICT',
  );
});

test('soft delete deactivates player and clears leadership', async () => {
  const playerDocument = document({ isActive: true, isCaptain: true, isViceCaptain: false });
  const model = { findOne: async (filter) => (filter.team === ids.teamA ? playerDocument : null) };

  const result = await softDeletePlayerForTeam({
    model,
    teamId: ids.teamA,
    playerId: ids.player,
    userId: ids.user,
  });

  assert.equal(result.isActive, false);
  assert.equal(result.isCaptain, false);
  assert.equal(result.isViceCaptain, false);
  assert.equal(playerDocument.saved, true);
});

test('suspended or disabled team admin remains blocked by Phase 1 account rule', () => {
  assert.throws(
    () => assertActiveAccount({ isActive: false }),
    (error) => error.statusCode === 401 && error.code === 'ACCOUNT_UNAVAILABLE',
  );
});

test('super admin can access squad view and team admin cannot access super-admin squad route', () => {
  const middleware = requireRole(USER_ROLES.SUPER_ADMIN);
  let allowed = false;
  middleware({ user: { role: USER_ROLES.SUPER_ADMIN } }, {}, () => { allowed = true; });
  assert.equal(allowed, true);

  let denied;
  middleware({ user: { role: USER_ROLES.TEAM_ADMIN } }, {}, (error) => { denied = error; });
  assert.equal(denied.statusCode, 403);
  assert.equal(denied.code, 'FORBIDDEN');
});
