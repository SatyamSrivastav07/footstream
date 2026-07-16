export const TOURNAMENT_SCOPE = Object.freeze({
  INTER_COLLEGE: 'inter_college',
  INTRA_COLLEGE: 'intra_college',
});

export const TOURNAMENT_APPROVAL_STATUS = Object.freeze({
  DRAFT: 'draft',
  APPROVAL_PENDING: 'approval_pending',
  CHANGES_REQUESTED: 'changes_requested',
  APPROVED: 'approved',
  REJECTED: 'rejected',
  SUSPENDED: 'suspended',
});

export const TOURNAMENT_LIFECYCLE_STATUS = Object.freeze({
  DRAFT: 'draft',
  REGISTRATION_OPEN: 'registration_open',
  REGISTRATION_CLOSED: 'registration_closed',
  FIXTURES_READY: 'fixtures_ready',
  ONGOING: 'ongoing',
  COMPLETED: 'completed',
  ARCHIVED: 'archived',
});

export const TOURNAMENT_VISIBILITY = Object.freeze({
  PUBLIC: 'public',
  PRIVATE: 'private',
});

export const TOURNAMENT_COMPETITION_FORMAT = Object.freeze({
  LEAGUE: 'league',
  KNOCKOUT: 'knockout',
  GROUP_KNOCKOUT: 'group_knockout',
});

export const TOURNAMENT_MATCH_FORMAT_LABEL = Object.freeze({
  FIVE_V_FIVE: '5v5',
  SIX_V_SIX: '6v6',
  SEVEN_V_SEVEN: '7v7',
  EIGHT_V_EIGHT: '8v8',
  NINE_V_NINE: '9v9',
  ELEVEN_V_ELEVEN: '11v11',
  CUSTOM: 'custom',
});

export const TOURNAMENT_PLAYERS_ON_FIELD = Object.freeze({
  MIN: 3,
  MAX: 11,
});

export const TOURNAMENT_PARTICIPANT_TYPE = Object.freeze({
  REGISTERED_TEAM: 'registered_team',
  EXTERNAL_TEAM: 'external_team',
  INTRA_TEAM: 'intra_team',
});

export const TOURNAMENT_PARTICIPATION_STATUS = Object.freeze({
  INVITED: 'invited',
  PENDING: 'pending',
  ACCEPTED: 'accepted',
  CONFIRMED: 'confirmed',
  DECLINED: 'declined',
  WITHDRAWN: 'withdrawn',
  DISQUALIFIED: 'disqualified',
});

export const TOURNAMENT_SQUAD_STATUS = Object.freeze({
  DRAFT: 'draft',
  SUBMITTED: 'submitted',
  APPROVED: 'approved',
  LOCKED: 'locked',
  REJECTED: 'rejected',
});

export const TOURNAMENT_PLAYER_SOURCE_TYPE = Object.freeze({
  REGISTERED_PLAYER: 'registered_player',
  MANUAL_PLAYER: 'manual_player',
});

export const MATCH_STATISTIC_SCOPE = Object.freeze({
  NORMAL_MATCH: 'normal_match',
  INTER_COLLEGE_TOURNAMENT: 'inter_college_tournament',
  INTRA_COLLEGE_TOURNAMENT: 'intra_college_tournament',
});

export const GROUP_ALLOCATION_MODE = Object.freeze({
  MANUAL: 'manual',
  AUTOMATIC: 'automatic',
});

export const TOURNAMENT_TIEBREAK_TYPE = Object.freeze({
  POINTS: 'points',
  GOAL_DIFFERENCE: 'goal_difference',
  GOALS_SCORED: 'goals_scored',
  HEAD_TO_HEAD: 'head_to_head',
  FAIR_PLAY: 'fair_play',
  MANUAL_DECISION: 'manual_decision',
  DRAW_LOTS: 'draw_lots',
});

export const TOURNAMENT_FIXTURE_CREATION_MODE = Object.freeze({
  MANUAL: 'manual',
  AUTOMATIC: 'automatic',
});

export const TOURNAMENT_STAGE = Object.freeze({
  GROUP: 'group',
  LEAGUE: 'league',
  ROUND_OF_16: 'round_of_16',
  QUARTERFINAL: 'quarterfinal',
  SEMIFINAL: 'semifinal',
  THIRD_PLACE: 'third_place',
  FINAL: 'final',
});

