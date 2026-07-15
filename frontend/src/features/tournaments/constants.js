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
