import test from "node:test";
import assert from "node:assert/strict";
import {
  getPublicPlayerProfile,
  getPublicSquad,
  getPublicTeamGallery,
  getPublicTeamMatches,
  getPublicTeamProfile,
  listPublicTeams,
  resolvePublicTeam,
  serializePublicPlayer,
  serializePublicTeam,
} from "../src/services/publicProfileService.js";

const team = {
  _id: "team1",
  name: "Foot Stream FC",
  slug: "foot-stream-fc",
  shortName: "FSFC",
  city: "Pune",
  logo: "",
  coverPhoto: "",
  coach: "Coach",
  homeGround: "Main Ground",
  founded: 2020,
  description: "Public club",
  socialLinks: { website: "https://example.com" },
  isPublished: true,
  isArchived: false,
  createdBy: "private",
};
const player = {
  _id: "player1",
  team: team._id,
  name: "A Player",
  photoUrl: "",
  position: "ST",
  jerseyNumber: 9,
  age: 20,
  academicYear: "2nd Year",
  preferredFoot: "Right",
  availabilityStatus: "injured",
  isCaptain: true,
  isViceCaptain: false,
  isActive: true,
  createdBy: "private",
};
const match = {
  _id: "match1",
  team,
  opponent: { name: "Rivals" },
  status: "completed",
  currentPeriod: "full_time",
  teamSide: "home",
  scheduledAt: new Date("2026-08-01"),
  completedAt: new Date("2026-08-01T12:00:00Z"),
  venue: "Ground",
  tournament: "",
  matchType: "league",
  homeScore: 2,
  awayScore: 1,
  isActive: true,
  stream: null,
};
const stats = {
  matchesPlayed: 2,
  starts: 2,
  substituteAppearances: 0,
  goals: 3,
  assists: 1,
  yellowCards: 1,
  redCards: 0,
  penaltiesScored: 0,
  penaltiesMissed: 0,
  penaltiesSaved: 0,
  ownGoals: 0,
  manOfTheMatchAwards: 1,
};

class Query {
  constructor(value) {
    this.value = value;
  }
  select() {
    return this;
  }
  populate() {
    return this;
  }
  sort() {
    return this;
  }
  skip() {
    return this;
  }
  limit(value) {
    if (Array.isArray(this.value)) this.value = this.value.slice(0, value);
    return this;
  }
  lean() {
    return Promise.resolve(this.value);
  }
  distinct() {
    return Promise.resolve((this.value || []).map((item) => item._id || item));
  }
}

test("team and player serializers expose profile fields without private state", () => {
  const publicTeam = serializePublicTeam(team);
  const publicPlayer = serializePublicPlayer(player);
  assert.equal(publicTeam.name, team.name);
  assert.equal(publicTeam.createdBy, undefined);
  assert.equal(publicTeam.isPublished, undefined);
  assert.equal(publicPlayer.availabilityStatus, undefined);
  assert.equal(publicPlayer.createdBy, undefined);
  assert.equal(publicPlayer.isActive, undefined);
});

test("team slug resolution requires published and non-archived team", async () => {
  let filter;
  const teamModel = {
    findOne: (value) => {
      filter = value;
      return new Query(team);
    },
  };
  const value = await resolvePublicTeam({ teamModel, teamSlug: team.slug });
  assert.equal(value.slug, team.slug);
  assert.deepEqual(filter, {
    slug: team.slug,
    isPublished: true,
    isArchived: false,
  });
  await assert.rejects(
    resolvePublicTeam({
      teamModel: { findOne: () => new Query(null) },
      teamSlug: "private",
    }),
    (error) => error.code === "TEAM_NOT_FOUND",
  );
});

test("team directory is public-only, escaped, paginated, and includes derived summary", async () => {
  let filter;
  const teamModel = {
    find: (value) => {
      filter = value;
      return new Query([team]);
    },
    countDocuments: async () => 1,
  };
  const data = await listPublicTeams({
    teamModel,
    playerModel: { find: () => new Query([player._id]) },
    query: { search: "FC.*", city: "Pu(ne)", limit: 100 },
    loadTeamDataImpl: async () => ({
      team: { matchesPlayed: 2, wins: 1 },
      players: [
        {
          playerId: "player1",
          name: "A Player",
          goals: 3,
          photoUrl: "",
          position: "ST",
          jerseyNumber: 9,
        },
      ],
    }),
  });
  assert.equal(filter.isPublished, true);
  assert.equal(filter.isArchived, false);
  assert.equal(filter.name.$regex, "FC\\.\\*");
  assert.equal(filter.$or[0].city.$regex, "Pu\\(ne\\)");
  assert.equal(data.teams[0].topScorer.value, 3);
  assert.equal(data.pagination.limit, 30);
});

test("public squad returns active players and hides availability", async () => {
  let playerFilter;
  const data = await getPublicSquad({
    teamModel: { findOne: () => new Query(team) },
    playerModel: {
      find: (value) => {
        playerFilter = value;
        return new Query([player]);
      },
    },
    teamSlug: team.slug,
  });
  assert.deepEqual(playerFilter, { team: team._id, isActive: true });
  assert.equal(data.players.length, 1);
  assert.equal(data.players[0].availabilityStatus, undefined);
});

