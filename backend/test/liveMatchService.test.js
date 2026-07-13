import assert from 'node:assert/strict';
import test from 'node:test';
import {
  addAssistToGoal,
  buildCurrentLineup,
  buildEventData,
  calculateElapsedSeconds,
  calculateScore,
  completeMatch,
  currentLineupEligibility,
  endFirstHalf,
  serializeLiveState,
  startMatch,
  startSecondHalf,
  undoLatestEvent,
} from '../src/services/liveMatchService.js';
import { emitToMatch, setRealtimeServer } from '../src/realtime/realtimeHub.js';
import { isValidMatchRoomId } from '../src/realtime/socketServer.js';
import { validationResult } from 'express-validator';
import { goalValidator } from '../src/validators/liveMatchValidators.js';
import { requireRole } from '../src/middleware/auth.js';
import { USER_ROLES } from '../src/models/User.js';
import publicRoutes from '../src/routes/publicRoutes.js';

const teamId = '65a000000000000000000001';
const otherTeamId = '65a000000000000000000002';
const matchId = '65a000000000000000000003';
const userId = '65a000000000000000000004';
const playerId = (number) => `65b0000000000000000000${String(number).padStart(2, '0')}`;

const snapshot = (number, overrides = {}) => ({
  player: playerId(number), name: `Player ${number}`, jerseyNumber: number, position: number === 1 ? 'GK' : 'CM',
  photoUrl: `https://example.com/${number}.jpg`, isCaptain: number === 2, isViceCaptain: number === 3, ...overrides,
});

const match = (overrides = {}) => ({
  _id: matchId, team: teamId, opponent: { name: 'Rivals', temporaryPlayers: [{ name: 'Opponent Nine' }] },
  teamSide: 'home', status: 'live', currentPeriod: 'first_half', timerBaseSeconds: 0,
  timerAnchorAt: new Date('2030-01-01T10:00:00Z'), startingXI: Array.from({ length: 11 }, (_, index) => snapshot(index + 1)),
  substitutes: [snapshot(12), snapshot(13)], homeScore: 0, awayScore: 0, lastEventSequence: 0,
  scheduledAt: new Date('2030-01-01'), venue: 'Ground', tournament: 'Cup', formation: '4-3-3',
  async save() { this.saved = true; return this; },
  ...overrides,
});

const transitionModel = (value) => ({ findOne: async (filter) => filter.team === teamId ? value : null });
const input = { minute: 12, description: 'Event note' };

test('scheduled match can start and timer anchor begins', async () => {
  const value = match({ status: 'scheduled', currentPeriod: 'not_started', timerAnchorAt: null });
  await startMatch({ matchModel: transitionModel(value), teamId, matchId, userId, now: new Date('2030-01-01T10:00:00Z') });
  assert.equal(value.status, 'live'); assert.equal(value.currentPeriod, 'first_half'); assert.ok(value.timerAnchorAt); assert.equal(value.saved, true);
});

test('live start blocks incomplete challenge-created small-sided lineups', async () => {
  const value = match({
    status: 'scheduled',
    currentPeriod: 'not_started',
    matchFormat: '5v5',
    startingXI: Array.from({ length: 3 }, (_, index) => snapshot(index + 1)),
  });
  await assert.rejects(startMatch({ matchModel: transitionModel(value), teamId, matchId, userId }), (error) => {
    assert.equal(error.code, 'MATCH_LINEUP_INCOMPLETE');
    assert.equal(error.message, 'Complete your 5v5 lineup before starting the match.');
    return true;
  });
});

test('kickoff current lineup reflects 5v5 7v7 and 11v11 formats without assuming eleven', () => {
  for (const [format, count] of [['5v5', 5], ['7v7', 7], ['11v11', 11]]) {
    const state = currentLineupEligibility(match({
      matchFormat: format,
      startingXI: Array.from({ length: count }, (_, index) => snapshot(index + 1)),
      substitutes: [snapshot(12), snapshot(13)],
    }), []);
    assert.equal(state.currentOnFieldPlayers.length, count);
    assert.equal(state.currentBenchPlayers.length, 2);
    assert.equal(state.appearedPlayers.length, count);
    assert.equal(state.state.onFieldIds.has(playerId(40)), false);
  }
});

