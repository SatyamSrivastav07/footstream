import assert from 'node:assert/strict';
import { renderToStaticMarkup } from 'react-dom/server';
import { test } from 'vitest';
import EventActionModal, { assistOptionsForGoal } from './EventActionModal.jsx';

const player = (number, name, position = 'CM') => ({
  player: `p${number}`,
  name,
  jerseyNumber: number,
  position,
});

const state = {
  liveMinute: 12,
  opponent: { temporaryPlayers: [{ name: 'Opponent Nine' }] },
  startingXI: [player(1, 'Starter One'), player(2, 'Starter Two')],
  substitutes: [player(12, 'Bench Twelve'), player(13, 'Bench Thirteen')],
  currentLineup: {
    onField: [player(1, 'Starter One'), player(12, 'Bench Twelve')],
    bench: [player(13, 'Bench Thirteen')],
    sentOff: [player(2, 'Starter Two')],
    substitutions: [],
  },
  currentOnFieldPlayers: [player(1, 'Starter One'), player(12, 'Bench Twelve')],
  currentBenchPlayers: [player(13, 'Bench Thirteen')],
};

const render = (action, events = []) => renderToStaticMarkup(
  <EventActionModal
    action={action}
    state={state}
    events={events}
    open
    onClose={() => {}}
    onSubmit={() => {}}
    saving={false}
    error=""
  />,
);

test('goal and card selectors use current on-field players only', () => {
  const goal = render('goal');
  assert.match(goal, /Starter One/);
  assert.match(goal, /Bench Twelve/);
  assert.doesNotMatch(goal, /Bench Thirteen/);
  assert.doesNotMatch(goal, /Starter Two/);

  const card = render('yellowCard');
  assert.match(card, /Current on-field player/);
  assert.doesNotMatch(card, /Bench Thirteen/);
});

test('assist selector excludes the scorer from current on-field options', () => {
  const goal = {
    _id: 'g1',
    type: 'goal',
    scoringSide: 'team',
    player: 'p1',
    playerSnapshot: player(1, 'Starter One'),
    minute: 10,
    isUndone: false,
  };
  const html = render('assist', [goal]);
  assert.match(html, /Starter One/);
  assert.match(html, /Bench Twelve/);
  assert.doesNotMatch(html, /Bench Thirteen/);
  assert.deepEqual(assistOptionsForGoal(state.currentOnFieldPlayers, goal).map((item) => item.player), ['p12']);
});

test('substitution selectors separate current field and current bench', () => {
  const html = render('substitution');
  assert.match(html, /Current On Field - Player out/);
  assert.match(html, /Current Bench - Player in/);
  assert.match(html, /Starter One/);
  assert.match(html, /Bench Twelve/);
  assert.match(html, /Bench Thirteen/);
  assert.doesNotMatch(html, /Starter Two/);
});
