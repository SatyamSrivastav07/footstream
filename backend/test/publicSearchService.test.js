import test from "node:test";
import assert from "node:assert/strict";
import { validationResult } from "express-validator";
import {
  globalPublicSearch,
  searchMatches,
  searchPatterns,
  searchPlayers,
  searchTeams,
} from "../src/services/publicSearchService.js";
import { publicSearchValidator } from "../src/validators/publicSearchValidators.js";

class Query {
  constructor(items) {
    this.items = [...items];
    this.skipValue = 0;
    this.limitValue = Infinity;
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
  skip(value) {
    this.skipValue = value;
    return this;
  }
  limit(value) {
    this.limitValue = value;
    return this;
  }
  lean() {
    return Promise.resolve(
      this.items.slice(this.skipValue, this.skipValue + this.limitValue),
    );
  }
  distinct() {
    return Promise.resolve(this.items.map((item) => item._id || item));
  }
}

const bucketIndex = (filter) => {
  if (!filter.$and) return 0;
  if (filter.$and.length === 3) return 1;
  return filter.$and[1]?.name?.$not ? 2 : 0;
};

const rankedModel = (buckets, capture = () => {}) => ({
  countDocuments: async (filter) => {
    capture(filter);
    return buckets[bucketIndex(filter)].length;
  },
  find: (filter) => {
    capture(filter);
    return new Query(buckets[bucketIndex(filter)]);
  },
});

const publicTeam = {
  _id: "team1",
  name: "Kiet FC",
  shortName: "KFC",
  slug: "kiet-fc",
  logo: "",
  city: "Ghaziabad",
  homeGround: "Main Ground",
  isPublished: true,
  isArchived: false,
};
const player = {
  _id: "player1",
  name: "Kiet Player",
  photoUrl: "",
  position: "ST",
  jerseyNumber: 9,
  isCaptain: true,
  isViceCaptain: false,
  isActive: true,
  availabilityStatus: "injured",
  createdBy: "private",
  team: publicTeam,
};
const match = (status, id) => ({
  _id: id,
  team: publicTeam,
  opponent: { name: "Kiet Rivals" },
  status,
  currentPeriod:
    status === "live"
      ? "first_half"
      : status === "completed"
        ? "full_time"
        : "not_started",
  teamSide: "home",
  scheduledAt: new Date("2026-08-10"),
  completedAt: status === "completed" ? new Date("2026-08-10T12:00:00Z") : null,
  venue: "Kiet Ground",
  tournament: "Campus Cup",
  matchType: "league",
  homeScore: 2,
  awayScore: 1,
  isActive: true,
  stream: {
    sourceUrl: "private",
    addedBy: "private",
    isEnabled: true,
    videoId: "dQw4w9WgXcQ",
    embedUrl: "https://www.youtube.com/embed/dQw4w9WgXcQ",
  },
  createdBy: "private",
});

const teamLookupModel = {
  find: (filter) =>
    new Query(filter.name ? [publicTeam._id] : [publicTeam._id]),
};

const validationErrors = async (query) => {
  const req = { query };
  await Promise.all(
    publicSearchValidator.map((validator) => validator.run(req)),
  );
  return validationResult(req).array();
};

test("search validation rejects missing, short, blank, object, enum, page, and excessive limit values", async () => {
  assert.ok((await validationErrors({})).length);
  assert.ok((await validationErrors({ q: "a" })).length);
  assert.ok((await validationErrors({ q: "   " })).length);
  assert.ok((await validationErrors({ q: { $ne: "" } })).length);
  assert.ok((await validationErrors({ q: "valid", type: "users" })).length);
  assert.ok((await validationErrors({ q: "valid", page: "0" })).length);
  assert.ok((await validationErrors({ q: "valid", limit: "31" })).length);
  assert.equal(
    (
      await validationErrors({
        q: "  Kiet  ",
        type: "all",
        page: "1",
        limit: "10",
      })
    ).length,
    0,
  );
});

test("search patterns escape regex operators", () => {
  assert.equal(
    searchPatterns("FC.*($ne)").contains.$regex,
    "FC\\.\\*\\(\\$ne\\)",
  );
});

test("team search enforces public teams and exact-prefix-remaining order", async () => {
  const exact = { ...publicTeam, name: "Kiet" };
  const prefix = {
    ...publicTeam,
    _id: "team2",
    name: "Kiet United",
    slug: "kiet-united",
  };
  const remaining = {
    ...publicTeam,
    _id: "team3",
    name: "United Kiet",
    slug: "united-kiet",
  };
  let base;
  const model = rankedModel([[exact], [prefix], [remaining]], (filter) => {
    base ||= filter.$and?.[0];
  });
  const result = await searchTeams({
    teamModel: model,
    query: "Kiet",
    limit: 10,
  });
  assert.equal(base.isPublished, true);
  assert.equal(base.isArchived, false);
  assert.deepEqual(
    result.items.map((item) => item.name),
    ["Kiet", "Kiet United", "United Kiet"],
  );
  assert.equal(result.total, 3);
});

test("player search is active/public, supports jersey queries, includes safe team, and hides availability", async () => {
  let base;
  const model = rankedModel([[player], [], []], (filter) => {
    base ||= filter.$and?.[0];
  });
  const result = await searchPlayers({
    teamModel: teamLookupModel,
    playerModel: model,
    query: "9",
  });
  assert.equal(base.isActive, true);
  assert.deepEqual(base.team.$in, [publicTeam._id]);
  assert.ok(base.$or.some((condition) => condition.jerseyNumber === 9));
  assert.equal(result.items[0].team.slug, publicTeam.slug);
  assert.equal(result.items[0].availabilityStatus, undefined);
  assert.equal(result.items[0].createdBy, undefined);
});

test("match search excludes private/deleted matches, orders statuses, and sanitizes streams", async () => {
  const buckets = [
    [match("live", "live1")],
    [match("scheduled", "fixture1")],
    [match("completed", "result1")],
  ];
  let common;
  const matchModel = {
    countDocuments: async (filter) => {
      common ||= filter;
      return buckets[
        typeof filter.status === "object"
          ? 0
          : filter.status === "scheduled"
            ? 1
            : 2
      ].length;
    },
    find: (filter) =>
      new Query(
        buckets[
          typeof filter.status === "object"
            ? 0
            : filter.status === "scheduled"
              ? 1
              : 2
        ],
      ),
  };
  const result = await searchMatches({
    teamModel: teamLookupModel,
    matchModel,
    query: "Kiet",
    limit: 10,
    now: new Date("2026-07-01"),
  });
  assert.equal(common.isActive, true);
  assert.deepEqual(common.team.$in, [publicTeam._id]);
  assert.deepEqual(
    result.items.map((item) => item.status),
    ["live", "scheduled", "completed"],
  );
  assert.equal(result.items[0].stream.isPlayable, true);
  assert.equal(result.items[0].stream.sourceUrl, undefined);
  assert.equal(result.items[0].createdBy, undefined);
});

test("all search returns bounded groups and totals while specific type returns pagination", async () => {
  const teams = rankedModel([[publicTeam], [], []]);
  teams.find = (filter) =>
    filter.$and ? new Query([publicTeam]) : new Query([publicTeam._id]);
  const players = rankedModel([[player], [], []]);
  const matches = {
    countDocuments: async (filter) =>
      typeof filter.status === "object" ? 1 : 0,
    find: (filter) =>
      new Query(
        typeof filter.status === "object" ? [match("live", "live1")] : [],
      ),
  };
  const grouped = await globalPublicSearch({
    query: "Kiet",
    type: "all",
    limit: 1,
    teamModel: teams,
    playerModel: players,
    matchModel: matches,
  });
  assert.equal(grouped.teams.items.length, 1);
  assert.equal(grouped.players.total, 1);
  assert.equal(grouped.matches.total, 1);
  const specific = await globalPublicSearch({
    query: "Kiet",
    type: "teams",
    limit: 1,
    teamModel: teams,
  });
  assert.equal(specific.type, "teams");
  assert.equal(specific.pagination.limit, 1);
});