export const TOURNAMENT_AWARD_IDENTIFIER = Object.freeze({
  CHAMPION: 'champion',
  RUNNER_UP: 'runner_up',
  THIRD_PLACE: 'third_place',
  GOLDEN_BOOT: 'golden_boot',
  GOLDEN_GLOVE: 'golden_glove',
  PLAYER_OF_TOURNAMENT: 'player_of_tournament',
  MOST_ASSISTS: 'most_assists',
  FAIR_PLAY_TEAM: 'fair_play_team',
  BEST_DEFENDER: 'best_defender',
});

export const TOURNAMENT_NOTIFICATION_TYPE = Object.freeze({
  APPROVAL_SUBMITTED: 'tournament_approval_submitted',
  CHANGES_REQUESTED: 'tournament_changes_requested',
  APPROVED: 'tournament_approved',
  REJECTED: 'tournament_rejected',
  SUSPENDED: 'tournament_suspended',
  UNSUSPENDED: 'tournament_unsuspended',
  PARTICIPATION_ADDED: 'tournament_participation_added',
  PARTICIPATION_REMOVED: 'tournament_participation_removed',
  PARTICIPATION_CONFIRMED: 'tournament_participation_confirmed',
  INVITATION_ACCEPTED: 'tournament_invitation_accepted',
  INVITATION_DECLINED: 'tournament_invitation_declined',
  SQUAD_SUBMITTED: 'tournament_squad_submitted',
  SQUAD_APPROVED: 'tournament_squad_approved',
  SQUAD_LOCKED: 'tournament_squad_locked',
  SQUAD_UNLOCKED: 'tournament_squad_unlocked',
});

export const TOURNAMENT_SERIES_CONTRACT_FIELDS = Object.freeze([
  'seriesName',
  'seriesSlug',
  'seasonLabel',
  'editionNumber',
]);

export const MATCH_FORMAT_PLAYERS_ON_FIELD = Object.freeze({
  [TOURNAMENT_MATCH_FORMAT_LABEL.FIVE_V_FIVE]: 5,
  [TOURNAMENT_MATCH_FORMAT_LABEL.SIX_V_SIX]: 6,
  [TOURNAMENT_MATCH_FORMAT_LABEL.SEVEN_V_SEVEN]: 7,
  [TOURNAMENT_MATCH_FORMAT_LABEL.EIGHT_V_EIGHT]: 8,
  [TOURNAMENT_MATCH_FORMAT_LABEL.NINE_V_NINE]: 9,
  [TOURNAMENT_MATCH_FORMAT_LABEL.ELEVEN_V_ELEVEN]: 11,
});

export const PARTICIPANT_TYPES_BY_SCOPE = Object.freeze({
  [TOURNAMENT_SCOPE.INTER_COLLEGE]: Object.freeze([
    TOURNAMENT_PARTICIPANT_TYPE.REGISTERED_TEAM,
    TOURNAMENT_PARTICIPANT_TYPE.EXTERNAL_TEAM,
  ]),
  [TOURNAMENT_SCOPE.INTRA_COLLEGE]: Object.freeze([
    TOURNAMENT_PARTICIPANT_TYPE.INTRA_TEAM,
  ]),
});

export const APPROVAL_TRANSITIONS = Object.freeze({
  [TOURNAMENT_APPROVAL_STATUS.DRAFT]: Object.freeze([TOURNAMENT_APPROVAL_STATUS.APPROVAL_PENDING]),
  [TOURNAMENT_APPROVAL_STATUS.CHANGES_REQUESTED]: Object.freeze([TOURNAMENT_APPROVAL_STATUS.APPROVAL_PENDING]),
  [TOURNAMENT_APPROVAL_STATUS.APPROVAL_PENDING]: Object.freeze([
    TOURNAMENT_APPROVAL_STATUS.APPROVED,
    TOURNAMENT_APPROVAL_STATUS.REJECTED,
    TOURNAMENT_APPROVAL_STATUS.CHANGES_REQUESTED,
  ]),
  [TOURNAMENT_APPROVAL_STATUS.APPROVED]: Object.freeze([TOURNAMENT_APPROVAL_STATUS.SUSPENDED]),
  [TOURNAMENT_APPROVAL_STATUS.SUSPENDED]: Object.freeze([TOURNAMENT_APPROVAL_STATUS.APPROVED]),
  [TOURNAMENT_APPROVAL_STATUS.REJECTED]: Object.freeze([]),
});