test('non-owned match cannot start and cancelled match cannot restart', async () => {
  await assert.rejects(startMatch({ matchModel: transitionModel(match()), teamId: otherTeamId, matchId, userId }), (error) => error.code === 'MATCH_NOT_FOUND');
  await assert.rejects(startMatch({ matchModel: transitionModel(match({ status: 'cancelled', currentPeriod: 'not_started' })), teamId, matchId, userId }), (error) => error.code === 'INVALID_TRANSITION');
});

test('normal-time transitions enforce order and persist elapsed timer', async () => {
  const value = match();
  await endFirstHalf({ matchModel: transitionModel(value), teamId, matchId, userId, now: new Date('2030-01-01T10:45:00Z') });
  assert.equal(value.status, 'half_time'); assert.equal(value.timerBaseSeconds, 2700);
  await startSecondHalf({ matchModel: transitionModel(value), teamId, matchId, userId, now: new Date('2030-01-01T11:00:00Z') });
  assert.equal(value.status, 'live'); assert.equal(value.currentPeriod, 'second_half');
  await completeMatch({ matchModel: transitionModel(value), teamId, matchId, userId, now: new Date('2030-01-01T11:45:00Z') });
  assert.equal(value.status, 'completed'); assert.equal(value.currentPeriod, 'full_time'); assert.ok(value.completedAt);
});

test('invalid transition and completed match events are rejected', async () => {
  await assert.rejects(startSecondHalf({ matchModel: transitionModel(match()), teamId, matchId, userId }), (error) => error.code === 'INVALID_TRANSITION');
  assert.throws(() => buildEventData({ match: match({ status: 'completed' }), events: [], type: 'goal', input: { scoringSide: 'team', playerId: playerId(2) } }), (error) => error.code === 'MATCH_NOT_LIVE');
});

test('elapsed time uses base seconds plus live anchor without database ticks', () => {
  assert.equal(calculateElapsedSeconds(match({ timerBaseSeconds: 60 }), new Date('2030-01-01T10:02:00Z')), 180);
  assert.equal(calculateElapsedSeconds(match({ status: 'half_time', timerBaseSeconds: 2700 })), 2700);
});

test('team and opponent goals map correctly for home and away sides', () => {
  const events = [{ type: 'goal', scoringSide: 'team' }, { type: 'goal', scoringSide: 'opponent' }];
  assert.deepEqual(calculateScore(events, 'home'), { homeScore: 1, awayScore: 1, teamScore: 1, opponentScore: 1 });
  const away = calculateScore([{ type: 'goal', scoringSide: 'team' }], 'away');
  assert.equal(away.awayScore, 1); assert.equal(away.homeScore, 0);
});

test('assisted goal stores saved lineup snapshots and scorer differs from assist', () => {
  const data = buildEventData({ match: match(), events: [], type: 'goal', input: { ...input, scoringSide: 'team', playerId: playerId(2), assistPlayerId: playerId(3) } });
  assert.equal(data.playerSnapshot.name, 'Player 2'); assert.equal(data.assistPlayerSnapshot.name, 'Player 3');
  assert.throws(() => buildEventData({ match: match(), events: [], type: 'goal', input: { scoringSide: 'team', playerId: playerId(2), assistPlayerId: playerId(2) } }), (error) => error.code === 'ASSIST_EQUALS_SCORER');
});

test('saved lineup snapshot remains eligible despite later player changes and non-lineup player is rejected', () => {
  const data = buildEventData({ match: match(), events: [], type: 'goal', input: { scoringSide: 'team', playerId: playerId(4) } });
  assert.equal(data.playerSnapshot.name, 'Player 4');
  assert.throws(() => buildEventData({ match: match(), events: [], type: 'goal', input: { scoringSide: 'team', playerId: playerId(40) } }), (error) => error.code === 'PLAYER_NOT_ON_FIELD');
});

