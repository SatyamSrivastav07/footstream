import mongoose from 'mongoose';
import Match from '../models/Match.js';
import MatchEvent from '../models/MatchEvent.js';
import Tournament from '../models/Tournament.js';
import TournamentMatchdayLineup from '../models/TournamentMatchdayLineup.js';
import TournamentParticipant from '../models/TournamentParticipant.js';
import TournamentSquadPlayer from '../models/TournamentSquadPlayer.js';
import AppError from '../utils/AppError.js';
import {
  TOURNAMENT_APPROVAL_STATUS,
  TOURNAMENT_COMPETITION_FORMAT,
  TOURNAMENT_LIFECYCLE_STATUS,
  TOURNAMENT_LINEUP_STATUS,
  TOURNAMENT_PARTICIPANT_TYPE,
  TOURNAMENT_SCOPE,
  TOURNAMENT_VISIBILITY,
  isTournamentPubliclyVisible,
  startersForMatchFormat,
} from '../constants/tournamentConstants.js';
import {
  serializeTournamentHost,
  serializeTournamentParticipantPublic,
  serializeTournamentPublic,
} from '../serializers/tournamentSerializers.js';
import { deriveResult, idString } from './resultService.js';
import { ensureCollaborationRequest } from './matchCollaborationService.js';

const clean = (value = '') => String(value).trim().replace(/[<>]/g, '');
const objectId = (value) => new mongoose.Types.ObjectId(String(value));
const safeDate = (value) => {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
};

const isHost = (tournament, user) => idString(tournament.hostTeam) === idString(user?.team);
const ensureObjectId = (value, message = 'Invalid identifier.') => {
  if (!mongoose.isValidObjectId(value)) throw new AppError(message, 400, 'INVALID_ID');
};

const participantPublic = (participant) => serializeTournamentParticipantPublic(participant);

const matchPublic = (match, participantsById = new Map(), result = null) => ({
  id: idString(match._id),
  matchId: idString(match._id),
  team: match.team,
  registeredOpponentTeam: match.registeredOpponentTeam || null,
  homeParticipant: participantsById.get(idString(match.tournamentHomeParticipant)) || idString(match.tournamentHomeParticipant),
  awayParticipant: participantsById.get(idString(match.tournamentAwayParticipant)) || idString(match.tournamentAwayParticipant),
  fixtureNumber: match.tournamentFixtureNumber || null,
  stage: match.tournamentStage || '',
  round: match.tournamentRound || '',
  venue: match.venue || '',
  officials: match.officials || '',
  scheduledAt: match.scheduledAt,
  status: match.status,
  matchType: match.matchType,
  matchMode: match.matchMode,
  matchFormat: match.matchFormat,
  result: result || match.result || null,
  score: {
    home: match.homeScore || 0,
    away: match.awayScore || 0,
  },
});

const lineupPublic = (lineup, participantsById = new Map()) => ({
  id: idString(lineup._id),
  lineupId: idString(lineup._id),
  provisionalFixtureKey: lineup.provisionalFixtureKey,
  fixtureNumber: lineup.fixtureNumber || null,
  scheduledAt: lineup.scheduledAt || null,
  venue: lineup.venue || '',
  officials: lineup.officials || '',
  stage: lineup.stage || '',
  round: lineup.round || '',
  status: lineup.status,
  matchCreated: Boolean(lineup.matchCreated),
  match: idString(lineup.match),
  homeParticipant: participantsById.get(idString(lineup.homeParticipant)) || idString(lineup.homeParticipant),
  awayParticipant: participantsById.get(idString(lineup.awayParticipant)) || idString(lineup.awayParticipant),
});

const tournamentFilterForUser = (user, tournamentId) => {
  const filter = { _id: tournamentId };
  if (user?.role === 'teamAdmin') filter.$or = [{ hostTeam: user.team }];
  return filter;
};

const findTournamentForTeam = async ({ tournamentId, user }) => {
  ensureObjectId(tournamentId, 'Invalid tournament identifier.');
  const tournament = await Tournament.findOne(tournamentFilterForUser(user, tournamentId));
  if (!tournament) throw new AppError('Tournament not found.', 404, 'TOURNAMENT_NOT_FOUND');
  return tournament;
};

