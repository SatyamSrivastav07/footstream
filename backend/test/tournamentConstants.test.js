import assert from 'node:assert/strict';
import test from 'node:test';
import {
  APPROVAL_TRANSITIONS,
  DEFAULT_TOURNAMENT_CONFIGURATION,
  GROUP_ALLOCATION_MODE,
  LIFECYCLE_TRANSITIONS,
  MATCH_STATISTIC_SCOPE,
  TOURNAMENT_APPROVAL_STATUS,
  TOURNAMENT_AWARD_IDENTIFIER,
  TOURNAMENT_COMPETITION_FORMAT,
  TOURNAMENT_FIXTURE_CREATION_MODE,
  TOURNAMENT_LIFECYCLE_STATUS,
  TOURNAMENT_MATCH_FORMAT_LABEL,
  TOURNAMENT_NOTIFICATION_TYPE,
  TOURNAMENT_PARTICIPANT_TYPE,
  TOURNAMENT_PARTICIPATION_STATUS,
  TOURNAMENT_PLAYER_SOURCE_TYPE,
  TOURNAMENT_SCOPE,
  TOURNAMENT_SERIES_CONTRACT_FIELDS,
  TOURNAMENT_SQUAD_STATUS,
  TOURNAMENT_STAGE,
  TOURNAMENT_TIEBREAK_TYPE,
  TOURNAMENT_VISIBILITY,
  canAdminReviewTournament,
  canHostEditTournament,
  canSubmitTournamentForApproval,
  createsPermanentPlayerForSourceType,
  createsPermanentTeamForParticipantType,
  hasUniqueValues,
  isParticipantTypeAllowedForScope,
  isTournamentArchived,
  isTournamentOperational,
  isTournamentPubliclyVisible,
  isValidPlayersOnField,
  isValidTournamentScope,
  participantTypesForScope,
  starterCountForTournament,
  statisticScopeForTournamentScope,
  validateApprovalTransition,
  validateLifecycleTransition,
} from '../src/constants/tournamentConstants.js';

const constantObjects = [
  TOURNAMENT_SCOPE,
  TOURNAMENT_APPROVAL_STATUS,
  TOURNAMENT_LIFECYCLE_STATUS,
  TOURNAMENT_VISIBILITY,
  TOURNAMENT_COMPETITION_FORMAT,
  TOURNAMENT_MATCH_FORMAT_LABEL,
  TOURNAMENT_PARTICIPANT_TYPE,
  TOURNAMENT_PARTICIPATION_STATUS,
  TOURNAMENT_SQUAD_STATUS,
  TOURNAMENT_PLAYER_SOURCE_TYPE,
  MATCH_STATISTIC_SCOPE,
  GROUP_ALLOCATION_MODE,
  TOURNAMENT_TIEBREAK_TYPE,
  TOURNAMENT_FIXTURE_CREATION_MODE,
  TOURNAMENT_STAGE,
  TOURNAMENT_AWARD_IDENTIFIER,
  TOURNAMENT_NOTIFICATION_TYPE,
];

test('tournament constants are unique and contain required enum values', () => {
  constantObjects.forEach((constantObject) => assert.equal(hasUniqueValues(constantObject), true));
  assert.deepEqual(Object.values(TOURNAMENT_SCOPE).sort(), ['inter_college', 'intra_college']);
  assert.ok(Object.values(TOURNAMENT_APPROVAL_STATUS).includes('changes_requested'));
  assert.ok(Object.values(TOURNAMENT_LIFECYCLE_STATUS).includes('fixtures_ready'));
  assert.ok(Object.values(TOURNAMENT_MATCH_FORMAT_LABEL).includes('custom'));
  assert.ok(Object.values(TOURNAMENT_NOTIFICATION_TYPE).includes('tournament_approval_submitted'));
  assert.deepEqual(TOURNAMENT_SERIES_CONTRACT_FIELDS, ['seriesName', 'seriesSlug', 'seasonLabel', 'editionNumber']);
});