test('temporary opponent scorer is accepted', () => {
  const data = buildEventData({ match: match(), events: [], type: 'goal', input: { scoringSide: 'opponent', temporaryOpponentPlayerName: 'Opponent Nine' } });
  assert.equal(data.temporaryOpponentPlayerName, 'Opponent Nine'); assert.equal(data.team, null);
});

test('bench substituted-out and red-carded players are rejected for on-field events', () => {
  const value = match();
  assert.throws(() => buildEventData({ match: value, events: [], type: 'goal', input: { scoringSide: 'team', playerId: playerId(12) } }), (error) => error.code === 'PLAYER_NOT_ON_FIELD');
  assert.throws(() => buildEventData({ match: value, events: [], type: 'yellow_card', input: { side: 'team', playerId: playerId(12) } }), (error) => error.code === 'PLAYER_NOT_ON_FIELD');
  const substitution = { ...buildEventData({ match: value, events: [], type: 'substitution', input: { playerOutId: playerId(5), playerInId: playerId(12) } }), type: 'substitution', sequence: 1, isUndone: false };
  assert.doesNotThrow(() => buildEventData({ match: value, events: [substitution], type: 'goal', input: { scoringSide: 'team', playerId: playerId(12) } }));
  assert.throws(() => buildEventData({ match: value, events: [substitution], type: 'penalty_scored', input: { scoringSide: 'team', playerId: playerId(5) } }), (error) => error.code === 'PLAYER_ALREADY_SUBSTITUTED_OUT');
  const red = { ...buildEventData({ match: value, events: [substitution], type: 'red_card', input: { side: 'team', playerId: playerId(12) } }), type: 'red_card', sequence: 2, isUndone: false };
  const state = currentLineupEligibility(value, [substitution, red]);
  assert.equal(state.state.onFieldIds.has(playerId(12)), false);
  assert.throws(() => buildEventData({ match: value, events: [substitution, red], type: 'goal', input: { scoringSide: 'team', playerId: playerId(12) } }), (error) => error.code === 'PLAYER_RED_CARDED');
  assert.throws(() => buildEventData({ match: value, events: [substitution, red], type: 'substitution', input: { playerOutId: playerId(12), playerInId: playerId(13) } }), (error) => error.code === 'PLAYER_RED_CARDED');
});

test('adding an assist to an existing goal requires a current on-field player', async () => {
  const value = match();
  const goal = {
    _id: '65c000000000000000000010',
    type: 'goal',
    scoringSide: 'team',
    player: playerId(2),
    isUndone: false,
    async save() { this.saved = true; },
  };
  const eventModel = {
    find: () => ({ sort: async () => [] }),
    findOne: async () => goal,
  };
  const matchModel = { findOne: async () => value };
  await assert.rejects(addAssistToGoal({ eventModel, matchModel, teamId, matchId, eventId: goal._id, userId, assistPlayerId: playerId(12) }), (error) => error.code === 'PLAYER_NOT_ON_FIELD');
  const result = await addAssistToGoal({ eventModel, matchModel, teamId, matchId, eventId: goal._id, userId, assistPlayerId: playerId(3) });
  assert.equal(result.assistPlayerSnapshot.name, 'Player 3');
});

test('penalty scored affects score while missed and saved do not', () => {
  const events = [
    { type: 'penalty_scored', scoringSide: 'team' },
    { type: 'penalty_missed', scoringSide: 'team' },
    { type: 'penalty_saved', scoringSide: 'opponent' },
  ];
  assert.equal(calculateScore(events, 'home').homeScore, 1); assert.equal(calculateScore(events, 'home').awayScore, 0);
});

