import assert from 'node:assert/strict';
import { test } from 'vitest';
import {
  buildDirectResultPayload,
  buildDirectSubstitutionOptions,
  buildInitialDirectResultForm,
  countDirectGoalsBySide,
  validateDirectResultGoalCounts,
} from './DirectResultPage.jsx';

const snapshot = (id, name) => ({ player: id, name });

test('direct result form hydrates existing canonical events for safe editing', () => {
  const form = buildInitialDirectResultForm({
    result: { finalTeamScore: 2, finalOpponentScore: 1 },
    manOfTheMatch: { player: 'p1' },
    completionNotes: 'Done',
    attendance: 120,
    directResult: { matchDuration: 90, refereeName: 'Ref', venueNotes: 'Dry pitch' },
  }, {
    events: [
      { type: 'goal', scoringSide: 'team', player: 'p1', assistPlayer: 'p2', minute: 10 },
      { type: 'goal', scoringSide: 'opponent', temporaryOpponentPlayerName: 'Rival 9', minute: 30 },
      { type: 'goal', scoringSide: 'opponent', player: 'op1', assistPlayer: 'op2', minute: 35 },
      { type: 'yellow_card', team: 't1', player: 'p3', minute: 40 },
      { type: 'red_card', temporaryOpponentPlayerName: 'Rival 5', minute: 70 },
      { type: 'substitution', playerOut: 'p4', playerIn: 'p5', minute: 60 },
    ],
  });

  assert.equal(form.finalTeamScore, 2);
  assert.equal(form.finalOpponentScore, 1);
  assert.equal(form.goals.length, 3);
  assert.equal(form.goals[0].assistPlayerId, 'p2');
  assert.equal(form.goals[1].temporaryOpponentPlayerName, 'Rival 9');
  assert.equal(form.goals[2].opponentPlayerId, 'op1');
  assert.equal(form.goals[2].opponentAssistPlayerId, 'op2');
  assert.equal(form.yellowCards[0].playerId, 'p3');
  assert.equal(form.redCards[0].temporaryOpponentPlayerName, 'Rival 5');
  assert.equal(form.substitutions[0].playerInId, 'p5');
  assert.equal(form.manOfTheMatchPlayerId, 'p1');
  assert.equal(form.refereeName, 'Ref');
});

test('direct result goal count validation accepts matching final score', () => {
  const form = {
    finalTeamScore: '1',
    finalOpponentScore: '1',
    goals: [
      { scoringSide: 'team' },
      { scoringSide: 'opponent' },
    ],
  };

  assert.deepEqual(countDirectGoalsBySide(form.goals), { team: 1, opponent: 1 });
  assert.equal(validateDirectResultGoalCounts(form), '');
});

test('direct result goal count validation explains team score mismatch', () => {
  assert.equal(validateDirectResultGoalCounts({
    finalTeamScore: '2',
    finalOpponentScore: '0',
    goals: [{ scoringSide: 'team' }],
  }), 'Team score is 2, but 1 team goal entry has been added.');
});

test('direct result goal count validation explains opponent score mismatch', () => {
  assert.equal(validateDirectResultGoalCounts({
    finalTeamScore: '0',
    finalOpponentScore: '0',
    goals: [{ scoringSide: 'opponent' }],
  }), 'Opponent score is 0, but 1 opponent goal entry has been added.');
});

test('direct result payload normalizes empty optional IDs, strings, and minute fields', () => {
  const payload = buildDirectResultPayload({
    finalTeamScore: '1',
    finalOpponentScore: '1',
    goals: [
      { scoringSide: 'team', playerId: 'p1', assistPlayerId: '', temporaryOpponentPlayerName: '', minute: '' },
      { scoringSide: 'opponent', playerId: '', assistPlayerId: '', opponentPlayerId: 'op1', opponentAssistPlayerId: 'op2', temporaryOpponentPlayerName: ' Rival 9 ', minute: null },
    ],
    yellowCards: [{ side: 'opponent', playerId: '', opponentPlayerId: 'op3', temporaryOpponentPlayerName: ' Rival 4 ', minute: '' }],
    redCards: [],
    substitutions: [{ playerOutId: 'p2', playerInId: 'p3', minute: '' }],
    manOfTheMatchPlayerId: '',
    completionNotes: ' Good match ',
    attendance: '',
    matchDuration: '',
    refereeName: ' Ref ',
    venueNotes: ' Dry ',
  });

  assert.equal(payload.goals[0].assistPlayerId, null);
  assert.equal(payload.goals[0].temporaryOpponentPlayerName, null);
  assert.equal(payload.goals[0].minute, null);
  assert.equal(payload.goals[1].playerId, null);
  assert.equal(payload.goals[1].opponentPlayerId, 'op1');
  assert.equal(payload.goals[1].opponentAssistPlayerId, 'op2');
  assert.equal(payload.goals[1].temporaryOpponentPlayerName, 'Rival 9');
  assert.equal(payload.yellowCards[0].playerId, null);
  assert.equal(payload.yellowCards[0].opponentPlayerId, 'op3');
  assert.equal(payload.yellowCards[0].temporaryOpponentPlayerName, 'Rival 4');
  assert.equal(payload.substitutions[0].minute, null);
  assert.equal(payload.manOfTheMatchPlayerId, null);
  assert.equal(payload.attendance, null);
  assert.equal(payload.matchDuration, null);
  assert.equal(payload.refereeName, 'Ref');
});

test('direct result substitution options track current field and bench players by row', () => {
  const starters = [snapshot('p1', 'Starter One'), snapshot('p2', 'Starter Two')];
  const substitutes = [snapshot('p12', 'Bench Twelve'), snapshot('p13', 'Bench Thirteen')];
  const substitutions = [
    { playerOutId: 'p1', playerInId: 'p12' },
    { playerOutId: 'p12', playerInId: 'p13' },
  ];

  const first = buildDirectSubstitutionOptions({ starters, substitutes, substitutions, rowIndex: 0 });
  assert.deepEqual(first.onField.map((player) => player.player), ['p1', 'p2']);
  assert.deepEqual(first.bench.map((player) => player.player), ['p12', 'p13']);

  const second = buildDirectSubstitutionOptions({ starters, substitutes, substitutions, rowIndex: 1 });
  assert.deepEqual(second.onField.map((player) => player.player), ['p2', 'p12']);
  assert.deepEqual(second.bench.map((player) => player.player), ['p13']);
});
