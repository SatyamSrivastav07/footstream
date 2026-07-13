import assert from 'node:assert/strict';
import { test } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { MemoryRouter } from 'react-router-dom';
import PublicMatchCard from '../features/public/PublicMatchCard.jsx';
import { motmEligiblePlayersForBundle, normalizeResultBundle } from './MatchResultPage.jsx';

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

test('public home latest result card links to the match result route', () => {
  const html = renderToStaticMarkup(
    <MemoryRouter>
      <PublicMatchCard
        match={{
          matchId: '65f100000000000000000090',
          status: 'completed',
          teamSide: 'home',
          team: { name: 'FC KIET', logo: { imageUrl: 'https://img.example/logo.png' } },
          opponent: { name: 'IMS' },
          homeScore: 2,
          awayScore: 1,
          scheduledAt: '2026-07-14T10:00:00.000Z',
          venue: 'Main Ground',
          matchType: 'friendly',
          outcome: 'win',
        }}
      />
    </MemoryRouter>,
  );
  assert.match(html, /href="\/matches\/65f100000000000000000090\/result"/);
  assert.match(html, /View result/);
});

test('public result bundle normalization tolerates nullable optional fields and registered opponents', () => {
  const normalized = normalizeResultBundle({
    match: {
      team: { name: 'FC KIET', logo: { imageUrl: 'https://img.example/team.png' } },
      registeredOpponentTeam: { name: 'IMS', logo: 'https://img.example/opponent.png' },
      result: { finalTeamScore: 1, finalOpponentScore: 1, outcome: 'draw' },
    },
  });

  assert.equal(normalized.match.opponent.name, 'IMS');
  assert.deepEqual(normalized.match.startingXI, []);
  assert.deepEqual(normalized.match.substitutes, []);
  assert.deepEqual(normalized.events, []);
  assert.deepEqual(normalized.photos, []);
  assert.equal(normalized.result.finalTeamScore, 1);
  assert.equal(normalized.result.finalOpponentScore, 1);
});
