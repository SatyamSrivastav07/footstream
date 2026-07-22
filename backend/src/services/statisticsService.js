import Match from '../models/Match.js';
import MatchEvent from '../models/MatchEvent.js';
import MatchCollaboration from '../models/MatchCollaboration.js';
import Player from '../models/Player.js';
import AppError from '../utils/AppError.js';
import { playerPhotoUrl } from './playerPhotoService.js';
import { deriveResult, idString } from './resultService.js';

export const emptyPlayerStats = () => ({ matchesPlayed: 0, starts: 0, substituteAppearances: 0, goals: 0, assists: 0, yellowCards: 0, redCards: 0, penaltiesScored: 0, penaltiesMissed: 0, penaltiesSaved: 0, ownGoals: 0, manOfTheMatchAwards: 0 });

const identityFrom = (snapshot) => snapshot && ({ playerId: idString(snapshot.player), name: snapshot.name, photoUrl: snapshot.photoUrl || '', position: snapshot.position, jerseyNumber: snapshot.jerseyNumber ?? null });

export const aggregateCompletedData = (matches, events) => {
  const byMatch = new Map();
  events.forEach((event) => { const key = idString(event.match); if (!byMatch.has(key)) byMatch.set(key, []); byMatch.get(key).push(event); });
  const players = new Map();
  const get = (snapshot) => {
    const identity = identityFrom(snapshot);
    if (!identity?.playerId) return null;
    if (!players.has(identity.playerId)) players.set(identity.playerId, { ...identity, ...emptyPlayerStats(), played: new Set(), started: new Set(), subbed: new Set() });
    return players.get(identity.playerId);
  };
  const team = { matchesPlayed: matches.length, wins: 0, draws: 0, losses: 0, goalsFor: 0, goalsAgainst: 0, goalDifference: 0, winPercentage: 0 };
  const history = [];

  for (const match of matches) {
    const matchId = idString(match);
    const matchEvents = byMatch.get(matchId) || [];
    const result = deriveResult(match, matchEvents);
    team[`${result.outcome === 'win' ? 'wins' : result.outcome === 'draw' ? 'draws' : 'losses'}`] += 1;
    team.goalsFor += result.finalTeamScore; team.goalsAgainst += result.finalOpponentScore;
    match.startingXI.forEach((snapshot) => { const item = get(snapshot); item.played.add(matchId); item.started.add(matchId); });
    match.substitutes.forEach(get);
    for (const event of matchEvents) {
      if (event.isUndone) continue;
      if (event.type === 'substitution') { const item = get(event.playerInSnapshot); if (item) { item.played.add(matchId); item.subbed.add(matchId); } }
      const actor = get(event.playerSnapshot);
      if (actor && event.type === 'goal' && event.scoringSide === 'team') actor.goals += 1;
      if (actor && event.type === 'yellow_card') actor.yellowCards += 1;
      if (actor && event.type === 'red_card') actor.redCards += 1;
      if (actor && event.type === 'penalty_scored' && event.scoringSide === 'team') actor.penaltiesScored += 1;
      if (actor && event.type === 'penalty_missed' && event.scoringSide === 'team') actor.penaltiesMissed += 1;
      if (actor && event.type === 'penalty_saved' && event.scoringSide === 'team') actor.penaltiesSaved += 1;
      const assist = get(event.assistPlayerSnapshot); if (assist) assist.assists += 1;
      const ownGoal = get(event.ownGoalBy?.playerSnapshot); if (ownGoal) ownGoal.ownGoals += 1;
    }
    const motm = get(match.manOfTheMatch); if (motm) motm.manOfTheMatchAwards += 1;
    history.push({ matchId, scheduledAt: match.scheduledAt, completedAt: match.completedAt, opponentName: match.opponent.name, tournament: match.tournament || '', venue: match.venue, matchType: match.matchType, teamSide: match.teamSide, outcome: result.outcome, finalTeamScore: result.finalTeamScore, finalOpponentScore: result.finalOpponentScore, manOfTheMatch: match.manOfTheMatch || null });
  }
  team.goalDifference = team.goalsFor - team.goalsAgainst;
  team.winPercentage = team.matchesPlayed ? Math.round((team.wins / team.matchesPlayed) * 10000) / 100 : 0;
  const playerItems = [...players.values()].map(({ played, started, subbed, ...item }) => ({ ...item, matchesPlayed: played.size, starts: started.size, substituteAppearances: subbed.size }));
  return { team, players: playerItems, history };
};

