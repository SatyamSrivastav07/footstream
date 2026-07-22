/* @vitest-environment jsdom */
import assert from 'node:assert/strict';
import { test } from 'vitest';
import { autoArrangeTacticalPlan } from './tacticalAutoArrange.js';
import { clampCoordinate } from './formationDefinitions.js';
import { createEmptyPlan, loadTacticalPlan, saveTacticalPlan, tacticalBoardKey } from './tacticalBoardStorage.js';
import { normalizePlan, validateTacticalPlan } from './tacticalBoardValidation.js';
import { positionGroup, suggestReplacements } from './tacticalSuggestions.js';

const players = [
  { _id: 'p1', name: 'Keeper', position: 'GK', jerseyNumber: 1, isActive: true },
  { _id: 'p2', name: 'Defender', position: 'CB', jerseyNumber: 4, isActive: true },
  { _id: 'p3', name: 'Midfielder', position: 'CM', jerseyNumber: 8, isActive: true },
  { _id: 'p4', name: 'Forward', position: 'ST', jerseyNumber: 9, isActive: true },
  { _id: 'p5', name: 'Winger', position: 'LW', jerseyNumber: 11, isActive: true },
  { _id: 'p6', name: 'Bench', position: 'RB', jerseyNumber: 2, isActive: true },
];

test('tactical auto arrange places players once and prefers goalkeeper slot', () => {
  const plan = autoArrangeTacticalPlan({ teamId: 't1', formation: '5-a-side', players, currentPlan: createEmptyPlan('t1', players) });

  assert.equal(plan.pitchPlayers.length, 5);
  assert.equal(plan.pitchPlayers.find((entry) => entry.slotId === 'GK').playerId, 'p1');
  assert.equal(new Set([...plan.pitchPlayers.map((entry) => entry.playerId), ...plan.benchPlayerIds]).size, players.length);
  assert.equal(plan.goalkeeperId, 'p1');
});

test('tactical validation prevents duplicate players and captain vice-captain collision', () => {
  const plan = {
    teamId: 't1',
    formation: '4-3-3',
    pitchPlayers: [{ playerId: 'p1', slotId: 'GK' }],
    benchPlayerIds: ['p1'],
    captainId: 'p1',
    viceCaptainId: 'p1',
    goalkeeperId: 'p1',
  };

  const errors = validateTacticalPlan(plan, players);
  assert.ok(errors.includes('A player can appear only once on the pitch or bench.'));
  assert.ok(errors.includes('Captain and Vice Captain must be different players.'));
});

test('manual tactical coordinates are clamped and persist through storage', () => {
  const normalized = normalizePlan({
    version: 1,
    teamId: 't1',
    formation: 'manual',
    pitchPlayers: [{ playerId: 'p1', x: -20, y: 140 }],
    benchPlayerIds: ['p2'],
  }, players, 't1');

  assert.equal(normalized.pitchPlayers[0].x, clampCoordinate(-20));
  assert.equal(normalized.pitchPlayers[0].y, clampCoordinate(140));

  const saved = saveTacticalPlan('t1', normalized, players);
  assert.equal(saved.ok, true);
  const restored = loadTacticalPlan('t1', players);
  assert.equal(restored.formation, 'manual');
  assert.equal(restored.pitchPlayers[0].playerId, 'p1');
  window.localStorage.removeItem(tacticalBoardKey('t1'));
});

test('tactical storage recovers from malformed data and removed players', () => {
  window.localStorage.setItem(tacticalBoardKey('t1'), '{broken');
  assert.equal(loadTacticalPlan('t1', players).benchPlayerIds.length, players.length);

  window.localStorage.setItem(tacticalBoardKey('t1'), JSON.stringify({
    version: 1,
    teamId: 't1',
    formation: '4-3-3',
    pitchPlayers: [{ playerId: 'removed-player', slotId: 'GK' }],
    benchPlayerIds: ['p2'],
  }));
  const restored = loadTacticalPlan('t1', players);
  assert.equal(restored.pitchPlayers.length, 0);
  assert.ok(restored.benchPlayerIds.includes('p1'));
  window.localStorage.removeItem(tacticalBoardKey('t1'));
});

test('tactical suggestions show natural replacements before all bench players', () => {
  const source = { _id: 'starter', name: 'Centre Back', position: 'CB' };
  const bench = [
    { _id: 'mid', name: 'Mid Option', position: 'CM' },
    { _id: 'def', name: 'Def Option', position: 'RB' },
    { _id: 'striker', name: 'Striker Option', position: 'ST' },
  ];

  assert.equal(positionGroup('left back'), 'defender');
  assert.deepEqual(suggestReplacements(source, bench).map((player) => player._id), ['def']);
  assert.deepEqual(suggestReplacements({ position: '' }, bench), []);
});
