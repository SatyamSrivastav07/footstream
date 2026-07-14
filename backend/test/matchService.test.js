import assert from 'node:assert/strict';
import test from 'node:test';
import { validationResult } from 'express-validator';
import { requireRole } from '../src/middleware/auth.js';
import { USER_ROLES } from '../src/models/User.js';
import {
  assertScheduled,
  assertNoDuplicateScheduledMatch,
  buildOpponentLineupSnapshots,
  buildLineupSnapshots,
  cancelMatchForTeam,
  createMatchForTeam,
  getOwnedMatch,
  listOpponentPlayers,
  playerSnapshot,
  serializeMatchForTeam,
  teamMatchParticipantFilter,
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
const opponentStarterIds = Array.from({ length: 11 }, (_, index) => `64e0000000000000000000${String(index + 1).padStart(2, '0')}`);
const opponentSubstituteIds = [`64e000000000000000000012`, `64e000000000000000000013`];
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
const opponentPlayers = [...opponentStarterIds, ...opponentSubstituteIds].map((id) => makePlayer(id, { team: ids.teamB, name: `Opponent ${id.slice(-2)}` }));
const playerModel = (players = allPlayers) => ({ find: async () => players });
const filteringPlayerModel = (players = allPlayers) => ({ find: async (filter = {}) => players.filter((player) => (!filter.team || String(player.team) === String(filter.team)) && (filter.isActive === undefined || player.isActive === filter.isActive)) });
const teamModel = (teams = [{ _id: ids.teamB, name: 'IMS', shortName: 'IMS', slug: 'ims', isArchived: false }]) => ({
  findOne: async (filter) => teams.find((team) => String(team._id) === String(filter._id) && team.isArchived === false) || null,
});
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

test('registered opponent squad fetch is safe and rejects own or archived teams', async () => {
  const data = await listOpponentPlayers({ teamModel: teamModel(), playerModel: filteringPlayerModel([...opponentPlayers, makePlayer('64e000000000000000000099', { team: ids.teamB, isActive: false })]), hostTeamId: ids.teamA, opponentTeamId: ids.teamB });
  assert.equal(data.team.name, 'IMS');
  assert.equal(data.players.length, 13);
  assert.equal(data.players[0].createdBy, undefined);
  assert.equal(data.players[0].photo, undefined);
  await assert.rejects(listOpponentPlayers({ teamModel: teamModel(), playerModel: playerModel(), hostTeamId: ids.teamA, opponentTeamId: ids.teamA }), (error) => error.code === 'OPPONENT_OWN_TEAM');
  await assert.rejects(listOpponentPlayers({ teamModel: teamModel([{ _id: ids.teamB, name: 'IMS', isArchived: true }]), playerModel: playerModel(), hostTeamId: ids.teamA, opponentTeamId: ids.teamB }), (error) => error.code === 'OPPONENT_TEAM_NOT_FOUND');
});

test('registered opponent match create derives team name and stores mixed snapshots', async () => {
  let created;
  const matchModel = { create: async (values) => { created = document(values); return created; } };
  await createMatchForTeam({
    matchModel,
    teamModel: teamModel(),
    playerModel: playerModel([...allPlayers, ...opponentPlayers]),
    teamId: ids.teamA,
    userId: ids.user,
    input: input({
      opponentMode: 'registered',
      opponent: undefined,
      registeredOpponentTeam: ids.teamB,
      opponentLineup: {
        starting: [...opponentStarterIds.slice(0, 10).map((id) => ({ sourceType: 'registered', playerId: id })), { sourceType: 'temporary', name: 'Guest Trialist', position: 'ST', jerseyNumber: 77 }],
        substitutes: [{ sourceType: 'registered', playerId: opponentSubstituteIds[0] }],
      },
    }),
    now: new Date('2030-01-01T00:00:00Z'),
  });
  assert.equal(created.registeredOpponentTeam, ids.teamB);
  assert.equal(created.opponent.name, 'IMS');
  assert.equal(created.registeredOpponentStartingXI.length, 11);
  assert.equal(created.registeredOpponentStartingXI.at(-1).sourceType, 'temporary');
  assert.equal(created.registeredOpponentStartingXI[0].name, 'Opponent 01');
});

test('opponent lineup validation enforces counts duplicates team ownership and active status', async () => {
  await assert.rejects(buildOpponentLineupSnapshots({
    playerModel: playerModel(opponentPlayers),
    opponentTeamId: ids.teamB,
    matchFormat: '5v5',
    opponentLineup: { starting: opponentStarterIds.slice(0, 4).map((id) => ({ sourceType: 'registered', playerId: id })) },
  }), (error) => error.code === 'OPPONENT_STARTING_XI_SIZE');
  await assert.rejects(buildOpponentLineupSnapshots({
    playerModel: playerModel(opponentPlayers),
    opponentTeamId: ids.teamB,
    opponentLineup: { starting: [...opponentStarterIds.slice(0, 10), opponentStarterIds[0]].map((id) => ({ sourceType: 'registered', playerId: id })) },
  }), (error) => error.code === 'OPPONENT_DUPLICATE_STARTER');
  await assert.rejects(buildOpponentLineupSnapshots({
    playerModel: playerModel([...opponentPlayers, makePlayer(starterIds[0], { team: ids.teamA })]),
    opponentTeamId: ids.teamB,
    opponentLineup: { starting: [...opponentStarterIds.slice(0, 10).map((id) => ({ sourceType: 'registered', playerId: id })), { sourceType: 'registered', playerId: starterIds[0] }] },
  }), (error) => error.code === 'INVALID_OPPONENT_PLAYER');
  await assert.rejects(buildOpponentLineupSnapshots({
    playerModel: playerModel(opponentPlayers.map((player, index) => index === 0 ? { ...player, isActive: false } : player)),
    opponentTeamId: ids.teamB,
    opponentLineup: { starting: opponentStarterIds.map((id) => ({ sourceType: 'registered', playerId: id })) },
  }), (error) => error.code === 'INACTIVE_OPPONENT_PLAYER');
});

test('opponent snapshots are historical and host cannot overwrite opponent-managed lineup', async () => {
  const snapshots = await buildOpponentLineupSnapshots({
    playerModel: playerModel(opponentPlayers),
    opponentTeamId: ids.teamB,
    opponentLineup: { starting: opponentStarterIds.map((id) => ({ sourceType: 'registered', playerId: id })) },
  });
  opponentPlayers[0].name = 'Changed Later';
  assert.equal(snapshots.registeredOpponentStartingXI[0].name, 'Opponent 01');

  const match = document({
    _id: ids.match,
    status: 'scheduled',
    team: ids.teamA,
    registeredOpponentTeam: ids.teamB,
    registeredOpponentLineupManagedByOpponent: true,
    matchFormat: '11v11',
    formation: '4-3-3',
    customFormation: '',
    startingXI: starterIds.map((id) => playerSnapshot(makePlayer(id))),
    substitutes: [],
    registeredOpponentStartingXI: [],
    registeredOpponentSubstitutes: [],
  });
  const matchModel = { findOne: async () => match };
  await assert.rejects(updateMatchForTeam({
    matchModel,
    playerModel: playerModel([...allPlayers, ...opponentPlayers]),
    teamId: ids.teamA,
    matchId: ids.match,
    userId: ids.user,
    input: { opponentLineup: { starting: opponentStarterIds.map((id) => ({ sourceType: 'registered', playerId: id })) } },
  }), (error) => error.code === 'OPPONENT_LINEUP_LOCKED');
});

test('dynamic match formats require the correct starter count', () => {
  assert.doesNotThrow(() => validateSelections(starterIds.slice(0, 5), [], '5v5'));
  assert.doesNotThrow(() => validateSelections(starterIds.slice(0, 7), [], '7v7'));
  assert.doesNotThrow(() => validateSelections(starterIds, [], '11v11'));
  assert.throws(() => validateSelections(starterIds.slice(0, 4), [], '5v5'), (error) => error.code === 'STARTING_XI_SIZE');
  assert.throws(() => validateSelections(starterIds.slice(0, 6), [], '7v7'), (error) => error.code === 'STARTING_XI_SIZE');
  assert.throws(() => validateSelections(starterIds.slice(0, 10), [], '11v11'), (error) => error.code === 'STARTING_XI_SIZE');
});

test('manual match creation stores 5v5 and 7v7 formats', async () => {
  for (const [matchFormat, count, formation] of [['5v5', 5, '1-2-1'], ['7v7', 7, '2-3-1']]) {
    let created;
    const matchModel = { create: async (values) => { created = document(values); return created; } };
    await createMatchForTeam({
      matchModel,
      playerModel: playerModel(allPlayers),
      teamId: ids.teamA,
      userId: ids.user,
      input: input({ matchFormat, formation, startingPlayerIds: starterIds.slice(0, count), substitutePlayerIds: [] }),
      now: new Date('2030-01-01T00:00:00Z'),
    });
    assert.equal(created.matchFormat, matchFormat);
    assert.equal(created.startingXI.length, count);
  }
});

test('registered opponent match stores selected match format', async () => {
  let created;
  const matchModel = { create: async (values) => { created = document(values); return created; } };
  await createMatchForTeam({
    matchModel,
    teamModel: teamModel(),
    playerModel: playerModel([...allPlayers, ...opponentPlayers]),
    teamId: ids.teamA,
    userId: ids.user,
    input: input({
      matchFormat: '5v5',
      formation: '1-2-1',
      startingPlayerIds: starterIds.slice(0, 5),
      substitutePlayerIds: [],
      opponentMode: 'registered',
      opponent: undefined,
      registeredOpponentTeam: ids.teamB,
      opponentLineup: { starting: opponentStarterIds.slice(0, 5).map((id) => ({ sourceType: 'registered', playerId: id })) },
    }),
    now: new Date('2030-01-01T00:00:00Z'),
  });
  assert.equal(created.matchFormat, '5v5');
  assert.equal(created.registeredOpponentStartingXI.length, 5);
});

test('duplicate match detection is exact by opponent and kickoff time', async () => {
  const exactKickoff = new Date(future);
  const differentKickoff = new Date('2035-06-16T14:30:00.000Z');
  const calls = [];
  const matchModel = {
    findOne: async (filter) => {
      calls.push(filter);
      if (String(filter.team) === ids.teamA && String(filter.registeredOpponentTeam) === ids.teamB && filter.scheduledAt.getTime() === exactKickoff.getTime()) return { _id: ids.match };
      return null;
    },
  };
  await assert.rejects(assertNoDuplicateScheduledMatch({
    matchModel,
    teamId: ids.teamA,
    registeredOpponentTeam: ids.teamB,
    scheduledAt: exactKickoff,
  }), (error) => error.statusCode === 409 && error.code === 'MATCH_ALREADY_EXISTS');
  await assert.doesNotReject(assertNoDuplicateScheduledMatch({
    matchModel,
    teamId: ids.teamA,
    registeredOpponentTeam: ids.teamB,
    scheduledAt: differentKickoff,
  }));
  assert.equal(calls[0].status.$ne, 'cancelled');
  assert.equal(calls[0].isActive, true);
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

test('formation must match the fixture format', () => {
  assert.doesNotThrow(() => validateFormation('1-2-1', '', '5v5'));
  assert.doesNotThrow(() => validateFormation('2-3-1', '', '7v7'));
  assert.doesNotThrow(() => validateFormation('4-3-3', '', '11v11'));
  assert.throws(() => validateFormation('4-3-3', '', '5v5'), (error) => error.code === 'FORMATION_FORMAT_MISMATCH');
  assert.throws(() => validateFormation('1-2-1', '', '11v11'), (error) => error.code === 'FORMATION_FORMAT_MISMATCH');
});

test('scheduled match format can be edited and drives lineup updates', async () => {
  const match = document({
    _id: ids.match,
    status: 'scheduled',
    team: ids.teamA,
    matchFormat: '5v5',
    formation: '1-2-1',
    customFormation: '',
    startingXI: [],
    substitutes: [],
  });
  const matchModel = { findOne: async () => match };

  const result = await updateMatchForTeam({
    matchModel,
    playerModel: playerModel(),
    teamId: ids.teamA,
    matchId: ids.match,
    userId: ids.user,
    input: { matchFormat: '7v7', startingPlayerIds: starterIds.slice(0, 7), substitutePlayerIds: [starterIds[7]], formation: '2-3-1' },
  });
  assert.equal(result.matchFormat, '7v7');
  assert.equal(result.startingXI.length, 7);
  assert.equal(result.formation, '2-3-1');
});

test('team match participant filter includes host and registered opponent teams', () => {
  assert.deepEqual(teamMatchParticipantFilter(ids.teamB, { status: 'scheduled' }), {
    status: 'scheduled',
    isActive: true,
    $or: [{ team: ids.teamB }, { registeredOpponentTeam: ids.teamB }],
  });
});

test('registered opponent sees the shared fixture from their own perspective', () => {
  const match = {
    _id: ids.match,
    team: { _id: ids.teamA, name: 'KIET', slug: 'kiet' },
    registeredOpponentTeam: { _id: ids.teamB, name: 'IMS', slug: 'ims' },
    opponent: { name: 'IMS', temporaryPlayers: [] },
    teamSide: 'home',
    formation: '1-2-1',
    customFormation: '',
    registeredOpponentFormation: '2-1-1',
    registeredOpponentCustomFormation: '',
    startingXI: [{ player: starterIds[0], name: 'Host Player' }],
    substitutes: [],
    registeredOpponentStartingXI: [{ player: starterIds[1], name: 'Opponent Player' }],
    registeredOpponentSubstitutes: [],
  };
  const serialized = serializeMatchForTeam(match, ids.teamB);
  assert.equal(serialized.team.name, 'IMS');
  assert.equal(serialized.opponent.name, 'KIET');
  assert.equal(serialized.teamSide, 'away');
  assert.equal(serialized.formation, '2-1-1');
  assert.equal(serialized.startingXI[0].name, 'Opponent Player');
  assert.equal(serialized.permissions.canControlLive, false);
  assert.equal(serialized.permissions.canEditLineup, true);
});

test('registered opponent can update only its own challenge fixture lineup', async () => {
  const teamBPlayers = [...starterIds, ...substituteIds].map((id) => makePlayer(id, { team: ids.teamB }));
  const hostLineup = starterIds.slice(0, 5).map((id) => playerSnapshot(makePlayer(id)));
  const match = document({
    _id: ids.match,
    status: 'scheduled',
    team: ids.teamA,
    registeredOpponentTeam: ids.teamB,
    sourceChallenge: '65e000000000000000000001',
    matchFormat: '5v5',
    formation: '1-2-1',
    customFormation: '',
    startingXI: hostLineup,
    substitutes: [],
    registeredOpponentFormation: null,
    registeredOpponentCustomFormation: '',
    registeredOpponentStartingXI: [],
    registeredOpponentSubstitutes: [],
  });
  const matchModel = { findOne: async () => match };
  const result = await updateMatchForTeam({
    matchModel,
    playerModel: playerModel(teamBPlayers),
    teamId: ids.teamB,
    matchId: ids.match,
    userId: ids.user,
    input: { startingPlayerIds: starterIds.slice(0, 5), substitutePlayerIds: [starterIds[5]], formation: '2-1-1' },
  });
  assert.equal(match.startingXI[0].name, hostLineup[0].name);
  assert.equal(match.registeredOpponentStartingXI.length, 5);
  assert.equal(result.startingXI.length, 5);
  assert.equal(result.formation, '2-1-1');
  assert.equal(result.permissions.canControlLive, false);
});

test('registered opponent cannot edit shared fixture details', async () => {
  const match = document({
    _id: ids.match,
    status: 'scheduled',
    team: ids.teamA,
    registeredOpponentTeam: ids.teamB,
    sourceChallenge: '65e000000000000000000001',
    matchFormat: '5v5',
    formation: '1-2-1',
    customFormation: '',
    startingXI: [],
    substitutes: [],
    registeredOpponentStartingXI: [],
    registeredOpponentSubstitutes: [],
  });
  const matchModel = { findOne: async () => match };
  await assert.rejects(updateMatchForTeam({
    matchModel,
    playerModel: playerModel(),
    teamId: ids.teamB,
    matchId: ids.match,
    userId: ids.user,
    input: { venue: 'Changed Ground' },
  }), (error) => error.code === 'MATCH_OPPONENT_LINEUP_ONLY');
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
