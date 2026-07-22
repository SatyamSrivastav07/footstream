import test from 'node:test';
import assert from 'node:assert/strict';
import { validationResult } from 'express-validator';
import { startMatch } from '../src/services/liveMatchService.js';
import { submitTeamDirectResult } from '../src/services/directResultService.js';
import { aggregateCompletedData, loadTeamData } from '../src/services/statisticsService.js';
import { directResultValidator } from '../src/validators/directResultValidators.js';

const teamId = '65a000000000000000000001';
const opponentTeamId = '65a000000000000000000099';
const matchId = '65a000000000000000000002';
const userId = '65a000000000000000000003';
const playerId = (number) => `65b0000000000000000000${String(number).padStart(2, '0')}`;

const snapshot = (number, overrides = {}) => ({
  player: playerId(number),
  name: `Player ${number}`,
  jerseyNumber: number,
  position: number === 1 ? 'GK' : 'CM',
  isCaptain: number === 2,
  photoUrl: '',
  ...overrides,
});

const match = (overrides = {}) => ({
  _id: matchId,
  team: teamId,
  opponent: { name: 'Rivals', temporaryPlayers: [] },
  teamSide: 'home',
  matchMode: 'direct',
  matchFormat: '11v11',
  status: 'scheduled',
  currentPeriod: 'not_started',
  startingXI: Array.from({ length: 11 }, (_, index) => snapshot(index + 1)),
  substitutes: [snapshot(12), snapshot(13)],
  scheduledAt: new Date('2030-01-01T10:00:00Z'),
  venue: 'Ground',
  tournament: '',
  matchType: 'friendly',
  lastEventSequence: 0,
  isActive: true,
  async save() { this.saved = true; return this; },
  toJSON() { return { ...this, save: undefined, toJSON: undefined }; },
  ...overrides,
});

const modelFor = (value) => ({ findOne: async (filter) => (String(filter.team) === teamId ? value : null) });

const eventStore = () => {
  const store = [];
  return {
    store,
    deleteMany: async () => { store.length = 0; },
    create: async (events) => { store.push(...events); return events; },
    find: () => ({ sort: () => ({ lean: async () => store }) }),
  };
};

const query = (value) => ({
  populate() { return this; },
  sort() { return this; },
  select() { return this; },
  lean: async () => value,
});

test('direct result submission creates canonical events and updates statistics source data', async () => {
  const value = match();
  const events = eventStore();
  const data = await submitTeamDirectResult({
    matchModel: modelFor(value),
    eventModel: events,
    teamId,
    matchId,
    userId,
    input: {
      finalTeamScore: 2,
      finalOpponentScore: 1,
      goals: [
        { scoringSide: 'team', playerId: playerId(9), assistPlayerId: playerId(10), minute: 12 },
        { scoringSide: 'team', playerId: playerId(11), minute: 60 },
        { scoringSide: 'opponent', temporaryOpponentPlayerName: 'Opponent Nine', minute: 70 },
      ],
      yellowCards: [{ side: 'team', playerId: playerId(4), minute: 22 }],
      substitutions: [{ playerOutId: playerId(6), playerInId: playerId(12), minute: 55 }],
      manOfTheMatchPlayerId: playerId(9),
      completionNotes: 'Won well.',
      matchDuration: 90,
      refereeName: 'Ref One',
    },
  });

  assert.equal(value.status, 'completed');
  assert.equal(value.homeScore, 2);
  assert.equal(value.awayScore, 1);
  assert.equal(value.result.outcome, 'win');
  assert.equal(value.lastEventSequence, 5);
  assert.equal(data.events.length, 5);
  const stats = aggregateCompletedData([value], events.store);
  assert.equal(stats.players.find((player) => player.playerId === playerId(9)).goals, 1);
  assert.equal(stats.players.find((player) => player.playerId === playerId(10)).assists, 1);
  assert.equal(stats.players.find((player) => player.playerId === playerId(4)).yellowCards, 1);
  assert.equal(stats.players.find((player) => player.playerId === playerId(12)).substituteAppearances, 1);
});