const findTournamentPublic = async ({ slug }) => {
  const tournament = await Tournament.findOne({
    slug,
    approvalStatus: TOURNAMENT_APPROVAL_STATUS.APPROVED,
    visibility: TOURNAMENT_VISIBILITY.PUBLIC,
    isPublished: true,
    isArchived: false,
  }).lean();
  if (!tournament || !isTournamentPubliclyVisible(tournament)) throw new AppError('Tournament not found.', 404, 'TOURNAMENT_NOT_FOUND');
  return tournament;
};

const assertOperationalTournament = (tournament) => {
  if (tournament.isArchived || tournament.lifecycleStatus === TOURNAMENT_LIFECYCLE_STATUS.ARCHIVED) {
    throw new AppError('Archived tournaments are read-only.', 409, 'TOURNAMENT_ARCHIVED');
  }
  if (tournament.approvalStatus !== TOURNAMENT_APPROVAL_STATUS.APPROVED) {
    throw new AppError('Tournament approval is required before fixture management.', 409, 'TOURNAMENT_APPROVAL_REQUIRED');
  }
};

const participantsFor = async (tournamentId) => {
  const participants = await TournamentParticipant.find({ tournament: tournamentId }).sort({ seed: 1, displayName: 1 }).lean();
  return {
    participants,
    byId: new Map(participants.map((participant) => [idString(participant._id), participantPublic(participant)])),
  };
};

const completedTournamentMatches = async (tournamentId) => Match.find({
  tournamentCompetition: tournamentId,
  isActive: true,
  status: 'completed',
}).sort({ completedAt: -1, scheduledAt: -1 }).lean();

export const listTournamentFixtures = async ({ tournamentId, user = null, publicSlug = '', query = {} }) => {
  const tournament = publicSlug ? await findTournamentPublic({ slug: publicSlug }) : await findTournamentForTeam({ tournamentId, user });
  const { byId } = await participantsFor(tournament._id);
  const status = query.status || '';
  const matchFilter = { tournamentCompetition: tournament._id, isActive: true };
  if (status) matchFilter.status = status;
  const [matches, lineups] = await Promise.all([
    Match.find(matchFilter).sort({ scheduledAt: 1, tournamentFixtureNumber: 1 }).lean(),
    TournamentMatchdayLineup.find({ tournament: tournament._id, matchCreated: false }).sort({ fixtureNumber: 1, scheduledAt: 1, createdAt: 1 }).lean(),
  ]);
  const items = [
    ...matches.map((match) => ({ type: 'match', ...matchPublic(match, byId) })),
    ...lineups.map((lineup) => ({ type: 'lineup', ...lineupPublic(lineup, byId) })),
  ].sort((a, b) => new Date(a.scheduledAt || 0) - new Date(b.scheduledAt || 0) || (a.fixtureNumber || 9999) - (b.fixtureNumber || 9999));
  return { tournament: publicSlug ? serializeTournamentPublic(tournament) : serializeTournamentHost(tournament), fixtures: items };
};

const createFixtureKey = ({ tournament, number, home, away, round = '' }) => (
  `${tournament.slug || idString(tournament._id)}-${round || 'fixture'}-${number}-${home.slug || idString(home._id)}-${away.slug || idString(away._id)}`.slice(0, 160)
);

const fixturePayload = ({ tournament, input, number, home, away }) => ({
  tournament: tournament._id,
  provisionalFixtureKey: clean(input.provisionalFixtureKey) || createFixtureKey({ tournament, number, home, away, round: input.round }),
  fixtureNumber: number,
  scheduledAt: safeDate(input.scheduledAt || tournament.startDate),
  venue: clean(input.venue || tournament.primaryVenue),
  officials: clean(input.officials || ''),
  stage: clean(input.stage || (tournament.competitionFormat === TOURNAMENT_COMPETITION_FORMAT.KNOCKOUT ? 'knockout' : 'league')),
  round: clean(input.round || 'Round 1'),
  homeParticipant: home._id,
  awayParticipant: away._id,
  createdBy: input.createdBy,
  updatedBy: input.createdBy,
});

