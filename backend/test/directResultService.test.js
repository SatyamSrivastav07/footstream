import test from 'node:test';
import assert from 'node:assert/strict';
import { startMatch } from '../src/services/liveMatchService.js';
import { submitTeamDirectResult } from '../src/services/directResultService.js';
import { aggregateCompletedData } from '../src/services/statisticsService.js';

const teamId = '65a000000000000000000001';
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