test('participant types are compatible with tournament scope only', () => {
  assert.equal(isValidTournamentScope(TOURNAMENT_SCOPE.INTER_COLLEGE), true);
  assert.equal(isValidTournamentScope('school'), false);
  assert.deepEqual(participantTypesForScope(TOURNAMENT_SCOPE.INTER_COLLEGE), [
    TOURNAMENT_PARTICIPANT_TYPE.REGISTERED_TEAM,
    TOURNAMENT_PARTICIPANT_TYPE.EXTERNAL_TEAM,
  ]);
  assert.deepEqual(participantTypesForScope(TOURNAMENT_SCOPE.INTRA_COLLEGE), [TOURNAMENT_PARTICIPANT_TYPE.INTRA_TEAM]);
  assert.equal(isParticipantTypeAllowedForScope(TOURNAMENT_SCOPE.INTER_COLLEGE, TOURNAMENT_PARTICIPANT_TYPE.REGISTERED_TEAM), true);
  assert.equal(isParticipantTypeAllowedForScope(TOURNAMENT_SCOPE.INTER_COLLEGE, TOURNAMENT_PARTICIPANT_TYPE.EXTERNAL_TEAM), true);
  assert.equal(isParticipantTypeAllowedForScope(TOURNAMENT_SCOPE.INTER_COLLEGE, TOURNAMENT_PARTICIPANT_TYPE.INTRA_TEAM), false);
  assert.equal(isParticipantTypeAllowedForScope(TOURNAMENT_SCOPE.INTRA_COLLEGE, TOURNAMENT_PARTICIPANT_TYPE.INTRA_TEAM), true);
});

test('playersOnField bounds and match-format labels are deterministic', () => {
  assert.equal(isValidPlayersOnField(3), true);
  assert.equal(isValidPlayersOnField(11), true);
  assert.equal(isValidPlayersOnField(2), false);
  assert.equal(isValidPlayersOnField(12), false);
  assert.equal(starterCountForTournament({ matchFormatLabel: TOURNAMENT_MATCH_FORMAT_LABEL.FIVE_V_FIVE }), 5);
  assert.equal(starterCountForTournament({ matchFormatLabel: TOURNAMENT_MATCH_FORMAT_LABEL.SEVEN_V_SEVEN }), 7);
  assert.equal(starterCountForTournament({ matchFormatLabel: TOURNAMENT_MATCH_FORMAT_LABEL.ELEVEN_V_ELEVEN }), 11);
  assert.equal(starterCountForTournament({ matchFormatLabel: TOURNAMENT_MATCH_FORMAT_LABEL.CUSTOM, playersOnField: 8 }), 8);
  assert.equal(starterCountForTournament({ matchFormatLabel: TOURNAMENT_MATCH_FORMAT_LABEL.CUSTOM, playersOnField: 12 }), null);
});

test('approval transitions allow only documented status movement', () => {
  assert.deepEqual(APPROVAL_TRANSITIONS[TOURNAMENT_APPROVAL_STATUS.DRAFT], [TOURNAMENT_APPROVAL_STATUS.APPROVAL_PENDING]);
  assert.equal(validateApprovalTransition(TOURNAMENT_APPROVAL_STATUS.DRAFT, TOURNAMENT_APPROVAL_STATUS.APPROVAL_PENDING), true);
  assert.equal(validateApprovalTransition(TOURNAMENT_APPROVAL_STATUS.CHANGES_REQUESTED, TOURNAMENT_APPROVAL_STATUS.APPROVAL_PENDING), true);
  assert.equal(validateApprovalTransition(TOURNAMENT_APPROVAL_STATUS.APPROVAL_PENDING, TOURNAMENT_APPROVAL_STATUS.APPROVED), true);
  assert.equal(validateApprovalTransition(TOURNAMENT_APPROVAL_STATUS.APPROVAL_PENDING, TOURNAMENT_APPROVAL_STATUS.REJECTED), true);
  assert.equal(validateApprovalTransition(TOURNAMENT_APPROVAL_STATUS.APPROVED, TOURNAMENT_APPROVAL_STATUS.SUSPENDED), true);
  assert.equal(validateApprovalTransition(TOURNAMENT_APPROVAL_STATUS.SUSPENDED, TOURNAMENT_APPROVAL_STATUS.APPROVED), true);
  assert.equal(validateApprovalTransition(TOURNAMENT_APPROVAL_STATUS.REJECTED, TOURNAMENT_APPROVAL_STATUS.APPROVAL_PENDING), false);
  assert.equal(validateApprovalTransition(TOURNAMENT_APPROVAL_STATUS.DRAFT, TOURNAMENT_APPROVAL_STATUS.APPROVED), false);
});