export const createTournamentFixture = async ({ tournamentId, user, input = {} }) => {
  const tournament = await findTournamentForTeam({ tournamentId, user });
  if (!isHost(tournament, user)) throw new AppError('Only the host team can manage tournament fixtures.', 403, 'TOURNAMENT_HOST_REQUIRED');
  assertOperationalTournament(tournament);
  const [home, away] = await Promise.all([
    TournamentParticipant.findOne({ _id: input.homeParticipant, tournament: tournament._id }),
    TournamentParticipant.findOne({ _id: input.awayParticipant, tournament: tournament._id }),
  ]);
  if (!home || !away) throw new AppError('Choose valid tournament participants.', 404, 'TOURNAMENT_PARTICIPANT_NOT_FOUND');
  if (idString(home._id) === idString(away._id)) throw new AppError('Home and away participants must be different.', 400, 'TOURNAMENT_FIXTURE_PARTICIPANTS_SAME');
  const duplicate = await TournamentMatchdayLineup.exists({
    tournament: tournament._id,
    homeParticipant: home._id,
    awayParticipant: away._id,
    matchCreated: false,
    scheduledAt: safeDate(input.scheduledAt || tournament.startDate),
  });
  if (duplicate) throw new AppError('A draft fixture already exists for these participants at this kickoff.', 409, 'TOURNAMENT_FIXTURE_EXISTS');
  const count = await TournamentMatchdayLineup.countDocuments({ tournament: tournament._id });
  const lineup = await TournamentMatchdayLineup.create(fixturePayload({
    tournament,
    input: { ...input, createdBy: user._id },
    number: Number(input.fixtureNumber) || count + 1,
    home,
    away,
  }));
  return { fixture: lineupPublic(lineup.toObject(), (await participantsFor(tournament._id)).byId) };
};

export const generateTournamentFixtures = async ({ tournamentId, user, input = {} }) => {
  const tournament = await findTournamentForTeam({ tournamentId, user });
  if (!isHost(tournament, user)) throw new AppError('Only the host team can generate tournament fixtures.', 403, 'TOURNAMENT_HOST_REQUIRED');
  assertOperationalTournament(tournament);
  const participants = await TournamentParticipant.find({ tournament: tournament._id, status: { $nin: ['declined', 'withdrawn', 'disqualified'] } }).sort({ seed: 1, displayName: 1 });
  if (participants.length < 2) throw new AppError('Add at least two participants before generating fixtures.', 400, 'TOURNAMENT_PARTICIPANTS_REQUIRED');
  const existing = await TournamentMatchdayLineup.countDocuments({ tournament: tournament._id });
  if (existing && !input.append) throw new AppError('Fixtures already exist. Use append mode or manage fixtures manually.', 409, 'TOURNAMENT_FIXTURES_EXIST');
  const start = safeDate(input.startDate || tournament.fixturePublish || tournament.startDate) || new Date();
  const intervalDays = Math.max(Number(input.intervalDays) || 1, 1);
  const fixtures = [];
  let number = existing + 1;
  for (let i = 0; i < participants.length; i += 1) {
    for (let j = i + 1; j < participants.length; j += 1) {
      const scheduledAt = new Date(start.getTime() + (fixtures.length * intervalDays * 24 * 60 * 60 * 1000));
      fixtures.push(fixturePayload({
        tournament,
        input: { ...input, scheduledAt, createdBy: user._id, round: input.round || 'League Round' },
        number,
        home: participants[i],
        away: participants[j],
      }));
      number += 1;
    }
  }
  const created = await TournamentMatchdayLineup.insertMany(fixtures, { ordered: false });
  return { created: created.length, fixtures: created.map((lineup) => lineupPublic(lineup.toObject(), new Map())) };
};

const snapshotForMatch = (player) => ({
  player: player.registeredPlayer || player._id,
  name: player.name,
  jerseyNumber: player.jersey ?? null,
  position: player.position,
  photoUrl: player.photoUrl || player.photo?.imageUrl || '',
  isCaptain: Boolean(player.captain),
  isViceCaptain: Boolean(player.viceCaptain),
  slotId: player.slotId || '',
  lineIndex: player.lineIndex ?? null,
  positionIndex: player.positionIndex ?? null,
  roleLabel: player.roleLabel || '',
  x: player.x ?? null,
  y: player.y ?? null,
});