test('direct result goal scorers and assists may come from starters or substitutes', async () => {
  const value = match();
  const events = eventStore();
  await submitTeamDirectResult({
    matchModel: modelFor(value),
    eventModel: events,
    teamId,
    matchId,
    userId,
    input: {
      finalTeamScore: 1,
      finalOpponentScore: 0,
      goals: [{ scoringSide: 'team', playerId: playerId(12), assistPlayerId: playerId(13), minute: 80 }],
    },
  });

  assert.equal(events.store[0].playerSnapshot.name, 'Player 12');
  assert.equal(events.store[0].assistPlayerSnapshot.name, 'Player 13');
  const stats = aggregateCompletedData([value], events.store);
  assert.equal(stats.players.find((player) => player.playerId === playerId(12)).goals, 1);
  assert.equal(stats.players.find((player) => player.playerId === playerId(13)).assists, 1);
});

test('direct result accepts a starting lineup without a dedicated goalkeeper', async () => {
  const value = match({
    startingXI: Array.from({ length: 11 }, (_, index) => snapshot(index + 1, { position: 'CM' })),
  });
  const events = eventStore();
  await submitTeamDirectResult({
    matchModel: modelFor(value),
    eventModel: events,
    teamId,
    matchId,
    userId,
    input: {
      finalTeamScore: 1,
      finalOpponentScore: 0,
      goals: [{ scoringSide: 'team', playerId: playerId(9), minute: 42 }],
    },
  });

  assert.equal(value.status, 'completed');
  assert.equal(events.store[0].playerSnapshot.position, 'CM');
});

test('editing direct result replaces previous events instead of double counting', async () => {
  const value = match({ status: 'completed' });
  const events = eventStore();
  await submitTeamDirectResult({
    matchModel: modelFor(value),
    eventModel: events,
    teamId,
    matchId,
    userId,
    input: { finalTeamScore: 1, finalOpponentScore: 0, goals: [{ scoringSide: 'team', playerId: playerId(9) }] },
  });
  await submitTeamDirectResult({
    matchModel: modelFor(value),
    eventModel: events,
    teamId,
    matchId,
    userId,
    input: { finalTeamScore: 0, finalOpponentScore: 1, goals: [{ scoringSide: 'opponent', temporaryOpponentPlayerName: 'Opponent Ten' }] },
  });

  assert.equal(events.store.length, 1);
  assert.equal(value.result.outcome, 'loss');
  assert.equal(aggregateCompletedData([value], events.store).team.goalsFor, 0);
});

test('direct result accepts matching score and goal counts with null and empty minute fields', async () => {
  const value = match();
  const events = eventStore();
  await submitTeamDirectResult({
    matchModel: modelFor(value),
    eventModel: events,
    teamId,
    matchId,
    userId,
    input: {
      finalTeamScore: 1,
      finalOpponentScore: 1,
      goals: [
        { scoringSide: 'team', playerId: playerId(9), minute: null },
        { scoringSide: 'opponent', temporaryOpponentPlayerName: 'Opponent Nine', minute: '' },
      ],
      yellowCards: [{ side: 'team', playerId: playerId(4), minute: null }],
      substitutions: [{ playerOutId: playerId(6), playerInId: playerId(12), minute: '' }],
    },
  });

  assert.equal(value.homeScore, 1);
  assert.equal(value.awayScore, 1);
  assert.equal(events.store.length, 4);
  assert.equal(events.store[0].minute, 0);
  assert.equal(events.store[1].minute, 0);
});

test('direct result goal scorer and assist can come from the selected bench', async () => {
  const value = match();
  const events = eventStore();
  await submitTeamDirectResult({
    matchModel: modelFor(value),
    eventModel: events,
    teamId,
    matchId,
    userId,
    input: {
      finalTeamScore: 1,
      finalOpponentScore: 0,
      goals: [{ scoringSide: 'team', playerId: playerId(12), assistPlayerId: playerId(13), minute: 78 }],
    },
  });

  assert.equal(events.store[0].playerSnapshot.name, 'Player 12');
  assert.equal(events.store[0].assistPlayerSnapshot.name, 'Player 13');
  const stats = aggregateCompletedData([value], events.store);
  assert.equal(stats.players.find((player) => player.playerId === playerId(12)).goals, 1);
  assert.equal(stats.players.find((player) => player.playerId === playerId(13)).assists, 1);
});

