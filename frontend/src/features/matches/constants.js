export const MATCH_TYPES = ['friendly', 'league', 'knockout', 'practice'];
export const MATCH_STATUSES = ['scheduled', 'live', 'half_time', 'cancelled', 'completed'];
export const FORMATIONS = ['4-3-3', '4-2-3-1', '4-4-2', '3-5-2', '3-4-3', '5-3-2', 'custom'];
export const FORMAT_FORMATIONS = {
  '5v5': ['1-2-1', '2-1-1', '1-1-2'],
  '7v7': ['2-3-1', '3-2-1', '2-2-2'],
  '11v11': FORMATIONS,
};
export const FORMAT_STARTERS = { '5v5': 5, '7v7': 7, '11v11': 11 };
export const MATCH_FORMATS = ['5v5', '7v7', '11v11'];
export const TEAM_SIDES = ['home', 'away'];

export const label = (value) => value ? value.charAt(0).toUpperCase() + value.slice(1).replace(/[-_]/g, ' ') : 'Not set';

export const formatLocalDateTime = (value) => new Intl.DateTimeFormat(undefined, {
  dateStyle: 'medium', timeStyle: 'short',
}).format(new Date(value));

export const toLocalInput = (value) => {
  if (!value) return '';
  const date = new Date(value);
  const offset = date.getTimezoneOffset();
  return new Date(date.getTime() - offset * 60_000).toISOString().slice(0, 16);
};

export const emptyMatch = Object.freeze({
  opponentMode: 'manual', registeredOpponentTeam: '', opponentName: '', tournament: '', venue: '', matchType: 'friendly', teamSide: 'home',
  scheduledAt: '', matchFormat: '11v11', formation: '4-3-3', customFormation: '', notes: '', temporaryPlayers: [],
  startingPlayerIds: [], substitutePlayerIds: [], opponentTemporaryPlayers: [], opponentStarterKeys: [], opponentSubstituteKeys: [],
});
