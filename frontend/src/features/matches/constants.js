export const MATCH_TYPES = ['friendly', 'league', 'knockout', 'practice'];
export const MATCH_STATUSES = ['scheduled', 'cancelled', 'completed'];
export const FORMATIONS = ['4-3-3', '4-2-3-1', '4-4-2', '3-5-2', '3-4-3', '5-3-2', 'custom'];
export const TEAM_SIDES = ['home', 'away'];

export const label = (value) => value ? value.charAt(0).toUpperCase() + value.slice(1).replaceAll('-', ' ') : 'Not set';

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
  opponentName: '', tournament: '', venue: '', matchType: 'friendly', teamSide: 'home',
  scheduledAt: '', formation: '4-3-3', customFormation: '', notes: '', temporaryPlayers: [],
  startingPlayerIds: [], substitutePlayerIds: [],
});