test('direct result substitutions update current field and bench state by row', async () => {
  const value = match();
  const events = eventStore();
  await submitTeamDirectResult({
    matchModel: modelFor(value),
    eventModel: events,
    teamId,
    matchId,
    userId,
    input: {
      finalTeamScore: 0,
      finalOpponentScore: 0,
      goals: [],
      substitutions: [
        { playerOutId: playerId(6), playerInId: playerId(12), minute: 55 },
        { playerOutId: playerId(12), playerInId: playerId(13), minute: 80 },
      ],
    },
  });

  const substitutions = events.store.filter((event) => event.type === 'substitution');
  assert.equal(substitutions.length, 2);
  assert.equal(substitutions[1].playerOutSnapshot.name, 'Player 12');
  assert.equal(substitutions[1].playerInSnapshot.name, 'Player 13');

  await assert.rejects(submitTeamDirectResult({
    matchModel: modelFor(match()),
    eventModel: eventStore(),
    teamId,
    matchId,
    userId,
    input: {
      finalTeamScore: 0,
      finalOpponentScore: 0,
      goals: [],
      substitutions: [{ playerOutId: playerId(6), playerInId: playerId(7), minute: 55 }],
    },
  }), (error) => error.code === 'PLAYER_NOT_ON_BENCH');
});

test('direct result stores registered opponent scorer snapshots for collaboration statistics', async () => {
  const opponentScorer = snapshot(20, { player: playerId(20), registeredPlayer: playerId(20), sourceType: 'registered', name: 'Opponent Scorer' });
  const opponentAssist = snapshot(21, { player: playerId(21), registeredPlayer: playerId(21), sourceType: 'registered', name: 'Opponent Assist' });
  const value = match({
    registeredOpponentStartingXI: [opponentScorer, opponentAssist, ...Array.from({ length: 9 }, (_, index) => snapshot(index + 30, { registeredPlayer: playerId(index + 30), sourceType: 'registered' }))],
    registeredOpponentSubstitutes: [],
  });
  const events = eventStore();

  await submitTeamDirectResult({
    matchModel: modelFor(value),
    eventModel: events,
    teamId,
    matchId,
    userId,
    input: {
      finalTeamScore: 0,
      finalOpponentScore: 1,
      goals: [{ scoringSide: 'opponent', opponentPlayerId: playerId(20), opponentAssistPlayerId: playerId(21), minute: 30 }],
    },
  });

  assert.equal(events.store[0].playerSnapshot.name, 'Opponent Scorer');
  assert.equal(events.store[0].assistPlayerSnapshot.name, 'Opponent Assist');
  assert.equal(events.store[0].temporaryOpponentPlayerName, '');

  value.registeredOpponentTeam = opponentTeamId;
  const stats = await loadTeamData({
    teamId: opponentTeamId,
    collaborationModel: { find: () => query([{ match: matchId }]) },
    matchModel: {
      find: (filter) => query(filter.registeredOpponentTeam ? [value] : []),
    },
    eventModel: { find: () => query(events.store) },
  });

  assert.equal(stats.players.find((player) => player.playerId === playerId(20)).goals, 1);
  assert.equal(stats.players.find((player) => player.playerId === playerId(21)).assists, 1);
});

