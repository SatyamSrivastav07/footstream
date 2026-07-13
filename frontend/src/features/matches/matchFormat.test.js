import assert from 'node:assert/strict';
import { test } from 'vitest';
import { FORMAT_FORMATIONS, FORMAT_STARTERS } from './constants.js';

test('match format constants expose starter requirements and compatible formations', () => {
  assert.deepEqual(FORMAT_STARTERS, { '5v5': 5, '7v7': 7, '11v11': 11 });
  assert.deepEqual(FORMAT_FORMATIONS['5v5'], ['1-2-1', '2-1-1', '1-1-2']);
  assert.deepEqual(FORMAT_FORMATIONS['7v7'], ['2-3-1', '3-2-1', '2-2-2']);
  assert.ok(FORMAT_FORMATIONS['11v11'].includes('4-3-3'));
  assert.equal(FORMAT_FORMATIONS['11v11'].includes('1-2-1'), false);
});
