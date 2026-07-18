export const TOURNAMENT_SCOPE = Object.freeze({
  INTER_COLLEGE: 'inter_college',
  INTRA_COLLEGE: 'intra_college',
});

export const TOURNAMENT_SCOPE_LABEL = Object.freeze({
  [TOURNAMENT_SCOPE.INTER_COLLEGE]: 'Inter College',
  [TOURNAMENT_SCOPE.INTRA_COLLEGE]: 'Intra College',
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

export const TOURNAMENT_COMPETITION_FORMAT_LABEL = Object.freeze({
  [TOURNAMENT_COMPETITION_FORMAT.LEAGUE]: 'League',
  [TOURNAMENT_COMPETITION_FORMAT.KNOCKOUT]: 'Knockout',
  [TOURNAMENT_COMPETITION_FORMAT.GROUP_KNOCKOUT]: 'Group + Knockout',
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

export const TOURNAMENT_PARTICIPANT_TYPE = Object.freeze({
  REGISTERED_TEAM: 'registered_team',
  EXTERNAL_TEAM: 'external_team',
  INTRA_TEAM: 'intra_team',
});

export const TOURNAMENT_PARTICIPANT_TYPE_LABEL = Object.freeze({
  [TOURNAMENT_PARTICIPANT_TYPE.REGISTERED_TEAM]: 'Registered FootStream Team',
  [TOURNAMENT_PARTICIPANT_TYPE.EXTERNAL_TEAM]: 'External Team',
  [TOURNAMENT_PARTICIPANT_TYPE.INTRA_TEAM]: 'Intra-college Team',
});

export const MATCH_STATISTIC_SCOPE = Object.freeze({
  NORMAL_MATCH: 'normal_match',
  INTER_COLLEGE_TOURNAMENT: 'inter_college_tournament',
  INTRA_COLLEGE_TOURNAMENT: 'intra_college_tournament',
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
});

export const MATCH_FORMAT_PLAYERS_ON_FIELD = Object.freeze({
  [TOURNAMENT_MATCH_FORMAT_LABEL.FIVE_V_FIVE]: 5,
  [TOURNAMENT_MATCH_FORMAT_LABEL.SIX_V_SIX]: 6,
  [TOURNAMENT_MATCH_FORMAT_LABEL.SEVEN_V_SEVEN]: 7,
  [TOURNAMENT_MATCH_FORMAT_LABEL.EIGHT_V_EIGHT]: 8,
  [TOURNAMENT_MATCH_FORMAT_LABEL.NINE_V_NINE]: 9,
  [TOURNAMENT_MATCH_FORMAT_LABEL.ELEVEN_V_ELEVEN]: 11,
});

export const TOURNAMENT_FORMATION_PRESETS = Object.freeze({
  5: Object.freeze(['1-2-1', '2-1-1', '1-1-2']),
  6: Object.freeze(['2-2-1', '2-1-2', '1-3-1']),
  7: Object.freeze(['2-3-1', '3-2-1', '2-2-2']),
  8: Object.freeze(['3-3-1', '2-3-2', '3-2-2']),
  9: Object.freeze(['3-3-2', '3-2-3', '2-3-3']),
  11: Object.freeze(['4-3-3', '4-4-2', '4-2-3-1', '3-5-2', '3-4-3']),
});

export const startersForMatchFormat = (matchFormat, playersOnField) => {
  if (matchFormat === TOURNAMENT_MATCH_FORMAT_LABEL.CUSTOM) {
    const value = Number(playersOnField);
    return Number.isInteger(value) && value >= 3 && value <= 11 ? value : null;
  }
  return MATCH_FORMAT_PLAYERS_ON_FIELD[matchFormat] || null;
};

export const outfieldPlayersForMatchFormat = (matchFormat, playersOnField) => {
  const starters = startersForMatchFormat(matchFormat, playersOnField);
  return starters ? starters - 1 : null;
};

export const TOURNAMENT_APPROVAL_STATUS_LABEL = Object.freeze({
  [TOURNAMENT_APPROVAL_STATUS.DRAFT]: 'Draft',
  [TOURNAMENT_APPROVAL_STATUS.APPROVAL_PENDING]: 'Pending approval',
  [TOURNAMENT_APPROVAL_STATUS.CHANGES_REQUESTED]: 'Changes requested',
  [TOURNAMENT_APPROVAL_STATUS.APPROVED]: 'Approved',
  [TOURNAMENT_APPROVAL_STATUS.REJECTED]: 'Rejected',
  [TOURNAMENT_APPROVAL_STATUS.SUSPENDED]: 'Suspended',
});

export const TOURNAMENT_LIFECYCLE_STATUS_LABEL = Object.freeze({
  [TOURNAMENT_LIFECYCLE_STATUS.DRAFT]: 'Draft',
  [TOURNAMENT_LIFECYCLE_STATUS.REGISTRATION_OPEN]: 'Registration open',
  [TOURNAMENT_LIFECYCLE_STATUS.REGISTRATION_CLOSED]: 'Registration closed',
  [TOURNAMENT_LIFECYCLE_STATUS.FIXTURES_READY]: 'Fixtures ready',
  [TOURNAMENT_LIFECYCLE_STATUS.ONGOING]: 'Ongoing',
  [TOURNAMENT_LIFECYCLE_STATUS.COMPLETED]: 'Completed',
  [TOURNAMENT_LIFECYCLE_STATUS.ARCHIVED]: 'Archived',
});

export const TOURNAMENT_TIEBREAK_OPTIONS = Object.freeze([
  'points',
  'goal_difference',
  'goals_scored',
  'head_to_head',
  'fair_play',
  'manual_decision',
]);

export const TOURNAMENT_AWARD_OPTIONS = Object.freeze([
  'champion',
  'runner_up',
  'golden_boot',
  'golden_glove',
  'player_of_tournament',
  'fair_play_team',
]);

export const formatTournamentLabel = (value = '') =>
  String(value).replaceAll('_', ' ').replace(/\b\w/g, (character) => character.toUpperCase());
