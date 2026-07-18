import Match from "../models/Match.js";
import Team from "../models/Team.js";
import AppError from "../utils/AppError.js";
import { calculateElapsedSeconds } from "./liveMatchService.js";
import { serializePublicStream } from "./streamService.js";
import { publicImage } from "./teamBrandingService.js";

export const escapeRegex = (value = "") =>
  value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const idString = (value) => String(value?._id || value || "");

const safeTeam = (team) =>
  team
    ? { _id: team._id, name: team.name, slug: team.slug, logo: publicImage(team.logo).imageUrl }
    : null;
const safeSnapshot = (entry) => ({
  player: entry.player,
  name: entry.name,
  jerseyNumber: entry.jerseyNumber ?? null,
  position: entry.position,
  photoUrl: entry.photoUrl || "",
  isCaptain: Boolean(entry.isCaptain),
  isViceCaptain: Boolean(entry.isViceCaptain),
});

export const scoreForMatch = (match) => {
  const teamScore =
    match.result?.finalTeamScore ??
    (match.teamSide === "home" ? match.homeScore : match.awayScore) ??
    0;
  const opponentScore =
    match.result?.finalOpponentScore ??
    (match.teamSide === "home" ? match.awayScore : match.homeScore) ??
    0;
  const outcome =
    match.result?.outcome ||
    (teamScore > opponentScore
      ? "win"
      : teamScore < opponentScore
        ? "loss"
        : "draw");
  return {
    teamScore,
    opponentScore,
    homeScore: match.teamSide === "home" ? teamScore : opponentScore,
    awayScore: match.teamSide === "home" ? opponentScore : teamScore,
    outcome,
  };
};

export const serializePublicMatchCard = (match, now = new Date()) => {
  const scores = scoreForMatch(match);
  const playback = serializePublicStream(match);
  return {
    matchId: match._id,
    team: safeTeam(match.team),
    opponent: { name: match.opponent?.name || "" },
    status: match.status,
    matchMode: match.matchMode || "stream",
    currentPeriod: match.currentPeriod,
    teamSide: match.teamSide,
    scheduledAt: match.scheduledAt,
    completedAt: match.completedAt || null,
    venue: match.venue,
    tournament: match.tournament || "",
    matchType: match.matchType,
    ...scores,
    outcome: match.status === "completed" ? scores.outcome : null,
    elapsedSeconds: ["live", "half_time"].includes(match.status)
      ? calculateElapsedSeconds(match, now)
      : 0,
    stream: {
      isEnabled: Boolean(match.stream?.isEnabled),
      isPlayable: playback.isPlayable,
      scheduledLiveAt: playback.scheduledLiveAt,
    },
    manOfTheMatch: match.manOfTheMatch
      ? {
          name: match.manOfTheMatch.name,
          position: match.manOfTheMatch.position,
          jerseyNumber: match.manOfTheMatch.jerseyNumber ?? null,
          photoUrl: match.manOfTheMatch.photoUrl || "",
        }
      : null,
  };
};

export const serializePublicMatchDetail = (match, now = new Date()) => ({
  ...serializePublicMatchCard(match, now),
  opponent: {
    name: match.opponent.name,
    temporaryPlayers: (match.opponent.temporaryPlayers || []).map((player) => ({
      name: player.name,
      position: player.position || "",
      jerseyNumber: player.jerseyNumber ?? null,
    })),
  },
  formation: match.formation,
  customFormation: match.customFormation || "",
  startingXI: (match.startingXI || []).map(safeSnapshot),
  substitutes: (match.substitutes || []).map(safeSnapshot),
  result: match.status === "completed" ? scoreForMatch(match) : null,
  stream: serializePublicStream(match),
  completionNotes:
    match.status === "completed" ? match.completionNotes || "" : "",
  attendance: match.status === "completed" ? (match.attendance ?? null) : null,
});

const outcomeExpression = (outcome) => {
  const teamScore = {
    $cond: [{ $eq: ["$teamSide", "home"] }, "$homeScore", "$awayScore"],
  };
  const opponentScore = {
    $cond: [{ $eq: ["$teamSide", "home"] }, "$awayScore", "$homeScore"],
  };
  return {
    [outcome === "win" ? "$gt" : outcome === "loss" ? "$lt" : "$eq"]: [
      teamScore,
      opponentScore,
    ],
  };
};

