import test from "node:test";
import assert from "node:assert/strict";
import {
  buildPublicListFilter,
  escapeRegex,
  getPublicHome,
  getPublicMatch,
  isPublicReadOnlyRouteSet,
  listPublicMatches,
  scoreForMatch,
  serializePublicMatchCard,
  serializePublicMatchDetail,
} from "../src/services/publicPortalService.js";
import Match from "../src/models/Match.js";
import publicRoutes from "../src/routes/publicRoutes.js";

const team = {
  _id: "t1",
  name: "Foot FC",
  slug: "foot-fc",
  logo: "https://img/logo.png",
  createdBy: "private",
};
const baseMatch = (overrides = {}) => ({
  _id: "m1",
  team,
  opponent: { name: "Rivals", temporaryPlayers: [] },
  status: "scheduled",
  currentPeriod: "not_started",
  teamSide: "home",
  scheduledAt: new Date("2026-08-10T10:00:00Z"),
  completedAt: null,
  venue: "Main Ground",
  tournament: "Campus Cup",
  matchType: "league",
  homeScore: 0,
  awayScore: 0,
  isActive: true,
  startingXI: [],
  substitutes: [],
  stream: null,
  createdBy: "private",
  updatedBy: "private",
  ...overrides,
});

test("public match card contains safe display data only", () => {
  const value = serializePublicMatchCard(
    baseMatch({
      stream: {
        isEnabled: true,
        videoId: "dQw4w9WgXcQ",
        embedUrl: "https://www.youtube.com/embed/dQw4w9WgXcQ",
        sourceUrl: "private",
        addedBy: "private",
      },
    }),
  );
  assert.equal(value.team.name, "Foot FC");
  assert.equal(value.createdBy, undefined);
  assert.equal(value.stream.sourceUrl, undefined);
  assert.equal(value.stream.addedBy, undefined);
});

test("score and outcome use team home/away orientation", () => {
  assert.deepEqual(
    scoreForMatch(baseMatch({ teamSide: "away", homeScore: 2, awayScore: 3 })),
    {
      teamScore: 3,
      opponentScore: 2,
      homeScore: 2,
      awayScore: 3,
      outcome: "win",
    },
  );
});

test("general match serialization adapts scheduled and completed states", () => {
  const scheduled = serializePublicMatchDetail(baseMatch());
  assert.equal(scheduled.result, null);
  assert.equal(scheduled.status, "scheduled");
  const completed = serializePublicMatchDetail(
    baseMatch({
      status: "completed",
      homeScore: 2,
      awayScore: 1,
      completionNotes: "Full time",
      attendance: 100,
    }),
  );
  assert.equal(completed.result.outcome, "win");
  assert.equal(completed.completionNotes, "Full time");
  assert.equal(completed.attendance, 100);
});

test("live and half-time serializers expose timer summary without account data", () => {
  for (const status of ["live", "half_time"]) {
    const value = serializePublicMatchDetail(
      baseMatch({ status, timerBaseSeconds: 600 }),
    );
    assert.equal(value.status, status);
    assert.equal(value.elapsedSeconds, 600);
    assert.equal(value.updatedBy, undefined);
  }
});

test("fixtures filter enforces scheduled active public teams and filters", () => {
  const filter = buildPublicListFilter({
    kind: "fixtures",
    teamIds: ["t1"],
    searchTeamIds: [],
    query: {
      from: "2026-08-01",
      to: "2026-08-31",
      matchType: "league",
      tournament: "Cup",
      teamId: "t1",
    },
  });
  assert.equal(filter.status, "scheduled");
  assert.equal(filter.isActive, true);
  assert.deepEqual(filter.team, { $in: ["t1"] });
  assert.equal(filter.matchType, "league");
  assert.ok(filter.scheduledAt.$gte);
  assert.ok(filter.scheduledAt.$lte);
  assert.equal(filter.tournament.$regex, "Cup");
});

test("results filter is completed-only and supports outcome expression", () => {
  const filter = buildPublicListFilter({
    kind: "results",
    teamIds: ["t1"],
    query: { outcome: "loss" },
  });
  assert.equal(filter.status, "completed");
  assert.ok(filter.$expr.$lt);
});

test("live directory filter excludes every non-live status by construction", () => {
  const filter = buildPublicListFilter({
    kind: "live",
    teamIds: ["t1"],
    query: {},
  });
  assert.deepEqual(filter.status.$in, ["live", "half_time"]);
  assert.equal(filter.isActive, true);
});

test("search text is regex escaped and cannot alter the query", () => {
  assert.equal(escapeRegex("FC.*($ne)"), "FC\\.\\*\\(\\$ne\\)");
  const filter = buildPublicListFilter({
    kind: "fixtures",
    teamIds: ["t1"],
    searchTeamIds: ["t1"],
    query: { search: "FC.*" },
  });
  assert.equal(filter.$or[0]["opponent.name"].$regex, "FC\\.\\*");
  assert.equal(filter.$or.length, 4);
});

test("team filter cannot select a team outside the published team set", () => {
  const filter = buildPublicListFilter({
    kind: "fixtures",
    teamIds: ["published-team"],
    searchTeamIds: [],
    query: { teamId: "unpublished-team" },
  });
  assert.deepEqual(filter.team, { $in: [] });
});