const opponentSnapshotForMatch = (player) => ({
  sourceType: player.sourceType === 'registered_player' ? 'registered' : 'temporary',
  player: player.registeredPlayer || player._id,
  registeredPlayer: player.registeredPlayer || null,
  name: player.name,
  jerseyNumber: player.jersey ?? null,
  position: player.position,
  photoUrl: player.photoUrl || player.photo?.imageUrl || '',
  isCaptain: Boolean(player.captain),
  isViceCaptain: Boolean(player.viceCaptain),
  slotId: player.slotId || '',
  lineIndex: player.lineIndex ?? null,
  positionIndex: player.positionIndex ?? null,
  roleLabel: player.roleLabel || '',
  x: player.x ?? null,
  y: player.y ?? null,
});

const sidePlayerIds = (side = {}) => [
  ...(side.startingPlayers || []),
  ...(side.substitutes || []),
].map((player) => objectId(player.squadPlayer || player.id));

const sideSnapshots = async (side = {}, mapper) => {
  const ids = sidePlayerIds(side);
  const players = ids.length ? await TournamentSquadPlayer.find({ _id: { $in: ids } }).lean() : [];
  const byId = new Map(players.map((player) => [idString(player._id), player]));
  const missing = ids.find((id) => !byId.has(idString(id)));
  if (missing) throw new AppError('Tournament lineup contains a player who is no longer eligible.', 400, 'TOURNAMENT_LINEUP_PLAYER_NOT_FOUND');
  return {
    starters: (side.startingPlayers || []).map((player) => mapper({ ...byId.get(idString(player.squadPlayer)), ...player })),
    substitutes: (side.substitutes || []).map((player) => mapper({ ...byId.get(idString(player.squadPlayer)), ...player })),
  };
};

export const createMatchFromTournamentFixture = async ({ tournamentId, lineupId, user, input = {} }) => {
  const tournament = await findTournamentForTeam({ tournamentId, user });
  if (!isHost(tournament, user)) throw new AppError('Only the host team can create tournament matches.', 403, 'TOURNAMENT_HOST_REQUIRED');
  assertOperationalTournament(tournament);
  if (tournament.matchFormat === 'custom') throw new AppError('Custom tournament match creation will be configured after choosing a supported match format.', 400, 'TOURNAMENT_CUSTOM_MATCH_UNSUPPORTED');
  const lineup = await TournamentMatchdayLineup.findOne({ _id: lineupId, tournament: tournament._id });
  if (!lineup) throw new AppError('Tournament fixture not found.', 404, 'TOURNAMENT_FIXTURE_NOT_FOUND');
  if (lineup.matchCreated && lineup.match) throw new AppError('This tournament fixture already has a generated match.', 409, 'TOURNAMENT_MATCH_EXISTS');
  if (![TOURNAMENT_LINEUP_STATUS.SUBMITTED, TOURNAMENT_LINEUP_STATUS.LOCKED].includes(lineup.status)) {
    throw new AppError('Submit or lock both matchday lineups before creating a tournament match.', 409, 'TOURNAMENT_LINEUP_NOT_READY');
  }
  const [home, away] = await Promise.all([
    TournamentParticipant.findById(lineup.homeParticipant).lean(),
    TournamentParticipant.findById(lineup.awayParticipant).lean(),
  ]);
  if (!home || !away) throw new AppError('Tournament participants were not found.', 404, 'TOURNAMENT_PARTICIPANT_NOT_FOUND');
  const homeTeam = home.registeredTeam || tournament.hostTeam;
  const awayRegisteredTeam = away.participantType === TOURNAMENT_PARTICIPANT_TYPE.REGISTERED_TEAM ? away.registeredTeam : null;
  const required = startersForMatchFormat(tournament.matchFormat, tournament.playersOnField);
  if ((lineup.home?.startingPlayers || []).length !== required || (lineup.away?.startingPlayers || []).length !== required) {
    throw new AppError(`Both tournament lineups must contain exactly ${required} starters.`, 400, 'TOURNAMENT_LINEUP_STARTER_COUNT');
  }
  const homeSnapshots = await sideSnapshots(lineup.home, snapshotForMatch);
  const awaySnapshots = await sideSnapshots(lineup.away, opponentSnapshotForMatch);
  const match = await Match.create({
    team: homeTeam,
    registeredOpponentTeam: awayRegisteredTeam,
    opponent: {
      name: away.displayName,
      temporaryPlayers: awaySnapshots.starters.concat(awaySnapshots.substitutes)
        .filter((player) => player.sourceType === 'temporary')
        .map((player) => ({ name: player.name, position: player.position, jerseyNumber: player.jerseyNumber })),
    },
    tournament: tournament.name,
    venue: clean(input.venue || lineup.venue || tournament.primaryVenue || 'Tournament venue'),
    matchType: tournament.competitionFormat === TOURNAMENT_COMPETITION_FORMAT.KNOCKOUT ? 'knockout' : 'league',
    matchFormat: tournament.matchFormat,
    matchMode: input.matchMode || 'stream',
    teamSide: 'home',
    scheduledAt: safeDate(input.scheduledAt || lineup.scheduledAt || tournament.startDate) || new Date(Date.now() + 60 * 60 * 1000),
    formation: lineup.home?.formation || null,
    customFormation: lineup.home?.customFormation || '',
    registeredOpponentFormation: lineup.away?.formation || null,
    registeredOpponentCustomFormation: lineup.away?.customFormation || '',
    startingXI: homeSnapshots.starters,
    substitutes: homeSnapshots.substitutes,
    registeredOpponentStartingXI: awaySnapshots.starters,
    registeredOpponentSubstitutes: awaySnapshots.substitutes,
    tournamentCompetition: tournament._id,
    tournamentHomeParticipant: home._id,
    tournamentAwayParticipant: away._id,
    tournamentStage: clean(input.stage || lineup.stage || ''),
    tournamentRound: clean(input.round || lineup.round || ''),
    tournamentScope: tournament.scope,
    tournamentFixtureNumber: lineup.fixtureNumber || null,
    status: 'scheduled',
    isActive: true,
    createdBy: user._id,
  });
  lineup.matchCreated = true;
  lineup.match = match._id;
  lineup.updatedBy = user._id;
  await lineup.save();
  if (awayRegisteredTeam && tournament.scope === TOURNAMENT_SCOPE.INTER_COLLEGE) {
    await ensureCollaborationRequest({ match, userId: user._id });
  }
  return { match: matchPublic(match.toObject(), (await participantsFor(tournament._id)).byId) };
};

