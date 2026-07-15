import assert from 'node:assert/strict';
import test from 'node:test';
import mongoose from 'mongoose';
import Match from '../src/models/Match.js';
import Tournament from '../src/models/Tournament.js';
import TournamentOfficial, { TOURNAMENT_OFFICIAL_ROLES } from '../src/models/TournamentOfficial.js';
import TournamentParticipant from '../src/models/TournamentParticipant.js';
import TournamentReviewHistory from '../src/models/TournamentReviewHistory.js';
import TournamentSquad from '../src/models/TournamentSquad.js';
import TournamentSquadPlayer from '../src/models/TournamentSquadPlayer.js';
import {
  TOURNAMENT_APPROVAL_STATUS,
  TOURNAMENT_COMPETITION_FORMAT,
  TOURNAMENT_LIFECYCLE_STATUS,
  TOURNAMENT_MATCH_FORMAT_LABEL,
  TOURNAMENT_PARTICIPANT_TYPE,
  TOURNAMENT_PLAYER_SOURCE_TYPE,
  TOURNAMENT_SCOPE,
  TOURNAMENT_SQUAD_STATUS,
  TOURNAMENT_VISIBILITY,
} from '../src/constants/tournamentConstants.js';
import {
  serializeTournamentAdmin,
  serializeTournamentHost,
  serializeTournamentParticipantPublic,
  serializeTournamentPublic,
  serializeTournamentSquadPlayerPublic,
} from '../src/serializers/tournamentSerializers.js';

const id = (suffix) => new mongoose.Types.ObjectId(`6500000000000000000000${suffix}`);
const teamId = id('01');
const userId = id('02');
const tournamentId = id('03');
const participantId = id('04');
const squadId = id('05');
const playerId = id('06');

const validTournament = (overrides = {}) => new Tournament({
  name: 'RANN 2027 Football',
  shortName: 'RANN',
  slug: 'rann-2027-football',
  seriesName: 'RANN',
  seriesSlug: 'rann',
  seasonLabel: '2027',
  editionNumber: 3,
  description: 'Inter college football tournament.',
  scope: TOURNAMENT_SCOPE.INTER_COLLEGE,
  competitionFormat: TOURNAMENT_COMPETITION_FORMAT.LEAGUE,
  matchFormat: TOURNAMENT_MATCH_FORMAT_LABEL.ELEVEN_V_ELEVEN,
  hostTeam: teamId,
  createdBy: userId,
  country: 'India',
  state: 'UP',
  city: 'Ghaziabad',
  primaryVenue: 'Main Ground',
  registrationOpen: new Date('2027-01-01T00:00:00Z'),
  registrationClose: new Date('2027-01-10T00:00:00Z'),
  squadLock: new Date('2027-01-12T00:00:00Z'),
  fixturePublish: new Date('2027-01-13T00:00:00Z'),
  startDate: new Date('2027-01-15T00:00:00Z'),
  endDate: new Date('2027-01-30T00:00:00Z'),
  ...overrides,
});

const validParticipant = (overrides = {}) => new TournamentParticipant({
  tournament: tournamentId,
  tournamentScope: TOURNAMENT_SCOPE.INTER_COLLEGE,
  participantType: TOURNAMENT_PARTICIPANT_TYPE.REGISTERED_TEAM,
  registeredTeam: teamId,
  displayName: 'FC KIET',
  shortName: 'KIET',
  slug: 'fc-kiet',
  addedBy: userId,
  ...overrides,
});

const validSquad = (overrides = {}) => new TournamentSquad({
  tournament: tournamentId,
  participant: participantId,
  status: TOURNAMENT_SQUAD_STATUS.DRAFT,
  ...overrides,
});

const validSquadPlayer = (overrides = {}) => new TournamentSquadPlayer({
  tournament: tournamentId,
  participant: participantId,
  squad: squadId,
  sourceType: TOURNAMENT_PLAYER_SOURCE_TYPE.REGISTERED_PLAYER,
  registeredPlayer: playerId,
  name: 'Aman Verma',
  position: 'ST',
  jersey: 9,
  ...overrides,
});

