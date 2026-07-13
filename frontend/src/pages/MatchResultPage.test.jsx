import assert from 'node:assert/strict';
import { test } from 'vitest';
import { motmEligiblePlayersForBundle } from './MatchResultPage.jsx';

const starter = { player: 'p1', name: 'Starter One' };
const enteredSubstitute = { player: 'p2', name: 'Entered Substitute' };
const unusedSubstitute = { player: 'p3', name: 'Unused Substitute' };

test('Man of the Match options include starters and entered substitutes only', () => {
  const eligible = motmEligiblePlayersForBundle({
    match: {
      startingXI: [starter],
      substitutes: [enteredSubstitute, unusedSubstitute],
    },
    events: [
      { type: 'substitution', playerIn: 'p2', isUndone: false },
      { type: 'substitution', playerIn: 'p3', isUndone: true },
    ],
  });
  assert.deepEqual(eligible.map((player) => player.name), ['Starter One', 'Entered Substitute']);
});