test('own goal increments opposite side and undone goal no longer counts', () => {
  const own = buildEventData({ match: match(), events: [], type: 'own_goal', input: { ownGoalBySide: 'team', playerId: playerId(5) } });
  assert.equal(own.scoringSide, 'opponent');
  const score = calculateScore([{ type: 'goal', scoringSide: 'team', isUndone: true }, { type: 'own_goal', scoringSide: 'opponent' }], 'home');
  assert.equal(score.homeScore, 0); assert.equal(score.awayScore, 1);
});

test('penalties and own goals require current on-field own-team players', () => {
  const value = match();
  const substitution = { ...buildEventData({ match: value, events: [], type: 'substitution', input: { playerOutId: playerId(5), playerInId: playerId(12) } }), type: 'substitution', sequence: 1, isUndone: false };
  assert.doesNotThrow(() => buildEventData({ match: value, events: [substitution], type: 'penalty_scored', input: { scoringSide: 'team', playerId: playerId(12) } }));
  assert.throws(() => buildEventData({ match: value, events: [substitution], type: 'penalty_missed', input: { scoringSide: 'team', playerId: playerId(5) } }), (error) => error.code === 'PLAYER_ALREADY_SUBSTITUTED_OUT');
  assert.doesNotThrow(() => buildEventData({ match: value, events: [substitution], type: 'own_goal', input: { ownGoalBySide: 'team', playerId: playerId(12) } }));
  assert.throws(() => buildEventData({ match: value, events: [substitution], type: 'own_goal', input: { ownGoalBySide: 'team', playerId: playerId(5) } }), (error) => error.code === 'PLAYER_ALREADY_SUBSTITUTED_OUT');
});

test('valid substitution updates field state and undo restores it', () => {
  const value = match();
  const event = buildEventData({ match: value, events: [], type: 'substitution', input: { playerOutId: playerId(5), playerInId: playerId(12), minute: 60 } });
  const active = { ...event, type: 'substitution', sequence: 1, isUndone: false };
  let state = buildCurrentLineup(value, [active]);
  assert.ok(state.onFieldIds.has(playerId(12))); assert.ok(!state.onFieldIds.has(playerId(5)));
  state = buildCurrentLineup(value, [{ ...active, isUndone: true }]);
  assert.ok(state.onFieldIds.has(playerId(5))); assert.ok(state.benchIds.has(playerId(12)));
});

test('undo red card restores player eligibility and undo goal leaves lineup unchanged', () => {
  const value = match();
  const red = { ...buildEventData({ match: value, events: [], type: 'red_card', input: { side: 'team', playerId: playerId(4) } }), type: 'red_card', sequence: 1, isUndone: false };
  assert.equal(currentLineupEligibility(value, [red]).state.onFieldIds.has(playerId(4)), false);
  assert.equal(currentLineupEligibility(value, [{ ...red, isUndone: true }]).state.onFieldIds.has(playerId(4)), true);
  const goal = { ...buildEventData({ match: value, events: [], type: 'goal', input: { scoringSide: 'team', playerId: playerId(4) } }), type: 'goal', sequence: 2, isUndone: true };
  assert.equal(currentLineupEligibility(value, [goal]).state.onFieldIds.has(playerId(4)), true);
});

test('invalid substitutions reject non-field, non-bench, repeat entry, and re-entry', () => {
  const value = match();
  assert.throws(() => buildEventData({ match: value, events: [], type: 'substitution', input: { playerOutId: playerId(12), playerInId: playerId(13) } }), (error) => error.code === 'PLAYER_NOT_ON_FIELD');
  assert.throws(() => buildEventData({ match: value, events: [], type: 'substitution', input: { playerOutId: playerId(5), playerInId: playerId(6) } }), (error) => error.code === 'PLAYER_NOT_ON_BENCH');
  const first = { ...buildEventData({ match: value, events: [], type: 'substitution', input: { playerOutId: playerId(5), playerInId: playerId(12) } }), type: 'substitution', sequence: 1 };
  assert.throws(() => buildEventData({ match: value, events: [first], type: 'substitution', input: { playerOutId: playerId(6), playerInId: playerId(12) } }), (error) => error.code === 'PLAYER_ALREADY_ENTERED');
  assert.throws(() => buildEventData({ match: value, events: [first], type: 'substitution', input: { playerOutId: playerId(7), playerInId: playerId(5) } }), (error) => error.code === 'PLAYER_ALREADY_SUBSTITUTED_OUT');
});