const validMatch = (overrides = {}) => new Match({
  team: teamId,
  opponent: { name: 'IMS FC' },
  venue: 'Main Ground',
  matchType: 'friendly',
  matchFormat: '5v5',
  teamSide: 'home',
  scheduledAt: new Date('2027-02-01T10:00:00Z'),
  startingXI: [1, 2, 3, 4, 5].map((number) => ({
    player: id(String(number).padStart(2, '0')),
    name: `Player ${number}`,
    position: number === 1 ? 'GK' : 'ST',
    jerseyNumber: number,
  })),
  createdBy: userId,
  ...overrides,
});

const hasIndex = (model, fields) =>
  model.schema.indexes().some(([definition]) => Object.entries(fields).every(([key, value]) => definition[key] === value));

test('Tournament model validates identity, host, defaults, dates, and indexes', () => {
  const tournament = validTournament();
  assert.equal(tournament.validateSync(), undefined);
  assert.equal(tournament.playersOnField, 11);
  assert.equal(tournament.approvalStatus, TOURNAMENT_APPROVAL_STATUS.DRAFT);
  assert.equal(tournament.lifecycleStatus, TOURNAMENT_LIFECYCLE_STATUS.DRAFT);
  assert.equal(tournament.visibility, TOURNAMENT_VISIBILITY.PRIVATE);
  assert.equal(hasIndex(Tournament, { slug: 1 }), true);
  assert.equal(hasIndex(Tournament, { approvalStatus: 1 }), true);
  assert.equal(hasIndex(Tournament, { hostTeam: 1 }), true);
  assert.equal(hasIndex(Tournament, { startDate: 1 }), true);
  assert.equal(hasIndex(Tournament, { endDate: 1 }), true);
  assert.equal(hasIndex(Tournament, { scope: 1 }), true);
  assert.equal(hasIndex(Tournament, { seriesSlug: 1, editionNumber: 1 }), true);
  assert.equal(hasIndex(Tournament, { isPublished: 1, visibility: 1, approvalStatus: 1 }), true);
  assert.equal(hasIndex(Tournament, { isArchived: 1 }), true);
});

const validationErrorsFor = async (document) => {
  try {
    await document.validate();
    return {};
  } catch (error) {
    return error.errors;
  }
};

test('Tournament model rejects invalid dates, sizes, points, duplicate arrays, slug, and series/edition combinations', async () => {
  assert.ok((await validationErrorsFor(validTournament({ registrationClose: new Date('2026-12-31T00:00:00Z') }))).registrationClose);
  assert.ok((await validationErrorsFor(validTournament({ minimumSquad: 26, maximumSquad: 25 }))).minimumSquad);
  assert.ok((await validationErrorsFor(validTournament({ maximumMatchdaySquad: 30, maximumSquad: 25 }))).maximumMatchdaySquad);
  assert.ok((await validationErrorsFor(validTournament({ maximumSubstitutes: 18, maximumMatchdaySquad: 18 }))).maximumSubstitutes);
  assert.ok((await validationErrorsFor(validTournament({ minimumTeams: 16, maximumTeams: 8 }))).minimumTeams);
  assert.ok((await validationErrorsFor(validTournament({ plannedTeams: 20, maximumTeams: 16 }))).plannedTeams);
  assert.ok((await validationErrorsFor(validTournament({ halfMinutes: 50, matchMinutes: 90 }))).halfMinutes);
  assert.ok((await validationErrorsFor(validTournament({ slug: 'Bad Slug' }))).slug);
  assert.ok((await validationErrorsFor(validTournament({ editionNumber: 2, seriesSlug: '' }))).seriesSlug);
  assert.ok((await validationErrorsFor(validTournament({ winPoints: -1 }))).winPoints);
  assert.ok((await validationErrorsFor(validTournament({ awardsEnabled: ['champion', 'champion'] }))).awardsEnabled);
  assert.ok((await validationErrorsFor(validTournament({ tiebreakOrder: ['points', 'points'] }))).tiebreakOrder);
  assert.ok((await validationErrorsFor(validTournament({ matchFormat: TOURNAMENT_MATCH_FORMAT_LABEL.CUSTOM, playersOnField: 12 }))).playersOnField);
});

