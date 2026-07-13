import test from 'node:test';
import assert from 'node:assert/strict';
import { Buffer } from 'node:buffer';
import { deriveResult, matchSquadSnapshot } from '../src/services/resultService.js';
import { aggregateCompletedData, emptyPlayerStats } from '../src/services/statisticsService.js';
import { confirmResult } from '../src/services/resultService.js';
import { removePhoto, uploadPhotos } from '../src/services/photoService.js';
import { validatePhotoSignatures } from '../src/middleware/photoUpload.js';

const match = (overrides = {}) => ({
  _id: 'm1', team: 't1', teamSide: 'home', status: 'completed', scheduledAt: new Date('2026-01-01'), completedAt: new Date('2026-01-01'),
  opponent: { name: 'Rivals' }, tournament: 'Cup', venue: 'Ground', matchType: 'league',
  startingXI: [{ player: 'p1', name: 'Ada', jerseyNumber: 9, position: 'ST', photoUrl: 'ada.jpg' }],
  substitutes: [{ player: 'p2', name: 'Bea', jerseyNumber: 10, position: 'CM', photoUrl: '' }], manOfTheMatch: null,
  ...overrides,
});
const event = (type, overrides = {}) => ({ match: 'm1', type, scoringSide: null, isUndone: false, ...overrides });

test('deriveResult calculates a team win from active scoring events', () => {
  assert.deepEqual(deriveResult(match(), [event('goal', { scoringSide: 'team' }), event('penalty_scored', { scoringSide: 'team' }), event('goal', { scoringSide: 'opponent' })]), { outcome: 'win', winnerSide: 'team', finalTeamScore: 2, finalOpponentScore: 1 });
});
test('deriveResult ignores undone goals', () => assert.equal(deriveResult(match(), [event('goal', { scoringSide: 'team', isUndone: true })]).outcome, 'draw'));
test('deriveResult handles away-side score orientation without changing team outcome', () => assert.equal(deriveResult(match({ teamSide: 'away' }), [event('goal', { scoringSide: 'opponent' })]).outcome, 'loss'));
test('matchSquadSnapshot accepts starters and substitutes', () => assert.equal(matchSquadSnapshot(match(), 'p2').name, 'Bea'));
test('empty player statistics contain every Phase 5 counter', () => assert.equal(Object.keys(emptyPlayerStats()).length, 12));

test('statistics count starters as appearances and not unused substitutes', () => {
  const data = aggregateCompletedData([match()], []);
  assert.equal(data.players.find((p) => p.playerId === 'p1').matchesPlayed, 1);
  assert.equal(data.players.find((p) => p.playerId === 'p2').matchesPlayed, 0);
});
test('statistics count a substitute only after an active player-in event', () => {
  const data = aggregateCompletedData([match()], [event('substitution', { playerInSnapshot: match().substitutes[0] })]);
  const player = data.players.find((p) => p.playerId === 'p2');
  assert.equal(player.matchesPlayed, 1); assert.equal(player.substituteAppearances, 1);
});
test('statistics avoid double-counting a substitute appearance', () => {
  const sub = event('substitution', { playerInSnapshot: match().substitutes[0] });
  assert.equal(aggregateCompletedData([match()], [sub, sub]).players.find((p) => p.playerId === 'p2').matchesPlayed, 1);
});
test('statistics derive goals, assists, cards and penalties from active events', () => {
  const ada = match().startingXI[0]; const bea = match().substitutes[0];
  const data = aggregateCompletedData([match()], [
    event('goal', { scoringSide: 'team', playerSnapshot: ada, assistPlayerSnapshot: bea }),
    event('yellow_card', { playerSnapshot: ada }), event('red_card', { playerSnapshot: ada }),
    event('penalty_scored', { scoringSide: 'team', playerSnapshot: ada }), event('penalty_missed', { scoringSide: 'team', playerSnapshot: ada }),
  ]);
  const player = data.players.find((p) => p.playerId === 'p1');
  assert.equal(player.goals, 1); assert.equal(player.yellowCards, 1); assert.equal(player.redCards, 1); assert.equal(player.penaltiesScored, 1); assert.equal(player.penaltiesMissed, 1);
  assert.equal(data.players.find((p) => p.playerId === 'p2').assists, 1);
});
test('statistics count own goals and Man of the Match from snapshots', () => {
  const ada = match().startingXI[0]; const data = aggregateCompletedData([match({ manOfTheMatch: ada })], [event('own_goal', { scoringSide: 'opponent', ownGoalBy: { playerSnapshot: ada } })]);
  const player = data.players.find((p) => p.playerId === 'p1'); assert.equal(player.ownGoals, 1); assert.equal(player.manOfTheMatchAwards, 1);
});
test('team statistics calculate record, goal difference, and rounded win percentage', () => {
  const second = match({ _id: 'm2', opponent: { name: 'City' } });
  const data = aggregateCompletedData([match(), second], [event('goal', { scoringSide: 'team' }), event('goal', { match: 'm2', scoringSide: 'opponent' })]);
  assert.deepEqual(data.team, { matchesPlayed: 2, wins: 1, draws: 0, losses: 1, goalsFor: 1, goalsAgainst: 1, goalDifference: 0, winPercentage: 50 });
});
test('history uses derived verified result values', () => assert.equal(aggregateCompletedData([match()], [event('goal', { scoringSide: 'team' })]).history[0].outcome, 'win'));