test('lifecycle transitions are sequential and archived is terminal', () => {
  assert.deepEqual(LIFECYCLE_TRANSITIONS[TOURNAMENT_LIFECYCLE_STATUS.ARCHIVED], []);
  assert.equal(validateLifecycleTransition(TOURNAMENT_LIFECYCLE_STATUS.DRAFT, TOURNAMENT_LIFECYCLE_STATUS.REGISTRATION_OPEN), true);
  assert.equal(validateLifecycleTransition(TOURNAMENT_LIFECYCLE_STATUS.REGISTRATION_OPEN, TOURNAMENT_LIFECYCLE_STATUS.REGISTRATION_CLOSED), true);
  assert.equal(validateLifecycleTransition(TOURNAMENT_LIFECYCLE_STATUS.REGISTRATION_CLOSED, TOURNAMENT_LIFECYCLE_STATUS.FIXTURES_READY), true);
  assert.equal(validateLifecycleTransition(TOURNAMENT_LIFECYCLE_STATUS.FIXTURES_READY, TOURNAMENT_LIFECYCLE_STATUS.ONGOING), true);
  assert.equal(validateLifecycleTransition(TOURNAMENT_LIFECYCLE_STATUS.ONGOING, TOURNAMENT_LIFECYCLE_STATUS.COMPLETED), true);
  assert.equal(validateLifecycleTransition(TOURNAMENT_LIFECYCLE_STATUS.COMPLETED, TOURNAMENT_LIFECYCLE_STATUS.ARCHIVED), true);
  assert.equal(validateLifecycleTransition(TOURNAMENT_LIFECYCLE_STATUS.COMPLETED, TOURNAMENT_LIFECYCLE_STATUS.ONGOING), false);
  assert.equal(validateLifecycleTransition(TOURNAMENT_LIFECYCLE_STATUS.ARCHIVED, TOURNAMENT_LIFECYCLE_STATUS.REGISTRATION_OPEN), false);
});

test('public visibility and operational helpers require approval and safe flags', () => {
  const publicTournament = {
    approvalStatus: TOURNAMENT_APPROVAL_STATUS.APPROVED,
    lifecycleStatus: TOURNAMENT_LIFECYCLE_STATUS.COMPLETED,
    visibility: TOURNAMENT_VISIBILITY.PUBLIC,
    isPublished: true,
  };
  assert.equal(isTournamentPubliclyVisible(publicTournament), true);
  assert.equal(isTournamentOperational(publicTournament), true);
  assert.equal(isTournamentArchived({ lifecycleStatus: TOURNAMENT_LIFECYCLE_STATUS.ARCHIVED }), true);
  assert.equal(isTournamentPubliclyVisible({ ...publicTournament, approvalStatus: TOURNAMENT_APPROVAL_STATUS.SUSPENDED }), false);
  assert.equal(isTournamentPubliclyVisible({ ...publicTournament, visibility: TOURNAMENT_VISIBILITY.PRIVATE }), false);
  assert.equal(isTournamentPubliclyVisible({ ...publicTournament, isPublished: false }), false);
  assert.equal(isTournamentPubliclyVisible({ ...publicTournament, lifecycleStatus: TOURNAMENT_LIFECYCLE_STATUS.ARCHIVED }), false);
});

test('host editability and super-admin review contracts are role and ownership based', () => {
  assert.equal(canSubmitTournamentForApproval({ approvalStatus: TOURNAMENT_APPROVAL_STATUS.DRAFT }), true);
  assert.equal(canSubmitTournamentForApproval({ approvalStatus: TOURNAMENT_APPROVAL_STATUS.CHANGES_REQUESTED }), true);
  assert.equal(canSubmitTournamentForApproval({ approvalStatus: TOURNAMENT_APPROVAL_STATUS.REJECTED }), false);
  assert.equal(canHostEditTournament({
    userRole: 'teamAdmin',
    userTeamId: 'team1',
    hostTeamId: 'team1',
    approvalStatus: TOURNAMENT_APPROVAL_STATUS.DRAFT,
    lifecycleStatus: TOURNAMENT_LIFECYCLE_STATUS.DRAFT,
  }), true);
  assert.equal(canHostEditTournament({
    userRole: 'teamAdmin',
    userTeamId: { _id: 'team1' },
    hostTeamId: { _id: 'team1' },
    approvalStatus: TOURNAMENT_APPROVAL_STATUS.DRAFT,
    lifecycleStatus: TOURNAMENT_LIFECYCLE_STATUS.DRAFT,
  }), true);
  assert.equal(canHostEditTournament({
    userRole: 'teamAdmin',
    userTeamId: 'team2',
    hostTeamId: 'team1',
    approvalStatus: TOURNAMENT_APPROVAL_STATUS.DRAFT,
    lifecycleStatus: TOURNAMENT_LIFECYCLE_STATUS.DRAFT,
  }), false);
  assert.equal(canHostEditTournament({
    userRole: 'teamAdmin',
    userTeamId: 'team1',
    hostTeamId: 'team1',
    approvalStatus: TOURNAMENT_APPROVAL_STATUS.APPROVAL_PENDING,
    lifecycleStatus: TOURNAMENT_LIFECYCLE_STATUS.DRAFT,
  }), false);
  assert.equal(canAdminReviewTournament({ userRole: 'superAdmin' }), true);
  assert.equal(canAdminReviewTournament({ userRole: 'teamAdmin' }), false);
});

