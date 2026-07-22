import assert from 'node:assert/strict';
import { test } from 'vitest';
import { FORMAT_FORMATIONS, FORMAT_STARTERS } from './constants.js';

test('match format constants expose starter requirements and compatible formations', () => {
  assert.deepEqual(FORMAT_STARTERS, { '5v5': 5, '6v6': 6, '7v7': 7, '8v8': 8, '9v9': 9, '11v11': 11 });
  assert.deepEqual(FORMAT_FORMATIONS['5v5'], ['1-2-1', '2-1-1', '1-1-2']);
  assert.deepEqual(FORMAT_FORMATIONS['6v6'], ['2-2-1', '2-1-2', '1-3-1']);
  assert.deepEqual(FORMAT_FORMATIONS['7v7'], ['2-3-1', '3-2-1', '2-2-2']);
  assert.deepEqual(FORMAT_FORMATIONS['8v8'], ['3-3-1', '2-3-2', '3-2-2']);
  assert.deepEqual(FORMAT_FORMATIONS['9v9'], ['3-3-2', '3-2-3', '2-3-3']);
  assert.ok(FORMAT_FORMATIONS['11v11'].includes('4-3-3'));
  assert.equal(FORMAT_FORMATIONS['11v11'].includes('1-2-1'), false);
});