const invertSide = (side) => {
  if (side === 'home') return 'away';
  if (side === 'away') return 'home';
  return side;
};

const opponentSnapshot = (snapshot) => ({
  player: snapshot.registeredPlayer || snapshot.player,
  name: snapshot.name,
  jerseyNumber: snapshot.jerseyNumber ?? null,
  position: snapshot.position,
  photoUrl: snapshot.photoUrl || '',
  isCaptain: Boolean(snapshot.isCaptain),
  isViceCaptain: Boolean(snapshot.isViceCaptain),
});

const opponentPerspectiveMatch = (match) => ({
  ...match,
  team: match.registeredOpponentTeam,
  registeredOpponentTeam: match.team,
  teamSide: invertSide(match.teamSide),
  startingXI: (match.registeredOpponentStartingXI || []).filter((snapshot) => snapshot.registeredPlayer || snapshot.player).map(opponentSnapshot),
  substitutes: (match.registeredOpponentSubstitutes || []).filter((snapshot) => snapshot.registeredPlayer || snapshot.player).map(opponentSnapshot),
  opponent: {
    ...(match.opponent || {}),
    name: match.team?.name || match.opponent?.name || 'Opponent',
  },
});

const opponentPerspectiveEvent = (event) => ({
  ...event,
  scoringSide: event.scoringSide === 'team' ? 'opponent' : event.scoringSide === 'opponent' ? 'team' : event.scoringSide,
});

export const loadTeamData = async ({
  matchModel = Match,
  eventModel = MatchEvent,
  collaborationModel = MatchCollaboration,
  teamId,
}) => {
  const hostMatches = await matchModel.find({ team: teamId, status: 'completed', isActive: true }).populate('team', 'name slug logo').sort({ completedAt: -1, scheduledAt: -1 }).lean();
  const accepted = await collaborationModel.find({ opponentTeam: teamId, status: 'accepted' }).select('match').lean();
  const acceptedIds = accepted.map((item) => item.match);
  const opponentMatches = acceptedIds.length
    ? await matchModel.find({ _id: { $in: acceptedIds }, registeredOpponentTeam: teamId, status: 'completed', isActive: true }).populate('team', 'name slug logo').sort({ completedAt: -1, scheduledAt: -1 }).lean()
    : [];
  const hostIds = new Set(hostMatches.map(idString));
  const opponentIds = new Set(opponentMatches.map(idString));
  const allMatches = [...hostMatches, ...opponentMatches.map(opponentPerspectiveMatch)];
  const events = allMatches.length ? await eventModel.find({ match: { $in: allMatches.map((match) => match._id) }, isUndone: false }).lean() : [];
  const perspectiveEvents = events.map((event) => (opponentIds.has(idString(event.match)) && !hostIds.has(idString(event.match)) ? opponentPerspectiveEvent(event) : event));
  return aggregateCompletedData(allMatches, perspectiveEvents);
};

export const getPlayerStatistics = async ({ playerModel = Player, teamId, playerId, ...deps }) => {
  const player = await playerModel.findOne({ _id: playerId, ...(teamId ? { team: teamId } : {}) }).lean();
  if (!player) throw new AppError('Player not found.', 404, 'PLAYER_NOT_FOUND');
  const data = await loadTeamData({ ...deps, teamId: player.team });
  const historical = data.players.find((item) => item.playerId === idString(playerId));
  return { player: { _id: player._id, team: player.team, name: player.name, photoUrl: playerPhotoUrl(player), position: player.position, jerseyNumber: player.jerseyNumber, isActive: player.isActive }, statistics: historical ? Object.fromEntries(Object.entries(historical).filter(([key]) => !['playerId', 'name', 'photoUrl', 'position', 'jerseyNumber'].includes(key))) : emptyPlayerStats() };
};

export const getLeaderboards = async ({ teamId, type = 'goals', limit = 10, ...deps }) => {
  const fields = { goals: 'goals', assists: 'assists', appearances: 'matchesPlayed', motm: 'manOfTheMatchAwards' };
  const data = await loadTeamData({ ...deps, teamId });
  return data.players.map((player) => ({ playerId: player.playerId, name: player.name, photoUrl: player.photoUrl, position: player.position, jerseyNumber: player.jerseyNumber, value: player[fields[type]] }))
    .sort((a, b) => b.value - a.value || a.name.localeCompare(b.name) || a.playerId.localeCompare(b.playerId)).slice(0, limit);
};