class FakeQuery {
  constructor(items) {
    this.items = [...items];
    this.limitValue = Infinity;
    this.skipValue = 0;
  }
  sort(spec) {
    const keys = Object.entries(spec);
    this.items.sort((a, b) => {
      for (const [key, direction] of keys) {
        const left = new Date(a[key] || 0).getTime();
        const right = new Date(b[key] || 0).getTime();
        if (left !== right) return (left - right) * direction;
      }
      return 0;
    });
    return this;
  }
  skip(value) {
    this.skipValue = value;
    return this;
  }
  limit(value) {
    this.limitValue = value;
    return this;
  }
  select() {
    return this;
  }
  populate() {
    return this;
  }
  lean() {
    return Promise.resolve(
      this.items.slice(this.skipValue, this.skipValue + this.limitValue),
    );
  }
}
const teamModel = { find: () => ({ distinct: async () => ["t1"] }) };

test("portal discovery selects published, non-archived teams only", async () => {
  let teamFilter;
  const publishingTeamModel = {
    find: (filter) => {
      teamFilter = filter;
      return { distinct: async () => [] };
    },
  };
  const matchModel = { find: () => new FakeQuery([]) };
  await getPublicHome({ matchModel, teamModel: publishingTeamModel });
  assert.deepEqual(teamFilter, { isArchived: false, isPublished: true });
});

test("home returns bounded live, upcoming, and newest result groups", async () => {
  const live = Array.from({ length: 8 }, (_, index) =>
    baseMatch({ _id: `l${index}`, status: index % 2 ? "half_time" : "live" }),
  );
  const upcoming = Array.from({ length: 8 }, (_, index) =>
    baseMatch({
      _id: `u${index}`,
      scheduledAt: new Date(`2026-08-${10 + index}T10:00:00Z`),
    }),
  );
  const results = Array.from({ length: 8 }, (_, index) =>
    baseMatch({
      _id: `r${index}`,
      status: "completed",
      completedAt: new Date(`2026-08-${10 + index}T12:00:00Z`),
    }),
  );
  const matchModel = {
    find: (filter) =>
      new FakeQuery(
        typeof filter.status === "object"
          ? live
          : filter.status === "scheduled"
            ? upcoming
            : results,
      ),
  };
  const data = await getPublicHome({
    matchModel,
    teamModel,
    now: new Date("2026-08-01"),
  });
  assert.equal(data.live.length, 6);
  assert.equal(data.upcoming.length, 6);
  assert.equal(data.latestResults.length, 6);
  assert.ok(
    new Date(data.latestResults[0].completedAt) >
      new Date(data.latestResults[5].completedAt),
  );
});

test("fixtures pagination is bounded and returns metadata", async () => {
  let capturedFilter;
  const items = Array.from({ length: 4 }, (_, index) =>
    baseMatch({ _id: `m${index}` }),
  );
  const matchModel = {
    find: (filter) => {
      capturedFilter = filter;
      return new FakeQuery(items);
    },
    countDocuments: async () => 24,
  };
  const data = await listPublicMatches({
    matchModel,
    teamModel,
    kind: "fixtures",
    query: { page: 2, limit: 2 },
  });
  assert.equal(capturedFilter.status, "scheduled");
  assert.equal(data.matches.length, 2);
  assert.deepEqual(data.pagination, {
    page: 2,
    limit: 2,
    total: 24,
    pages: 12,
  });
});

test("public live directory serializes Mongoose Date timers without throwing", async () => {
  const liveMatch = new Match({
    ...baseMatch({
      _id: "64b7f5f4d4a31f7a1d1f1001",
      team: "64b7f5f4d4a31f7a1d1f0001",
      status: "live",
      currentPeriod: "first_half",
      timerAnchorAt: new Date("2026-08-10T10:00:00Z"),
      timerBaseSeconds: 120,
    }),
  }).toObject();
  liveMatch.team = team;
  const matchModel = {
    find: () => new FakeQuery([liveMatch]),
    countDocuments: async () => 1,
  };
  const data = await listPublicMatches({
    matchModel,
    teamModel,
    kind: "live",
    now: new Date("2026-08-10T10:02:30Z"),
  });
  assert.equal(data.matches.length, 1);
  assert.equal(data.matches[0].status, "live");
  assert.equal(data.matches[0].elapsedSeconds, 270);
});

test("directory service defensively caps page size at fifty", async () => {
  const matchModel = {
    find: () => new FakeQuery([]),
    countDocuments: async () => 0,
  };
  const data = await listPublicMatches({
    matchModel,
    teamModel,
    kind: "results",
    query: { limit: 500 },
  });
  assert.equal(data.pagination.limit, 50);
});

test("general match hides inactive records and returns status-aware payload", async () => {
  const queryFor = (value) => ({
    select() {
      return this;
    },
    populate() {
      return this;
    },
    lean: async () => value,
  });
  const active = await getPublicMatch({
    matchModel: { findOne: () => queryFor(baseMatch({ status: "cancelled" })) },
    teamModel,
    matchId: "m1",
  });
  assert.equal(active.status, "cancelled");
  await assert.rejects(
    getPublicMatch({
      matchModel: { findOne: () => queryFor(null) },
      teamModel,
      matchId: "m2",
    }),
    (error) => error.code === "MATCH_NOT_FOUND",
  );
});

test("public portal routes remain read-only except approved guest engagement submissions", () =>
  assert.equal(isPublicReadOnlyRouteSet(publicRoutes, [
    "POST /teams/:teamSlug/join-requests",
    "POST /matches/:matchId/chat",
    "POST /matches/:matchId/reactions/:reactionType/toggle",
    "POST /matches/:matchId/polls/:pollId/vote",
  ]), true));
