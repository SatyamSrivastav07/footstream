import Match from "../models/Match.js";
import Player from "../models/Player.js";
import Team from "../models/Team.js";
import { serializePublicMatchCard } from "./publicPortalService.js";
import { publicImage } from "./teamBrandingService.js";
import { playerPhotoUrl } from "./playerPhotoService.js";

const escapeRegex = (value = "") =>
  value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const publicTeamFilter = { isPublished: true, isArchived: false };

export const searchPatterns = (query) => {
  const escaped = escapeRegex(query);
  return {
    contains: { $regex: escaped, $options: "i" },
    prefix: { $regex: `^${escaped}`, $options: "i" },
    exact: { $regex: `^${escaped}$`, $options: "i" },
  };
};

const rankFilters = (base, patterns) => [
  { $and: [base, { name: patterns.exact }] },
  {
    $and: [base, { name: patterns.prefix }, { name: { $not: patterns.exact } }],
  },
  { $and: [base, { name: { $not: patterns.prefix } }] },
];

const readRankedPage = async ({
  model,
  filters,
  page,
  limit,
  decorate = (query) => query,
}) => {
  const counts = await Promise.all(
    filters.map((filter) => model.countDocuments(filter)),
  );
  let skip = (page - 1) * limit;
  let remaining = limit;
  const items = [];
  for (let index = 0; index < filters.length && remaining > 0; index += 1) {
    if (skip >= counts[index]) {
      skip -= counts[index];
      continue;
    }
    const bucketItems = await decorate(
      model
        .find(filters[index])
        .sort({ name: 1, _id: 1 })
        .skip(skip)
        .limit(remaining),
    ).lean();
    items.push(...bucketItems);
    remaining -= bucketItems.length;
    skip = 0;
  }
  const total = counts.reduce((sum, value) => sum + value, 0);
  return {
    items,
    total,
    pagination: { page, limit, total, pages: Math.ceil(total / limit) },
  };
};

const safeTeam = (team) => ({
  slug: team.slug,
  name: team.name,
  shortName:
    team.shortName ||
    team.name
      .split(/\s+/)
      .map((part) => part[0])
      .join("")
      .slice(0, 4)
      .toUpperCase(),
  logo: publicImage(team.logo).imageUrl,
  city: team.city || team.location || "",
  homeGround: team.homeGround || "",
});

const safePlayer = (player) => ({
  playerId: String(player._id),
  name: player.name,
  photoUrl: playerPhotoUrl(player),
  position: player.position,
  jerseyNumber: player.jerseyNumber ?? null,
  isCaptain: Boolean(player.isCaptain),
  isViceCaptain: Boolean(player.isViceCaptain),
  team: safeTeam(player.team),
});

const publicTeamIds = (teamModel) =>
  teamModel.find(publicTeamFilter).distinct("_id");
const matchingTeamIds = (teamModel, contains) =>
  teamModel.find({ ...publicTeamFilter, name: contains }).distinct("_id");

export const searchTeams = async ({
  teamModel = Team,
  query,
  page = 1,
  limit = 10,
}) => {
  const patterns = searchPatterns(query);
  const base = {
    ...publicTeamFilter,
    $or: [
      { name: patterns.contains },
      { shortName: patterns.contains },
      { city: patterns.contains },
      { homeGround: patterns.contains },
    ],
  };
  const result = await readRankedPage({
    model: teamModel,
    filters: rankFilters(base, patterns),
    page,
    limit,
  });
  return { ...result, items: result.items.map(safeTeam) };
};