test('TournamentParticipant model enforces participant type rules and duplicate-protection indexes', async () => {
  const participant = validParticipant({ displayName: '  FC KIET  ', slug: '' });
  await participant.validate();
  assert.equal(participant.normalizedName, 'fc kiet');
  assert.equal(participant.slug, 'fc-kiet');
  assert.equal(hasIndex(TournamentParticipant, { tournament: 1, registeredTeam: 1 }), true);
  assert.equal(hasIndex(TournamentParticipant, { tournament: 1, normalizedName: 1 }), true);
  assert.equal(hasIndex(TournamentParticipant, { tournament: 1, slug: 1 }), true);
  assert.ok((await validationErrorsFor(validParticipant({ registeredTeam: null }))).registeredTeam);
  assert.ok((await validationErrorsFor(validParticipant({
    participantType: TOURNAMENT_PARTICIPANT_TYPE.EXTERNAL_TEAM,
    registeredTeam: teamId,
  }))).registeredTeam);
  assert.ok((await validationErrorsFor(validParticipant({
    tournamentScope: TOURNAMENT_SCOPE.INTRA_COLLEGE,
    participantType: TOURNAMENT_PARTICIPANT_TYPE.REGISTERED_TEAM,
  }))).participantType);
  assert.equal(await validParticipant({
    tournamentScope: TOURNAMENT_SCOPE.INTRA_COLLEGE,
    participantType: TOURNAMENT_PARTICIPANT_TYPE.INTRA_TEAM,
    registeredTeam: null,
    displayName: 'CSE',
  }).validate(), undefined);
});

test('TournamentReviewHistory model validates review audit foundation', () => {
  const history = new TournamentReviewHistory({
    tournament: tournamentId,
    action: 'approved',
    actor: userId,
    actorRole: 'superAdmin',
    previousStatus: TOURNAMENT_APPROVAL_STATUS.APPROVAL_PENDING,
    nextStatus: TOURNAMENT_APPROVAL_STATUS.APPROVED,
    message: 'Looks good.',
    metadata: { internal: true },
  });
  assert.equal(history.validateSync(), undefined);
  assert.equal(hasIndex(TournamentReviewHistory, { tournament: 1, createdAt: -1 }), true);
  assert.ok(new TournamentReviewHistory({ ...history.toObject(), action: 'invalid' }).validateSync().errors.action);
});

test('TournamentSquad model validates participant relationship and leadership fields', async () => {
  const squad = validSquad();
  assert.equal(squad.validateSync(), undefined);
  assert.equal(hasIndex(TournamentSquad, { tournament: 1, participant: 1 }), true);
  assert.equal(hasIndex(TournamentSquad, { tournament: 1, status: 1 }), true);
  assert.ok((await validationErrorsFor(validSquad({ captain: playerId, viceCaptain: playerId }))).viceCaptain);
  assert.ok((await validationErrorsFor(validSquad({ lockedAt: new Date(), approvedAt: null }))).lockedAt);
});

test('TournamentSquadPlayer model validates source type, leadership, duplicate-protection indexes, and required fields', async () => {
  const player = validSquadPlayer({ name: '  Aman Verma  ' });
  await player.validate();
  assert.equal(player.normalizedName, 'aman verma');
  assert.equal(hasIndex(TournamentSquadPlayer, { squad: 1, registeredPlayer: 1 }), true);
  assert.equal(hasIndex(TournamentSquadPlayer, { squad: 1, normalizedName: 1 }), true);
  assert.equal(hasIndex(TournamentSquadPlayer, { squad: 1, jersey: 1 }), true);
  assert.equal(hasIndex(TournamentSquadPlayer, { squad: 1, captain: 1 }), true);
  assert.ok((await validationErrorsFor(validSquadPlayer({ registeredPlayer: null }))).registeredPlayer);
  assert.ok((await validationErrorsFor(validSquadPlayer({
    sourceType: TOURNAMENT_PLAYER_SOURCE_TYPE.MANUAL_PLAYER,
    registeredPlayer: playerId,
  }))).registeredPlayer);
  assert.ok((await validationErrorsFor(validSquadPlayer({ captain: true, viceCaptain: true }))).viceCaptain);
  assert.ok(validSquadPlayer({ position: 'INVALID' }).validateSync().errors.position);
});