test('statistic scope and source contracts keep tournament data separated', () => {
  assert.equal(statisticScopeForTournamentScope(TOURNAMENT_SCOPE.INTER_COLLEGE), MATCH_STATISTIC_SCOPE.INTER_COLLEGE_TOURNAMENT);
  assert.equal(statisticScopeForTournamentScope(TOURNAMENT_SCOPE.INTRA_COLLEGE), MATCH_STATISTIC_SCOPE.INTRA_COLLEGE_TOURNAMENT);
  assert.equal(statisticScopeForTournamentScope(null), MATCH_STATISTIC_SCOPE.NORMAL_MATCH);
  assert.equal(createsPermanentTeamForParticipantType(TOURNAMENT_PARTICIPANT_TYPE.REGISTERED_TEAM), true);
  assert.equal(createsPermanentTeamForParticipantType(TOURNAMENT_PARTICIPANT_TYPE.EXTERNAL_TEAM), false);
  assert.equal(createsPermanentTeamForParticipantType(TOURNAMENT_PARTICIPANT_TYPE.INTRA_TEAM), false);
  assert.equal(createsPermanentPlayerForSourceType(TOURNAMENT_PLAYER_SOURCE_TYPE.REGISTERED_PLAYER), false);
  assert.equal(createsPermanentPlayerForSourceType(TOURNAMENT_PLAYER_SOURCE_TYPE.MANUAL_PLAYER), false);
});

test('default tournament configuration is safe and bounded', () => {
  assert.equal(DEFAULT_TOURNAMENT_CONFIGURATION.tournamentScope, TOURNAMENT_SCOPE.INTER_COLLEGE);
  assert.equal(DEFAULT_TOURNAMENT_CONFIGURATION.competitionFormat, TOURNAMENT_COMPETITION_FORMAT.LEAGUE);
  assert.equal(DEFAULT_TOURNAMENT_CONFIGURATION.matchFormatLabel, TOURNAMENT_MATCH_FORMAT_LABEL.ELEVEN_V_ELEVEN);
  assert.equal(DEFAULT_TOURNAMENT_CONFIGURATION.playersOnField, 11);
  assert.equal(DEFAULT_TOURNAMENT_CONFIGURATION.minimumTeams, 2);
  assert.equal(DEFAULT_TOURNAMENT_CONFIGURATION.maximumTeams, 16);
  assert.equal(DEFAULT_TOURNAMENT_CONFIGURATION.winPoints, 3);
  assert.equal(DEFAULT_TOURNAMENT_CONFIGURATION.drawPoints, 1);
  assert.equal(DEFAULT_TOURNAMENT_CONFIGURATION.lossPoints, 0);
  assert.equal(DEFAULT_TOURNAMENT_CONFIGURATION.walkoverWinnerGoals, 3);
  assert.equal(DEFAULT_TOURNAMENT_CONFIGURATION.walkoverLoserGoals, 0);
  assert.equal(DEFAULT_TOURNAMENT_CONFIGURATION.fixtureCreationMode, TOURNAMENT_FIXTURE_CREATION_MODE.MANUAL);
  assert.equal(DEFAULT_TOURNAMENT_CONFIGURATION.groupAllocationMode, GROUP_ALLOCATION_MODE.MANUAL);
});

test('award identifiers and tiebreak ordering are unique and include required foundation values', () => {
  assert.ok(DEFAULT_TOURNAMENT_CONFIGURATION.enabledAwards.includes(TOURNAMENT_AWARD_IDENTIFIER.CHAMPION));
  assert.ok(DEFAULT_TOURNAMENT_CONFIGURATION.enabledAwards.includes(TOURNAMENT_AWARD_IDENTIFIER.GOLDEN_BOOT));
  assert.ok(DEFAULT_TOURNAMENT_CONFIGURATION.enabledAwards.includes(TOURNAMENT_AWARD_IDENTIFIER.GOLDEN_GLOVE));
  assert.ok(Object.values(TOURNAMENT_AWARD_IDENTIFIER).includes('fair_play_team'));
  assert.equal(new Set(DEFAULT_TOURNAMENT_CONFIGURATION.tiebreakPriority).size, DEFAULT_TOURNAMENT_CONFIGURATION.tiebreakPriority.length);
  assert.deepEqual(DEFAULT_TOURNAMENT_CONFIGURATION.tiebreakPriority.slice(0, 3), [
    TOURNAMENT_TIEBREAK_TYPE.POINTS,
    TOURNAMENT_TIEBREAK_TYPE.GOAL_DIFFERENCE,
    TOURNAMENT_TIEBREAK_TYPE.GOALS_SCORED,
  ]);
});
