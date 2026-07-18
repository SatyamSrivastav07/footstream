import assert from 'node:assert/strict';
import { renderToStaticMarkup } from 'react-dom/server';
import { test } from 'vitest';
import MatchForm from './MatchForm.jsx';

const hostLineup = Array.from({ length: 11 }, (_, index) => ({
  player: `65f1000000000000000000${String(index + 1).padStart(2, '0')}`,
  name: `Host ${index + 1}`,
  position: 'CM',
  jerseyNumber: index + 1,
}));

test('match form renders registered opponent mode with opponent lineup controls', () => {
  const html = renderToStaticMarkup(
    <MatchForm
      teamName="FC KIET"
      saving={false}
      onSubmit={() => {}}
      initialMatch={{
        opponent: { name: 'IMS', temporaryPlayers: [] },
        registeredOpponentTeam: { _id: '65f200000000000000000001', name: 'IMS' },
        tournament: '',
        venue: 'Main Ground',
        matchType: 'friendly',
        teamSide: 'home',
        scheduledAt: '2035-06-15T14:30:00.000Z',
        formation: '4-3-3',
        customFormation: '',
        notes: '',
        matchFormat: '11v11',
        startingXI: hostLineup,
        substitutes: [],
        registeredOpponentStartingXI: [
          { sourceType: 'registered', player: '65f300000000000000000001', name: 'Opponent One', position: 'ST', jerseyNumber: 9 },
          { sourceType: 'temporary', name: 'Guest Trialist', position: 'RW', jerseyNumber: 77 },
        ],
        registeredOpponentSubstitutes: [],
        permissions: { canEditDetails: true },
      }}
    />,
  );
  assert.match(html, /Registered Team/);
  assert.match(html, /Stream Match/);
  assert.match(html, /Direct Input Result/);
  assert.match(html, /Match Format/);
  assert.match(html, /How do you want to manage this match/);
  assert.match(html, /Stream Match/);
  assert.match(html, /Search registered opponent/);
  assert.match(html, /Registered opponent lineup/);
  assert.match(html, /Formation pitch/);
  assert.match(html, /Substitutions inherit this slot during live display/);
  assert.match(html, /Add temporary player/);
  assert.match(html, /Opponent starters/);
  assert.doesNotMatch(html, /Search Registered Team/);
  assert.doesNotMatch(html, /Search Opponent Squad/);
  assert.doesNotMatch(html, /Search opponent squad/);
});

test('new match form exposes match format selector without registered search in manual mode', () => {
  const html = renderToStaticMarkup(
    <MatchForm
      teamName="FC KIET"
      saving={false}
      onSubmit={() => {}}
    />,
  );
  assert.match(html, /Match Format/);
  assert.match(html, /5v5/);
  assert.match(html, /7v7/);
  assert.match(html, /11v11/);
  assert.doesNotMatch(html, /Search registered opponent/);
});