test('result confirmation rejects client-supplied protected score fields', async () => {
  const matchModel = { findOne: async () => match() };
  await assert.rejects(confirmResult({ matchModel, matchId: 'm1', teamId: 't1', userId: 'u1', input: { finalTeamScore: 99 } }), (error) => error.code === 'PROTECTED_RESULT_FIELDS');
});

test('result confirmation allows Man of the Match only from players who appeared', async () => {
  const completed = { ...match(), save: async () => completed };
  const matchModel = { findOne: async () => completed };
  const eventModel = { find: () => ({ lean: async () => [] }) };
  await confirmResult({ matchModel, eventModel, matchId: 'm1', teamId: 't1', userId: 'u1', input: { manOfTheMatchPlayerId: 'p1' } });
  assert.equal(completed.manOfTheMatch.name, 'Ada');
  await assert.rejects(confirmResult({ matchModel, eventModel, matchId: 'm1', teamId: 't1', userId: 'u1', input: { manOfTheMatchPlayerId: 'p2' } }), (error) => error.code === 'INVALID_MAN_OF_THE_MATCH');
});

test('result confirmation allows Man of the Match for a substitute who entered', async () => {
  const completed = { ...match(), save: async () => completed };
  const matchModel = { findOne: async () => completed };
  const eventModel = { find: () => ({ lean: async () => [event('substitution', { playerIn: 'p2', playerInSnapshot: completed.substitutes[0], playerOut: 'p1', playerOutSnapshot: completed.startingXI[0] })] }) };
  await confirmResult({ matchModel, eventModel, matchId: 'm1', teamId: 't1', userId: 'u1', input: { manOfTheMatchPlayerId: 'p2' } });
  assert.equal(completed.manOfTheMatch.name, 'Bea');
});

test('photo signature validation rejects MIME-spoofed content', () => {
  let received; validatePhotoSignatures({ files: [{ mimetype: 'image/png', buffer: Buffer.from('not png') }] }, {}, (error) => { received = error; });
  assert.equal(received.code, 'INVALID_PHOTO_CONTENT');
});

test('photo signature validation accepts a real PNG header', () => {
  let received = 'not-called'; validatePhotoSignatures({ files: [{ mimetype: 'image/png', buffer: Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]) }] }, {}, (error) => { received = error; });
  assert.equal(received, undefined);
});

test('partial Cloudinary upload failure removes uploaded assets and partial metadata', async () => {
  const destroyed = []; let deleted = false; let calls = 0;
  const storage = { upload: async () => { calls += 1; if (calls === 2) throw new Error('storage failed'); return { secure_url: 'https://image', public_id: 'asset-1', width: 10, height: 10, bytes: 8, format: 'png' }; }, destroy: async (id) => { destroyed.push(id); } };
  const photoModel = { countDocuments: async () => 0, insertMany: async () => [], deleteMany: () => ({ catch: async () => { deleted = true; } }) };
  const matchModel = { findOne: async () => match() };
  const files = [{ buffer: Buffer.from('a'), originalname: 'one.png', size: 1 }, { buffer: Buffer.from('b'), originalname: 'two.png', size: 1 }];
  await assert.rejects(uploadPhotos({ matchModel, photoModel, storage, matchId: 'm1', teamId: 't1', userId: 'u1', files }));
  assert.deepEqual(destroyed, ['asset-1']); assert.equal(deleted, true);
});

test('photo deletion removes the Cloudinary asset before soft-deleting MongoDB metadata', async () => {
  const order = []; const photo = { publicId: 'asset-1', isActive: true, save: async () => { order.push('save'); } };
  await removePhoto({ photoModel: { findOne: async () => photo }, storage: { destroy: async () => { order.push('destroy'); return { result: 'ok' }; } }, matchId: 'm1', photoId: 'ph1', teamId: 't1' });
  assert.deepEqual(order, ['destroy', 'save']); assert.equal(photo.isActive, false);
});

test('photo metadata stays active when Cloudinary deletion fails', async () => {
  let saved = false; const photo = { publicId: 'asset-1', isActive: true, save: async () => { saved = true; } };
  await assert.rejects(removePhoto({ photoModel: { findOne: async () => photo }, storage: { destroy: async () => { throw new Error('cloud unavailable'); } }, matchId: 'm1', photoId: 'ph1', teamId: 't1' }));
  assert.equal(saved, false); assert.equal(photo.isActive, true);
});