const standingsSeed = (participant, tournament) => ({
  participant: participantPublic(participant),
  played: 0,
  won: 0,
  drawn: 0,
  lost: 0,
  goalsFor: 0,
  goalsAgainst: 0,
  goalDifference: 0,
  points: 0,
  fairPlayPoints: 0,
  _settings: { win: tournament.winPoints ?? 3, draw: tournament.drawPoints ?? 1, loss: tournament.lossPoints ?? 0 },
});

const applyResultToStanding = (standing, gf, ga) => {
  standing.played += 1;
  standing.goalsFor += gf;
  standing.goalsAgainst += ga;
  if (gf > ga) {
    standing.won += 1;
    standing.points += standing._settings.win;
  } else if (gf === ga) {
    standing.drawn += 1;
    standing.points += standing._settings.draw;
  } else {
    standing.lost += 1;
    standing.points += standing._settings.loss;
  }
  standing.goalDifference = standing.goalsFor - standing.goalsAgainst;
};

export const calculateTournamentStandings = async ({ tournamentId, publicSlug = '', user = null }) => {
  const tournament = publicSlug ? await findTournamentPublic({ slug: publicSlug }) : await findTournamentForTeam({ tournamentId, user });
  const { participants } = await participantsFor(tournament._id);
  const rows = new Map(participants.map((participant) => [idString(participant._id), standingsSeed(participant, tournament)]));
  const matches = await completedTournamentMatches(tournament._id);
  matches.forEach((match) => {
    const home = rows.get(idString(match.tournamentHomeParticipant));
    const away = rows.get(idString(match.tournamentAwayParticipant));
    if (!home || !away) return;
    const result = match.result || deriveResult(match, []);
    const homeGoals = match.teamSide === 'home' ? result.finalTeamScore : result.finalOpponentScore;
    const awayGoals = match.teamSide === 'home' ? result.finalOpponentScore : result.finalTeamScore;
    applyResultToStanding(home, homeGoals, awayGoals);
    applyResultToStanding(away, awayGoals, homeGoals);
  });
  const standings = [...rows.values()]
    .map(({ _settings, ...row }) => row)
    .sort((a, b) => b.points - a.points || b.goalDifference - a.goalDifference || b.goalsFor - a.goalsFor || a.participant.displayName.localeCompare(b.participant.displayName));
  return { tournament: publicSlug ? serializeTournamentPublic(tournament) : serializeTournamentHost(tournament), standings };
};