export const searchPlayers = async ({
  teamModel = Team,
  playerModel = Player,
  query,
  page = 1,
  limit = 10,
}) => {
  const patterns = searchPatterns(query);
  const [teamIds, namedTeamIds] = await Promise.all([
    publicTeamIds(teamModel),
    matchingTeamIds(teamModel, patterns.contains),
  ]);
  const matches = [
    { name: patterns.contains },
    { position: patterns.contains },
    { team: { $in: namedTeamIds } },
  ];
  if (/^\d{1,2}$/.test(query)) matches.push({ jerseyNumber: Number(query) });
  const base = { isActive: true, team: { $in: teamIds }, $or: matches };
  const decorate = (value) =>
    value
      .select(
        "team name photo photoUrl position jerseyNumber isCaptain isViceCaptain",
      )
      .populate("team", "name shortName slug logo city location homeGround");
  const result = await readRankedPage({
    model: playerModel,
    filters: rankFilters(base, patterns),
    page,
    limit,
    decorate,
  });
  return {
    ...result,
    items: result.items.filter((player) => player.team).map(safePlayer),
  };
};

const readMatchBucket = (matchModel, filter, sort, skip, limit) =>
  matchModel
    .find(filter)
    .select(
      "-createdBy -updatedBy -resultConfirmedBy -stream.addedBy -stream.sourceUrl -__v",
    )
    .populate("team", "name slug logo")
    .sort(sort)
    .skip(skip)
    .limit(limit)
    .lean();

export const searchMatches = async ({
  teamModel = Team,
  matchModel = Match,
  query,
  page = 1,
  limit = 10,
  now = new Date(),
}) => {
  const patterns = searchPatterns(query);
  const [teamIds, namedTeamIds] = await Promise.all([
    publicTeamIds(teamModel),
    matchingTeamIds(teamModel, patterns.contains),
  ]);
  const text = {
    $or: [
      { team: { $in: namedTeamIds } },
      { "opponent.name": patterns.contains },
      { tournament: patterns.contains },
      { venue: patterns.contains },
    ],
  };
  const common = { isActive: true, team: { $in: teamIds }, $and: [text] };
  const buckets = [
    {
      filter: { ...common, status: { $in: ["live", "half_time"] } },
      sort: { scheduledAt: 1, _id: 1 },
    },
    {
      filter: { ...common, status: "scheduled", scheduledAt: { $gte: now } },
      sort: { scheduledAt: 1, _id: 1 },
    },
    {
      filter: { ...common, status: "completed" },
      sort: { completedAt: -1, scheduledAt: -1, _id: -1 },
    },
  ];
  const counts = await Promise.all(
    buckets.map(({ filter }) => matchModel.countDocuments(filter)),
  );
  let skip = (page - 1) * limit;
  let remaining = limit;
  const matches = [];
  for (let index = 0; index < buckets.length && remaining > 0; index += 1) {
    if (skip >= counts[index]) {
      skip -= counts[index];
      continue;
    }
    const bucket = buckets[index];
    const items = await readMatchBucket(
      matchModel,
      bucket.filter,
      bucket.sort,
      skip,
      remaining,
    );
    matches.push(...items);
    remaining -= items.length;
    skip = 0;
  }
  const total = counts.reduce((sum, value) => sum + value, 0);
  return {
    items: matches
      .filter((match) => match.team)
      .map((match) => serializePublicMatchCard(match, now)),
    total,
    pagination: { page, limit, total, pages: Math.ceil(total / limit) },
  };
};

export const globalPublicSearch = async ({
  query,
  type = "all",
  page = 1,
  limit = 10,
  ...dependencies
}) => {
  const options = { ...dependencies, query, page, limit };
  if (type !== "all") {
    const result = type === "teams"
      ? await searchTeams(options)
      : type === "players"
        ? await searchPlayers(options)
        : await searchMatches(options);
    return { query, type, items: result.items, pagination: result.pagination };
  }
  const [teams, players, matches] = await Promise.all([
    searchTeams(options),
    searchPlayers(options),
    searchMatches(options),
  ]);
  return {
    query,
    teams: { items: teams.items, total: teams.total },
    players: { items: players.items, total: players.total },
    matches: { items: matches.items, total: matches.total },
  };
};