export const LIFECYCLE_TRANSITIONS = Object.freeze({
  [TOURNAMENT_LIFECYCLE_STATUS.DRAFT]: Object.freeze([TOURNAMENT_LIFECYCLE_STATUS.REGISTRATION_OPEN]),
  [TOURNAMENT_LIFECYCLE_STATUS.REGISTRATION_OPEN]: Object.freeze([TOURNAMENT_LIFECYCLE_STATUS.REGISTRATION_CLOSED]),
  [TOURNAMENT_LIFECYCLE_STATUS.REGISTRATION_CLOSED]: Object.freeze([TOURNAMENT_LIFECYCLE_STATUS.FIXTURES_READY]),
  [TOURNAMENT_LIFECYCLE_STATUS.FIXTURES_READY]: Object.freeze([TOURNAMENT_LIFECYCLE_STATUS.ONGOING]),
  [TOURNAMENT_LIFECYCLE_STATUS.ONGOING]: Object.freeze([TOURNAMENT_LIFECYCLE_STATUS.COMPLETED]),
  [TOURNAMENT_LIFECYCLE_STATUS.COMPLETED]: Object.freeze([TOURNAMENT_LIFECYCLE_STATUS.ARCHIVED]),
  [TOURNAMENT_LIFECYCLE_STATUS.ARCHIVED]: Object.freeze([]),
});

export const TOURNAMENT_PERMISSION = Object.freeze({
  HOST_CREATE: 'host:create_own_tournament',
  HOST_EDIT_DRAFT: 'host:edit_own_draft',
  HOST_MANAGE_PARTICIPANTS: 'host:manage_own_participants',
  HOST_UPLOAD_BRANDING: 'host:upload_own_branding',
  HOST_SUBMIT_APPROVAL: 'host:submit_own_for_approval',
  HOST_VIEW_REVIEW_MESSAGES: 'host:view_own_review_messages',
  HOST_MANAGE_OPERATIONS: 'host:manage_own_operations_after_approval',
  SUPER_ADMIN_REVIEW: 'super_admin:review_all_tournaments',
  SUPER_ADMIN_APPROVE: 'super_admin:approve_tournament',
  SUPER_ADMIN_REJECT: 'super_admin:reject_tournament',
  SUPER_ADMIN_REQUEST_CHANGES: 'super_admin:request_tournament_changes',
  SUPER_ADMIN_SUSPEND: 'super_admin:suspend_tournament',
  SUPER_ADMIN_ARCHIVE: 'super_admin:archive_tournament',
  PARTICIPANT_VIEW: 'participant:view_tournament',
  PARTICIPANT_RESPOND_INVITATION: 'participant:accept_or_decline_invitation',
  PARTICIPANT_MANAGE_OWN_SQUAD: 'participant:manage_own_squad_before_lock',
  PUBLIC_READ: 'public:read_approved_published_tournament',
});

export const DEFAULT_TOURNAMENT_CONFIGURATION = Object.freeze({
  tournamentScope: TOURNAMENT_SCOPE.INTER_COLLEGE,
  competitionFormat: TOURNAMENT_COMPETITION_FORMAT.LEAGUE,
  matchFormatLabel: TOURNAMENT_MATCH_FORMAT_LABEL.ELEVEN_V_ELEVEN,
  playersOnField: 11,
  minimumTeams: 2,
  maximumTeams: 16,
  minimumTournamentSquadSize: 11,
  maximumTournamentSquadSize: 25,
  maximumMatchdaySquadSize: 18,
  maximumSubstitutes: 7,
  rollingSubstitutions: false,
  winPoints: 3,
  drawPoints: 1,
  lossPoints: 0,
  walkoverEnabled: true,
  walkoverWinnerGoals: 3,
  walkoverLoserGoals: 0,
  fixtureCreationMode: TOURNAMENT_FIXTURE_CREATION_MODE.MANUAL,
  groupAllocationMode: GROUP_ALLOCATION_MODE.MANUAL,
  tiebreakPriority: Object.freeze([
    TOURNAMENT_TIEBREAK_TYPE.POINTS,
    TOURNAMENT_TIEBREAK_TYPE.GOAL_DIFFERENCE,
    TOURNAMENT_TIEBREAK_TYPE.GOALS_SCORED,
    TOURNAMENT_TIEBREAK_TYPE.HEAD_TO_HEAD,
    TOURNAMENT_TIEBREAK_TYPE.FAIR_PLAY,
    TOURNAMENT_TIEBREAK_TYPE.MANUAL_DECISION,
  ]),
  enabledAwards: Object.freeze([
    TOURNAMENT_AWARD_IDENTIFIER.CHAMPION,
    TOURNAMENT_AWARD_IDENTIFIER.RUNNER_UP,
    TOURNAMENT_AWARD_IDENTIFIER.GOLDEN_BOOT,
    TOURNAMENT_AWARD_IDENTIFIER.GOLDEN_GLOVE,
    TOURNAMENT_AWARD_IDENTIFIER.PLAYER_OF_TOURNAMENT,
  ]),
});