export const buildPublicListFilter = ({
  kind,
  query,
  teamIds,
  searchTeamIds = [],
}) => {
  const filter = {
    isActive: true,
    team: { $in: teamIds },
    status:
      kind === "fixtures"
        ? "scheduled"
        : kind === "results"
          ? "completed"
          : { $in: ["live", "half_time"] },
  };
  if (query.teamId)
    filter.team = {
      $in: teamIds.filter(
        (teamId) => idString(teamId) === String(query.teamId),
      ),
    };
  if (query.matchType && kind === "fixtures")
    filter.matchType = query.matchType;
  if (query.from || query.to) {
    filter.scheduledAt = {};
    if (query.from) filter.scheduledAt.$gte = new Date(query.from);
    if (query.to) {
      const to = new Date(query.to);
      if (/^\d{4}-\d{2}-\d{2}$/.test(query.to)) to.setUTCHours(23, 59, 59, 999);
      filter.scheduledAt.$lte = to;
    }
  }
  if (query.tournament)
    filter.tournament = {
      $regex: escapeRegex(query.tournament),
      $options: "i",
    };
  if (query.outcome && kind === "results")
    filter.$expr = outcomeExpression(query.outcome);
  if (query.search) {
    const regex = { $regex: escapeRegex(query.search), $options: "i" };
    filter.$or = [
      { "opponent.name": regex },
      { venue: regex },
      { tournament: regex },
    ];
    if (searchTeamIds.length) filter.$or.push({ team: { $in: searchTeamIds } });
  }
  return filter;
};

const publicTeamIds = async (teamModel, search = "") => {
  const filter = { isArchived: false, isPublished: true };
  if (search) filter.name = { $regex: escapeRegex(search), $options: "i" };
  return teamModel.find(filter).distinct("_id");
};

const leanPublicMatches = (query) =>
  query
    .select(
      "-createdBy -updatedBy -resultConfirmedBy -stream.addedBy -stream.sourceUrl -__v",
    )
    .populate("team", "name slug logo")
    .lean();

export const listPublicMatches = async ({
  matchModel = Match,
  teamModel = Team,
  kind,
  query = {},
  now = new Date(),
}) => {
  const page = Number(query.page) || 1;
  const limit = Math.min(50, Number(query.limit) || 12);
  const [teamIds, searchTeamIds] = await Promise.all([
    publicTeamIds(teamModel),
    query.search ? publicTeamIds(teamModel, query.search) : [],
  ]);
  const filter = buildPublicListFilter({ kind, query, teamIds, searchTeamIds });
  const sort =
    kind === "fixtures"
      ? { scheduledAt: 1, _id: 1 }
      : kind === "results"
        ? { completedAt: -1, scheduledAt: -1, _id: -1 }
        : { status: 1, scheduledAt: 1, _id: 1 };
  const [matches, total] = await Promise.all([
    leanPublicMatches(
      matchModel
        .find(filter)
        .sort(sort)
        .skip((page - 1) * limit)
        .limit(limit),
    ),
    matchModel.countDocuments(filter),
  ]);
  return {
    matches: matches
      .filter((match) => match.team)
      .map((match) => serializePublicMatchCard(match, now)),
    pagination: { page, limit, total, pages: Math.ceil(total / limit) },
  };
};

export const getPublicHome = async ({
  matchModel = Match,
  teamModel = Team,
  now = new Date(),
} = {}) => {
  const teamIds = await publicTeamIds(teamModel);
  const base = { isActive: true, team: { $in: teamIds } };
  const [live, upcoming, latestResults] = await Promise.all([
    leanPublicMatches(
      matchModel
        .find({ ...base, status: { $in: ["live", "half_time"] } })
        .sort({ status: 1, scheduledAt: 1 })
        .limit(6),
    ),
    leanPublicMatches(
      matchModel
        .find({ ...base, status: "scheduled", scheduledAt: { $gte: now } })
        .sort({ scheduledAt: 1 })
        .limit(6),
    ),
    leanPublicMatches(
      matchModel
        .find({ ...base, status: "completed" })
        .sort({ completedAt: -1, scheduledAt: -1 })
        .limit(6),
    ),
  ]);
  const map = (items) =>
    items
      .filter((match) => match.team)
      .map((match) => serializePublicMatchCard(match, now));
  return {
    live: map(live),
    upcoming: map(upcoming),
    latestResults: map(latestResults),
  };
};

export const getPublicMatch = async ({
  matchModel = Match,
  teamModel = Team,
  matchId,
  now = new Date(),
}) => {
  const teamIds = await publicTeamIds(teamModel);
  const match = await matchModel
    .findOne({ _id: matchId, isActive: true, team: { $in: teamIds } })
    .select(
      "-createdBy -updatedBy -resultConfirmedBy -stream.addedBy -stream.sourceUrl -__v",
    )
    .populate("team", "name slug logo")
    .lean();
  if (!match?.team)
    throw new AppError("Match not found.", 404, "MATCH_NOT_FOUND");
  return serializePublicMatchDetail(match, now);
};

export const isPublicReadOnlyRouteSet = (router, allowedMutations = []) =>
  router.stack
    .filter((layer) => layer.route)
    .every((layer) =>
      Object.keys(layer.route.methods).every((method) => method === "get" || allowedMutations.includes(`${method.toUpperCase()} ${layer.route.path}`)),
    );
export const publicId = idString;