const addPlayerStat = (map, key, snapshot, participant, field, amount = 1) => {
  if (!snapshot?.name) return;
  const id = idString(snapshot.player || snapshot.registeredPlayer || snapshot.squadPlayer || snapshot.name);
  if (!map.has(id)) {
    map.set(id, {
      playerId: id,
      name: snapshot.name,
      position: snapshot.position || '',
      jerseyNumber: snapshot.jerseyNumber ?? snapshot.jersey ?? null,
      photoUrl: snapshot.photoUrl || '',
      participant,
      goals: 0,
      assists: 0,
      appearances: 0,
      cleanSheets: 0,
      motm: 0,
      yellowCards: 0,
      redCards: 0,
      fairPlayDeductions: 0,
    });
  }
  map.get(id)[field] += amount;
};

export const calculateTournamentStatistics = async ({ tournamentId, publicSlug = '', user = null }) => {
  const tournament = publicSlug ? await findTournamentPublic({ slug: publicSlug }) : await findTournamentForTeam({ tournamentId, user });
  const { byId } = await participantsFor(tournament._id);
  const matches = await completedTournamentMatches(tournament._id);
  const events = matches.length ? await MatchEvent.find({ match: { $in: matches.map((match) => match._id) }, isUndone: false }).sort({ sequence: 1 }).lean() : [];
  const players = new Map();
  const eventMatch = new Map(matches.map((match) => [idString(match._id), match]));
  matches.forEach((match) => {
    const home = byId.get(idString(match.tournamentHomeParticipant));
    const away = byId.get(idString(match.tournamentAwayParticipant));
    (match.startingXI || []).forEach((snapshot) => addPlayerStat(players, idString(snapshot.player), snapshot, home, 'appearances'));
    (match.registeredOpponentStartingXI || []).forEach((snapshot) => addPlayerStat(players, idString(snapshot.player || snapshot.registeredPlayer), snapshot, away, 'appearances'));
    if (match.manOfTheMatch) addPlayerStat(players, idString(match.manOfTheMatch.player), match.manOfTheMatch, home, 'motm');
  });
  events.forEach((event) => {
    const match = eventMatch.get(idString(event.match));
    if (!match) return;
    const participant = event.scoringSide === 'opponent'
      ? byId.get(idString(match.tournamentAwayParticipant))
      : byId.get(idString(match.tournamentHomeParticipant));
    if (event.type === 'goal' && event.playerSnapshot) addPlayerStat(players, idString(event.player), event.playerSnapshot, participant, 'goals');
    if (event.assistPlayerSnapshot) addPlayerStat(players, idString(event.assistPlayer), event.assistPlayerSnapshot, participant, 'assists');
    if (event.type === 'yellow_card' && event.playerSnapshot) addPlayerStat(players, idString(event.player), event.playerSnapshot, participant, 'yellowCards');
    if (event.type === 'red_card' && event.playerSnapshot) addPlayerStat(players, idString(event.player), event.playerSnapshot, participant, 'redCards');
  });
  const playerStats = [...players.values()].sort((a, b) => b.goals - a.goals || b.assists - a.assists || a.name.localeCompare(b.name));
  return {
    tournament: publicSlug ? serializeTournamentPublic(tournament) : serializeTournamentHost(tournament),
    totals: { matches: matches.length, goals: playerStats.reduce((sum, player) => sum + player.goals, 0), players: playerStats.length },
    players: playerStats,
  };
};

export const calculateTournamentAwards = async (args) => {
  const data = await calculateTournamentStatistics(args);
  const standings = await calculateTournamentStandings(args);
  const topBy = (field) => [...data.players].sort((a, b) => b[field] - a[field] || a.name.localeCompare(b.name))[0] || null;
  return {
    tournament: data.tournament,
    awards: {
      champion: standings.standings[0]?.participant || null,
      runnerUp: standings.standings[1]?.participant || null,
      goldenBoot: topBy('goals'),
      topAssist: topBy('assists'),
      mostValuablePlayer: topBy('motm') || topBy('goals'),
      goldenGlove: topBy('cleanSheets'),
      fairPlay: [...standings.standings].sort((a, b) => a.fairPlayPoints - b.fairPlayPoints || a.participant.displayName.localeCompare(b.participant.displayName))[0]?.participant || null,
    },
  };
};