test('undo marks latest active event, preserves history, and rejects empty timeline', async () => {
  const value = match();
  const event = { _id: '65c000000000000000000001', sequence: 2, type: 'goal', scoringSide: 'team', isUndone: false, async save() { this.saved = true; } };
  const eventModel = {
    findOne: () => ({ sort: async () => event }),
    find: async () => [],
  };
  const matchModel = { findOne: async () => value, updateOne: async () => ({ acknowledged: true }) };
  const undone = await undoLatestEvent({ eventModel, matchModel, teamId, matchId, userId, reason: 'Correction' });
  assert.equal(undone.sequence, 2); assert.equal(undone.isUndone, true); assert.equal(undone.undoReason, 'Correction'); assert.equal(undone.saved, true);
  const emptyModel = { findOne: () => ({ sort: async () => null }), find: async () => [] };
  await assert.rejects(undoLatestEvent({ eventModel: emptyModel, matchModel, teamId, matchId, userId }), (error) => error.code === 'NO_EVENT_TO_UNDO');
});

test('live serializer contains no private users and derives current state', () => {
  const state = serializeLiveState({ match: match({ team: { _id: teamId, name: 'FootStream FC', slug: 'footstream-fc' } }), events: [], now: new Date('2030-01-01T10:01:00Z') });
  assert.equal(state.team.name, 'FootStream FC'); assert.equal(state.elapsedSeconds, 60); assert.equal('createdBy' in state, false); assert.equal('updatedBy' in state, false);
});

test('direct client snapshots and protected event fields are rejected', async () => {
  const req = {
    params: { matchId },
    body: {
      scoringSide: 'team', playerId: playerId(2), playerSnapshot: { name: 'Forged' },
      sequence: 99, createdBy: userId, isUndone: false,
    },
  };
  await Promise.all(goalValidator.map((validator) => validator.run(req)));
  assert.ok(validationResult(req).array().some((error) => error.msg.includes('Unsupported event fields')));
});

test('super admin cannot use team-admin live mutations and public routes are read-only', () => {
  const teamMutationGuard = requireRole(USER_ROLES.TEAM_ADMIN);
  let denied;
  teamMutationGuard({ user: { role: USER_ROLES.SUPER_ADMIN } }, {}, (error) => { denied = error; });
  assert.equal(denied.statusCode, 403);
  const methods = publicRoutes.stack
    .filter((layer) => layer.route && ![
      '/teams/:teamSlug/join-requests',
      '/join-requests/:requestCode/status',
      '/matches/:matchId/chat',
      '/matches/:matchId/reactions/:reactionType/toggle',
      '/matches/:matchId/polls/:pollId/vote',
      '/push/subscribe',
      '/push/unsubscribe',
      '/teams/:teamSlug/follow',
      '/teams/:teamSlug/follow/preferences',
    ].includes(layer.route.path))
    .flatMap((layer) => Object.keys(layer.route.methods));
  assert.deepEqual([...new Set(methods)], ['get']);
});

test('room join validates match identifier and realtime hub emits scoped updates', () => {
  assert.equal(isValidMatchRoomId(matchId), true); assert.equal(isValidMatchRoomId('bad-id'), false);
  const calls = [];
  setRealtimeServer({ to: (room) => ({ emit: (name, payload) => calls.push({ room, name, payload }) }) });
  emitToMatch(matchId, 'match:transition', { status: 'live' });
  emitToMatch(matchId, 'match:event-created', { sequence: 1 });
  assert.deepEqual(calls[0], { room: `match:${matchId}`, name: 'match:transition', payload: { status: 'live' } });
  assert.equal(calls[1].name, 'match:event-created');
  setRealtimeServer(null);
});