export const valuesOf = (constantObject) => Object.values(constantObject);
export const hasUniqueValues = (constantObject) => new Set(valuesOf(constantObject)).size === valuesOf(constantObject).length;
export const isOneOf = (constantObject, value) => valuesOf(constantObject).includes(value);

export const isValidTournamentScope = (scope) => isOneOf(TOURNAMENT_SCOPE, scope);
export const isValidPlayersOnField = (playersOnField) =>
  Number.isInteger(playersOnField) &&
  playersOnField >= TOURNAMENT_PLAYERS_ON_FIELD.MIN &&
  playersOnField <= TOURNAMENT_PLAYERS_ON_FIELD.MAX;

export const participantTypesForScope = (scope) => PARTICIPANT_TYPES_BY_SCOPE[scope] || Object.freeze([]);
export const isParticipantTypeAllowedForScope = (scope, participantType) =>
  participantTypesForScope(scope).includes(participantType);

export const starterCountForTournament = ({ matchFormatLabel, playersOnField } = {}) => {
  if (matchFormatLabel === TOURNAMENT_MATCH_FORMAT_LABEL.CUSTOM) {
    return isValidPlayersOnField(playersOnField) ? playersOnField : null;
  }
  return MATCH_FORMAT_PLAYERS_ON_FIELD[matchFormatLabel] || null;
};

export const validateApprovalTransition = (fromStatus, toStatus) =>
  Boolean(APPROVAL_TRANSITIONS[fromStatus]?.includes(toStatus));

export const validateLifecycleTransition = (fromStatus, toStatus) =>
  Boolean(LIFECYCLE_TRANSITIONS[fromStatus]?.includes(toStatus));

export const isTournamentArchived = (tournament = {}) =>
  tournament.lifecycleStatus === TOURNAMENT_LIFECYCLE_STATUS.ARCHIVED ||
  tournament.isArchived === true;

export const isTournamentOperational = (tournament = {}) =>
  tournament.approvalStatus === TOURNAMENT_APPROVAL_STATUS.APPROVED &&
  !isTournamentArchived(tournament) &&
  ![TOURNAMENT_APPROVAL_STATUS.REJECTED, TOURNAMENT_APPROVAL_STATUS.SUSPENDED].includes(tournament.approvalStatus);

export const canSubmitTournamentForApproval = (tournament = {}) =>
  [TOURNAMENT_APPROVAL_STATUS.DRAFT, TOURNAMENT_APPROVAL_STATUS.CHANGES_REQUESTED].includes(tournament.approvalStatus) &&
  !isTournamentArchived(tournament);

export const canHostEditTournament = ({ userRole, userTeamId, hostTeamId, approvalStatus, lifecycleStatus, isArchived = false } = {}) =>
  userRole === 'teamAdmin' &&
  String(userTeamId || '') === String(hostTeamId || '') &&
  !isArchived &&
  lifecycleStatus !== TOURNAMENT_LIFECYCLE_STATUS.ARCHIVED &&
  [TOURNAMENT_APPROVAL_STATUS.DRAFT, TOURNAMENT_APPROVAL_STATUS.CHANGES_REQUESTED].includes(approvalStatus);

export const canAdminReviewTournament = ({ userRole } = {}) => userRole === 'superAdmin';

export const isTournamentPubliclyVisible = (tournament = {}) =>
  tournament.approvalStatus === TOURNAMENT_APPROVAL_STATUS.APPROVED &&
  tournament.visibility === TOURNAMENT_VISIBILITY.PUBLIC &&
  tournament.isPublished === true &&
  !isTournamentArchived(tournament);

export const statisticScopeForTournamentScope = (scope) => {
  if (scope === TOURNAMENT_SCOPE.INTER_COLLEGE) return MATCH_STATISTIC_SCOPE.INTER_COLLEGE_TOURNAMENT;
  if (scope === TOURNAMENT_SCOPE.INTRA_COLLEGE) return MATCH_STATISTIC_SCOPE.INTRA_COLLEGE_TOURNAMENT;
  return MATCH_STATISTIC_SCOPE.NORMAL_MATCH;
};

export const createsPermanentTeamForParticipantType = (participantType) =>
  participantType === TOURNAMENT_PARTICIPANT_TYPE.REGISTERED_TEAM;

export const createsPermanentPlayerForSourceType = (_sourceType) => false;