export const buildTournamentReportHtml = async ({ tournamentId, publicSlug = '', user = null, publicUrl = '' }) => {
  const [fixtures, standings, awards, stats] = await Promise.all([
    listTournamentFixtures({ tournamentId, publicSlug, user }),
    calculateTournamentStandings({ tournamentId, publicSlug, user }),
    calculateTournamentAwards({ tournamentId, publicSlug, user }),
    calculateTournamentStatistics({ tournamentId, publicSlug, user }),
  ]);
  const tournament = fixtures.tournament;
  const publicPath = publicUrl && tournament.slug ? `${publicUrl.replace(/\/$/, '')}/tournaments/${tournament.slug}` : '';
  const row = (cells) => `<tr>${cells.map((cell) => `<td>${String(cell ?? '').replace(/[<>&"']/g, '')}</td>`).join('')}</tr>`;
  const html = `<!doctype html><html><head><meta charset="utf-8"><title>${tournament.name} Tournament Report</title><style>body{font-family:Inter,Arial,sans-serif;background:#f8fafc;color:#0f172a;margin:0}.page{max-width:980px;margin:auto;padding:36px}.hero{background:#07110d;color:white;border-radius:28px;padding:32px}.brand{color:#bef264;font-weight:900;letter-spacing:.18em;text-transform:uppercase}.grid{display:grid;grid-template-columns:1fr 1fr;gap:18px}.card{background:white;border:1px solid #e2e8f0;border-radius:20px;padding:18px;margin-top:18px}table{width:100%;border-collapse:collapse}td,th{border-bottom:1px solid #e2e8f0;padding:8px;text-align:left}.muted{color:#64748b}@media print{.page{padding:0}.card,.hero{break-inside:avoid}}</style></head><body><main class="page"><section class="hero"><p class="brand">FootStream Tournament Report</p><h1>${tournament.name}</h1><p>${tournament.scope} · ${tournament.competitionFormat} · ${tournament.primaryVenue || ''}</p><p>${tournament.startDate ? new Date(tournament.startDate).toLocaleDateString() : ''} - ${tournament.endDate ? new Date(tournament.endDate).toLocaleDateString() : ''}</p></section><section class="grid"><article class="card"><h2>Awards</h2><p>Champion: ${awards.awards.champion?.displayName || 'Pending'}</p><p>Runner-up: ${awards.awards.runnerUp?.displayName || 'Pending'}</p><p>Golden Boot: ${awards.awards.goldenBoot?.name || 'Pending'}</p><p>Top Assist: ${awards.awards.topAssist?.name || 'Pending'}</p></article><article class="card"><h2>Statistics</h2><p>Matches: ${stats.totals.matches}</p><p>Goals: ${stats.totals.goals}</p><p>Players: ${stats.totals.players}</p></article></section><article class="card"><h2>Standings</h2><table><thead><tr><th>Team</th><th>P</th><th>W</th><th>D</th><th>L</th><th>GF</th><th>GA</th><th>GD</th><th>Pts</th></tr></thead><tbody>${standings.standings.map((item) => row([item.participant.displayName, item.played, item.won, item.drawn, item.lost, item.goalsFor, item.goalsAgainst, item.goalDifference, item.points])).join('')}</tbody></table></article><article class="card"><h2>Fixtures & Results</h2><table><tbody>${fixtures.fixtures.map((item) => row([item.fixtureNumber || '', item.homeParticipant?.displayName || 'Home', item.awayParticipant?.displayName || 'Away', item.status, item.result ? `${item.result.finalTeamScore}-${item.result.finalOpponentScore}` : ''])).join('')}</tbody></table></article><article class="card"><p class="muted">Generated: ${new Date().toLocaleString()}</p><p class="muted">Tournament ID: ${idString(tournament.id || tournament._id)}</p>${publicPath ? `<p>Public URL: ${publicPath}</p>` : ''}</article><script>window.print()</script></main></body></html>`;
  return { html };
};