test("team profile combines public identity, active leaders, matches, and gallery preview", async () => {
  const matchModel = {
    findOne: (filter) =>
      new Query({
        ...match,
        status: filter.status,
        ...(filter.status === "scheduled"
          ? { completedAt: null, scheduledAt: new Date("2026-08-10") }
          : {}),
      }),
    find: () => new Query(["match1"]),
  };
  const photoModel = {
    find: () =>
      new Query([
        {
          imageUrl: "https://img/photo.jpg",
          caption: "Win",
          category: "result",
        },
      ]),
    countDocuments: async () => 1,
  };
  const data = await getPublicTeamProfile({
    teamModel: { findOne: () => new Query(team) },
    playerModel: { find: () => new Query([player._id]) },
    matchModel,
    photoModel,
    teamSlug: team.slug,
    now: new Date("2026-07-01"),
    loadTeamDataImpl: async () => ({
      team: {
        matchesPlayed: 2,
        wins: 1,
        draws: 0,
        losses: 1,
        goalsFor: 3,
        goalsAgainst: 2,
        goalDifference: 1,
        winPercentage: 50,
      },
      players: [
        {
          playerId: player._id,
          name: player.name,
          goals: 3,
          assists: 1,
          matchesPlayed: 2,
          photoUrl: "",
          position: "ST",
          jerseyNumber: 9,
        },
        {
          playerId: "inactive",
          name: "Hidden Player",
          goals: 20,
          assists: 20,
          matchesPlayed: 20,
        },
      ],
    }),
  });
  assert.equal(data.team.createdBy, undefined);
  assert.equal(data.overview.topScorer.playerId, player._id);
  assert.equal(data.overview.nextFixture.status, "scheduled");
  assert.equal(data.overview.latestResult.status, "completed");
  assert.equal(
    data.overview.galleryPreview[0].imageUrl,
    "https://img/photo.jpg",
  );
});

test("team gallery uses active completed matches and strips Cloudinary metadata", async () => {
  let matchFilter;
  let photoFilter;
  const matchModel = {
    find: (value) => {
      matchFilter = value;
      return new Query(["match1"]);
    },
  };
  const photoModel = {
    find: (value) => {
      photoFilter = value;
      return new Query([
        {
          imageUrl: "https://img/photo.jpg",
          caption: "Win",
          category: "result",
          createdAt: new Date(),
          publicId: "private",
          uploadedBy: "private",
        },
      ]);
    },
    countDocuments: async () => 1,
  };
  const data = await getPublicTeamGallery({
    teamModel: { findOne: () => new Query(team) },
    matchModel,
    photoModel,
    teamSlug: team.slug,
    query: { category: "result" },
  });
  assert.equal(matchFilter.status, "completed");
  assert.equal(matchFilter.isActive, true);
  assert.equal(photoFilter.category, "result");
  assert.equal(data.photos[0].publicId, undefined);
  assert.equal(data.photos[0].uploadedBy, undefined);
});

test("team fixtures and results remain scoped to the resolved public team", async () => {
  const teamModel = {
    findOne: () => new Query(team),
    find: () => new Query([team]),
  };
  let filter;
  const matchModel = {
    find: (value) => {
      filter = value;
      return new Query([match]);
    },
    countDocuments: async () => 1,
  };
  const fixtures = await getPublicTeamMatches({
    teamModel,
    matchModel,
    teamSlug: team.slug,
    kind: "fixtures",
  });
  assert.equal(filter.status, "scheduled");
  assert.deepEqual(filter.team.$in, [team._id]);
  assert.equal(fixtures.team.slug, team.slug);
  await getPublicTeamMatches({
    teamModel,
    matchModel,
    teamSlug: team.slug,
    kind: "results",
  });
  assert.equal(filter.status, "completed");
});

test("public player profile hides inactive/private players and returns statistics and recent matches", async () => {
  let playerFilter;
  let matchFilter;
  const publicPlayer = { ...player, team };
  const playerModel = {
    findOne: (value) => {
      playerFilter = value;
      return new Query(publicPlayer);
    },
  };
  const matchModel = {
    find: (value) => {
      matchFilter = value;
      return new Query([match]);
    },
  };
  const data = await getPublicPlayerProfile({
    playerModel,
    matchModel,
    playerId: player._id,
    getPlayerStatisticsImpl: async () => ({ statistics: stats }),
  });
  assert.equal(playerFilter.isActive, true);
  assert.equal(matchFilter.status, "completed");
  assert.equal(data.player.availabilityStatus, undefined);
  assert.equal(data.statistics.goals, 3);
  assert.equal(data.awards.manOfTheMatch, 1);
  assert.equal(data.recentMatches.length, 1);
  await assert.rejects(
    getPublicPlayerProfile({
      playerModel: { findOne: () => new Query(null) },
      matchModel,
      playerId: player._id,
    }),
    (error) => error.code === "PLAYER_NOT_FOUND",
  );
});
