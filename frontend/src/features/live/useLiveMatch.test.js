import assert from 'node:assert/strict';
import { test } from 'vitest';
import { isFreshLiveState, mergeLiveEvents } from './useLiveMatch.js';

test('fresh socket live-state with a newer event sequence updates the scoreboard state', () => {
  const current = {
    homeScore: 0,
    awayScore: 0,
    latestEventSequence: 3,
    activeEventCount: 3,
    updatedAt: '2035-01-01T10:00:00.000Z',
  };
  const socketState = {
    homeScore: 1,
    awayScore: 0,
    latestEventSequence: 4,
    activeEventCount: 4,
    updatedAt: '2035-01-01T10:00:01.000Z',
  };
  assert.equal(isFreshLiveState(current, socketState), true);
});

test('older REST live-state cannot overwrite a newer socket scoreboard state', () => {
  const socketState = {
    homeScore: 1,
    awayScore: 0,
    latestEventSequence: 4,
    activeEventCount: 4,
    updatedAt: '2035-01-01T10:00:01.000Z',
  };
  const staleRestState = {
    homeScore: 0,
    awayScore: 0,
    latestEventSequence: 3,
    activeEventCount: 3,
    updatedAt: '2035-01-01T10:00:00.000Z',
  };
  assert.equal(isFreshLiveState(socketState, staleRestState), false);
});

test('same-sequence live-state accepts newer updatedAt for non-event transitions', () => {
  const current = {
    status: 'live',
    currentPeriod: 'first_half',
    latestEventSequence: 4,
    activeEventCount: 4,
    updatedAt: '2035-01-01T10:00:01.000Z',
  };
  const transitionState = {
    status: 'half_time',
    currentPeriod: 'half_time',
    latestEventSequence: 4,
    activeEventCount: 4,
    updatedAt: '2035-01-01T10:45:00.000Z',
  };
  assert.equal(isFreshLiveState(current, transitionState), true);
});

test('live event payload merges immediately into timeline without requiring refresh', () => {
  const current = [{ _id: 'event-1', sequence: 1, type: 'goal', homeScore: 1 }];
  const created = { _id: 'event-2', sequence: 2, type: 'goal' };
  assert.deepEqual(mergeLiveEvents(current, created).map((event) => event._id), ['event-1', 'event-2']);
});

test('updated event payload replaces the existing timeline event', () => {
  const current = [{ _id: 'event-1', sequence: 1, type: 'goal', assistPlayer: null }];
  const updated = { _id: 'event-1', sequence: 1, type: 'goal', assistPlayer: 'player-2' };
  const merged = mergeLiveEvents(current, updated);
  assert.equal(merged.length, 1);
  assert.equal(merged[0].assistPlayer, 'player-2');
});
