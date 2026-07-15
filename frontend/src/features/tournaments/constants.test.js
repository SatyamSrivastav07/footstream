import assert from 'node:assert/strict';
import { test } from 'vitest';
import {
  DEFAULT_TOURNAMENT_CONFIGURATION,
  MATCH_STATISTIC_SCOPE,
  TOURNAMENT_APPROVAL_STATUS,
  TOURNAMENT_COMPETITION_FORMAT,
  TOURNAMENT_COMPETITION_FORMAT_LABEL,
  TOURNAMENT_LIFECYCLE_STATUS,
  TOURNAMENT_MATCH_FORMAT_LABEL,
  TOURNAMENT_PARTICIPANT_TYPE,
  TOURNAMENT_PARTICIPANT_TYPE_LABEL,
  TOURNAMENT_SCOPE,
  TOURNAMENT_SCOPE_LABEL,
  TOURNAMENT_VISIBILITY,
} from './constants.js';

const values = (constantObject) => Object.values(constantObject);

test('frontend tournament constants expose safe labels and defaults only', () => {
  assert.deepEqual(values(TOURNAMENT_SCOPE).sort(), ['inter_college', 'intra_college']);
  assert.equal(TOURNAMENT_SCOPE_LABEL[TOURNAMENT_SCOPE.INTER_COLLEGE], 'Inter College');
  assert.equal(TOURNAMENT_SCOPE_LABEL[TOURNAMENT_SCOPE.INTRA_COLLEGE], 'Intra College');
  assert.ok(values(TOURNAMENT_APPROVAL_STATUS).includes('approval_pending'));
  assert.ok(values(TOURNAMENT_LIFECYCLE_STATUS).includes('fixtures_ready'));
  assert.ok(values(TOURNAMENT_VISIBILITY).includes('public'));
  assert.equal(TOURNAMENT_COMPETITION_FORMAT_LABEL[TOURNAMENT_COMPETITION_FORMAT.GROUP_KNOCKOUT], 'Group + Knockout');
  assert.ok(values(TOURNAMENT_MATCH_FORMAT_LABEL).includes('custom'));
  assert.equal(TOURNAMENT_PARTICIPANT_TYPE_LABEL[TOURNAMENT_PARTICIPANT_TYPE.REGISTERED_TEAM], 'Registered FootStream Team');
  assert.ok(values(MATCH_STATISTIC_SCOPE).includes('intra_college_tournament'));
  assert.equal(DEFAULT_TOURNAMENT_CONFIGURATION.playersOnField, 11);
  assert.equal(DEFAULT_TOURNAMENT_CONFIGURATION.winPoints, 3);
});