test('direct result allows the same opponent scorer and assist for multiple goals', async () => {
  const opponentScorer = snapshot(20, { player: playerId(20), registeredPlayer: playerId(20), sourceType: 'registered', name: 'Opponent Scorer' });
  const opponentAssist = snapshot(21, { player: playerId(21), registeredPlayer: playerId(21), sourceType: 'registered', name: 'Opponent Assist' });
  const value = match({
    registeredOpponentStartingXI: [opponentScorer, opponentAssist, ...Array.from({ length: 9 }, (_, index) => snapshot(index + 30, { registeredPlayer: playerId(index + 30), sourceType: 'registered' }))],
    registeredOpponentSubstitutes: [],
  });
  const events = eventStore();

  await submitTeamDirectResult({
    matchModel: modelFor(value),
    eventModel: events,
    teamId,
    matchId,
    userId,
    input: {
      finalTeamScore: 0,
      finalOpponentScore: 2,
      goals: [
        { scoringSide: 'opponent', opponentPlayerId: playerId(20), opponentAssistPlayerId: playerId(21), minute: null },
        { scoringSide: 'opponent', opponentPlayerId: playerId(20), opponentAssistPlayerId: playerId(21), minute: '' },
      ],
    },
  });

  assert.equal(events.store.length, 2);
  value.registeredOpponentTeam = opponentTeamId;
  const stats = await loadTeamData({
    teamId: opponentTeamId,
    collaborationModel: { find: () => query([{ match: matchId }]) },
    matchModel: { find: (filter) => query(filter.registeredOpponentTeam ? [value] : []) },
    eventModel: { find: () => query(events.store) },
  });

  assert.equal(stats.players.find((player) => player.playerId === playerId(20)).goals, 2);
  assert.equal(stats.players.find((player) => player.playerId === playerId(21)).assists, 2);
});

test('direct result validator accepts null temporary opponent names for registered opponent selections', async () => {
  const req = {
    params: { matchId },
    body: {
      finalTeamScore: 0,
      finalOpponentScore: 3,
      goals: [
        { scoringSide: 'opponent', opponentPlayerId: playerId(20), opponentAssistPlayerId: null, temporaryOpponentPlayerName: null, minute: null },
        { scoringSide: 'opponent', opponentPlayerId: playerId(21), opponentAssistPlayerId: playerId(22), temporaryOpponentPlayerName: null, minute: '' },
        { scoringSide: 'opponent', opponentPlayerId: playerId(23), temporaryOpponentPlayerName: null },
      ],
      yellowCards: [{ side: 'opponent', opponentPlayerId: playerId(20), temporaryOpponentPlayerName: null, minute: null }],
      redCards: [],
      substitutions: [],
    },
  };

  await Promise.all(directResultValidator.map((validator) => validator.run(req)));
  assert.deepEqual(validationResult(req).array(), []);
});

test('direct result rejects stream matches and score mismatch', async () => {
  await assert.rejects(submitTeamDirectResult({
    matchModel: modelFor(match({ matchMode: 'stream' })),
    eventModel: eventStore(),
    teamId,
    matchId,
    userId,
    input: { finalTeamScore: 0, finalOpponentScore: 0 },
  }), (error) => error.code === 'MATCH_NOT_DIRECT');

  await assert.rejects(submitTeamDirectResult({
    matchModel: modelFor(match()),
    eventModel: eventStore(),
    teamId,
    matchId,
    userId,
    input: { finalTeamScore: 2, finalOpponentScore: 0, goals: [{ scoringSide: 'team', playerId: playerId(9) }] },
  }), (error) => error.code === 'DIRECT_TEAM_SCORE_MISMATCH' && error.message === 'Team score is 2, but 1 team goal entry has been added.');
});

test('direct result returns clear opponent score mismatch message', async () => {
  await assert.rejects(submitTeamDirectResult({
    matchModel: modelFor(match()),
    eventModel: eventStore(),
    teamId,
    matchId,
    userId,
    input: { finalTeamScore: 0, finalOpponentScore: 0, goals: [{ scoringSide: 'opponent', temporaryOpponentPlayerName: 'Opponent Nine' }] },
  }), (error) => error.code === 'DIRECT_OPPONENT_SCORE_MISMATCH' && error.message === 'Opponent score is 0, but 1 opponent goal entry has been added.');
});

test('direct matches cannot enter live workflow', async () => {
  const value = match();
  await assert.rejects(startMatch({ matchModel: modelFor(value), teamId, matchId, userId }), (error) => error.code === 'DIRECT_MATCH_NO_LIVE');
});