test('TournamentOfficial model is a lightweight official foundation only', () => {
  const official = new TournamentOfficial({
    tournament: tournamentId,
    name: 'Referee One',
    role: 'referee',
    association: 'District FA',
  });
  assert.equal(official.validateSync(), undefined);
  assert.ok(TOURNAMENT_OFFICIAL_ROLES.includes('referee'));
  assert.equal(hasIndex(TournamentOfficial, { tournament: 1, role: 1, name: 1 }), true);
  assert.ok(new TournamentOfficial({ tournament: tournamentId, name: 'A', role: 'invalid' }).validateSync().errors.role);
});

test('Match model keeps old matches valid and accepts nullable tournament foundation fields', () => {
  const oldMatch = validMatch();
  assert.equal(oldMatch.validateSync(), undefined);
  assert.equal(oldMatch.tournamentCompetition, null);
  const tournamentMatch = validMatch({
    tournamentCompetition: tournamentId,
    tournamentHomeParticipant: participantId,
    tournamentAwayParticipant: id('07'),
    tournamentStage: 'group',
    tournamentRound: 'round-1',
    tournamentScope: TOURNAMENT_SCOPE.INTER_COLLEGE,
    tournamentFixtureNumber: 3,
  });
  assert.equal(tournamentMatch.validateSync(), undefined);
  assert.equal(hasIndex(Match, { tournamentCompetition: 1, scheduledAt: 1 }), true);
  assert.equal(hasIndex(Match, { tournamentHomeParticipant: 1, tournamentAwayParticipant: 1 }), true);
  assert.equal(hasIndex(Match, { tournamentScope: 1, tournamentStage: 1, scheduledAt: 1 }), true);
  assert.ok(validMatch({ tournamentFixtureNumber: 0 }).validateSync().errors.tournamentFixtureNumber);
});

test('Tournament serializers hide audit IDs, Cloudinary IDs, and internal metadata', () => {
  const tournament = validTournament({
    _id: tournamentId,
    approvalStatus: TOURNAMENT_APPROVAL_STATUS.APPROVED,
    visibility: TOURNAMENT_VISIBILITY.PUBLIC,
    isPublished: true,
    logo: { imageUrl: 'https://img.example/logo.png', publicId: 'secret-logo' },
    coverImage: { imageUrl: 'https://img.example/cover.png', publicId: 'secret-cover' },
    reviewedBy: userId,
    updatedBy: userId,
  }).toObject();
  const publicPayload = serializeTournamentPublic(tournament);
  const hostPayload = serializeTournamentHost(tournament);
  const adminPayload = serializeTournamentAdmin(tournament);
  assert.equal(publicPayload.logo.publicId, undefined);
  assert.equal(publicPayload.coverImage.publicId, undefined);
  assert.equal(publicPayload.createdBy, undefined);
  assert.equal(publicPayload.reviewedBy, undefined);
  assert.equal(publicPayload.approvalStatus, undefined);
  assert.equal(hostPayload.approvalStatus, TOURNAMENT_APPROVAL_STATUS.APPROVED);
  assert.equal(adminPayload.hostTeam, String(teamId));

  const participantPayload = serializeTournamentParticipantPublic(validParticipant({
    _id: participantId,
    logo: { imageUrl: 'https://img.example/team.png', publicId: 'participant-secret' },
  }).toObject());
  assert.equal(participantPayload.logo.publicId, undefined);
  assert.equal(participantPayload.addedBy, undefined);

  const playerPayload = serializeTournamentSquadPlayerPublic(validSquadPlayer({
    _id: playerId,
    photo: { imageUrl: 'https://img.example/player.png', publicId: 'player-secret' },
  }).toObject());
  assert.equal(playerPayload.photo.publicId, undefined);
  assert.equal(playerPayload.registeredPlayer, undefined);
});
