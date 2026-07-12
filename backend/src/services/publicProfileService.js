import { URL } from "node:url";
import Match from "../models/Match.js";
import MatchPhoto from "../models/MatchPhoto.js";
import Player from "../models/Player.js";
import Team from "../models/Team.js";
import AppError from "../utils/AppError.js";
import { getPlayerStatistics, loadTeamData } from "./statisticsService.js";
import { publicImage } from "./teamBrandingService.js";
import { playerPhotoUrl } from "./playerPhotoService.js";
import {
  escapeRegex,
  listPublicMatches,
  serializePublicMatchCard,
} from "./publicPortalService.js";

const idString = (value) => String(value?._id || value || "");
const fallbackShortName = (name = "") =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .map((part) => part[0])
    .join("")
    .slice(0, 4)
    .toUpperCase();

const isInstagramUrl = (value) => {
  try {
    const url = new URL(value);
    return ["http:", "https:"].includes(url.protocol) &&
      ["instagram.com", "www.instagram.com"].includes(url.hostname.toLowerCase());
  } catch {
    return false;
  }
};

const safeSocialLinks = (links = {}) =>
  Object.fromEntries(
    Object.entries(links).filter(
      ([network, value]) => Boolean(value) && (network !== "instagram" || isInstagramUrl(value)),
    ),
  );

export const serializePublicTeam = (team) => ({
  name: team.name,
  slug: team.slug,
  shortName: team.shortName || fallbackShortName(team.name),
  logo: publicImage(team.logo).imageUrl,
  coverPhoto: publicImage(team.coverPhoto).imageUrl,
  coverPhotoMeta: publicImage(team.coverPhoto),
  city: team.city || team.location || "",
  coach: team.coach || "",
  homeGround: team.homeGround || "",
  founded: team.founded ?? null,
  description: team.description || "",
  socialLinks: safeSocialLinks(team.socialLinks),
});

export const serializePublicPlayer = (player) => ({
  playerId: idString(player),
  name: player.name,
  photoUrl: playerPhotoUrl(player),
  position: player.position,
  jerseyNumber: player.jerseyNumber ?? null,
  age: player.age ?? null,
  academicYear: player.academicYear || null,
  preferredFoot: player.preferredFoot || null,
  isCaptain: Boolean(player.isCaptain),
  isViceCaptain: Boolean(player.isViceCaptain),
});

const playerLeader = (players, field) =>
  [...players].sort(
    (a, b) =>
      b[field] - a[field] ||
      a.name.localeCompare(b.name) ||
      a.playerId.localeCompare(b.playerId),
  )[0] || null;

const serializeLeader = (player, field) =>
  player && (field === "matchesPlayed" || player[field] > 0)
    ? {
        playerId: player.playerId,
        name: player.name,
        photoUrl: player.photoUrl || "",
        position: player.position,
        jerseyNumber: player.jerseyNumber ?? null,
        value: player[field],
      }
    : null;

export const resolvePublicTeam = async ({ teamModel = Team, teamSlug }) => {
  const team = await teamModel
    .findOne({ slug: teamSlug, isPublished: true, isArchived: false })
    .lean();
  if (!team) throw new AppError("Team not found.", 404, "TEAM_NOT_FOUND");
  return team;
};

export const listPublicTeams = async ({
  teamModel = Team,
  playerModel = Player,
  loadTeamDataImpl = loadTeamData,
  query = {},
} = {}) => {
  const page = Number(query.page) || 1;
  const limit = Math.min(30, Number(query.limit) || 12);
  const filter = { isPublished: true, isArchived: false };
  if (query.search)
    filter.name = { $regex: escapeRegex(query.search), $options: "i" };
  if (query.city) {
    const city = { $regex: escapeRegex(query.city), $options: "i" };
    filter.$or = [{ city }, { location: city }];
  }
  const [teams, total] = await Promise.all([
    teamModel
      .find(filter)
      .sort({ name: 1, _id: 1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean(),
    teamModel.countDocuments(filter),
  ]);
  const items = await Promise.all(
    teams.map(async (team) => {
      const [data, activePlayerIds] = await Promise.all([
        loadTeamDataImpl({ teamId: team._id }),
        playerModel.find({ team: team._id, isActive: true }).distinct("_id"),
      ]);
      const activeIds = new Set(activePlayerIds.map(idString));
      const topScorer = playerLeader(
        data.players.filter((player) => activeIds.has(player.playerId)),
        "goals",
      );
      return {
        ...serializePublicTeam(team),
        statistics: {
          matchesPlayed: data.team.matchesPlayed,
          wins: data.team.wins,
        },
        topScorer: serializeLeader(topScorer, "goals"),
      };
    }),
  );
  return {
    teams: items,
    pagination: { page, limit, total, pages: Math.ceil(total / limit) },
  };
};

const publicMatchQuery = (query) =>
  query
    .select(
      "-createdBy -updatedBy -resultConfirmedBy -stream.addedBy -stream.sourceUrl -__v",
    )
    .populate("team", "name slug logo")
    .lean();

const safePhoto = (photo) => ({
  imageUrl: photo.imageUrl,
  caption: photo.caption || "",
  category: photo.category,
  createdAt: photo.createdAt,
});

const galleryForTeam = async ({
  matchModel,
  photoModel,
  teamId,
  category,
  page = 1,
  limit = 18,
}) => {
  const matchIds = await matchModel
    .find({ team: teamId, status: "completed", isActive: true })
    .distinct("_id");
  const filter = { team: teamId, match: { $in: matchIds }, isActive: true };
  if (category) filter.category = category;
  const [photos, total] = await Promise.all([
    photoModel
      .find(filter)
      .select("imageUrl caption category createdAt")
      .sort({ createdAt: -1, _id: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean(),
    photoModel.countDocuments(filter),
  ]);
  return {
    photos: photos.map(safePhoto),
    pagination: { page, limit, total, pages: Math.ceil(total / limit) },
  };
};

export const getPublicTeamProfile = async ({
  teamModel = Team,
  matchModel = Match,
  photoModel = MatchPhoto,
  playerModel = Player,
  loadTeamDataImpl = loadTeamData,
  teamSlug,
  now = new Date(),
}) => {
  const team = await resolvePublicTeam({ teamModel, teamSlug });
  const base = { team: team._id, isActive: true };
  const [data, activePlayerIds, nextFixture, latestResult, gallery] =
    await Promise.all([
      loadTeamDataImpl({ teamId: team._id }),
      playerModel.find({ team: team._id, isActive: true }).distinct("_id"),
      publicMatchQuery(
        matchModel
          .findOne({ ...base, status: "scheduled", scheduledAt: { $gte: now } })
          .sort({ scheduledAt: 1, _id: 1 }),
      ),
      publicMatchQuery(
        matchModel
          .findOne({ ...base, status: "completed" })
          .sort({ completedAt: -1, scheduledAt: -1, _id: -1 }),
      ),
      galleryForTeam({
        matchModel,
        photoModel,
        teamId: team._id,
        page: 1,
        limit: 6,
      }),
    ]);
  const activeIds = new Set(activePlayerIds.map(idString));
  const publicPlayers = data.players.filter((player) =>
    activeIds.has(player.playerId),
  );
  return {
    team: serializePublicTeam(team),
    overview: {
      statistics: data.team,
      nextFixture: nextFixture
        ? serializePublicMatchCard(nextFixture, now)
        : null,
      latestResult: latestResult
        ? serializePublicMatchCard(latestResult, now)
        : null,
      topScorer: serializeLeader(playerLeader(publicPlayers, "goals"), "goals"),
      topAssists: serializeLeader(
        playerLeader(publicPlayers, "assists"),
        "assists",
      ),
      mostAppearances: serializeLeader(
        playerLeader(publicPlayers, "matchesPlayed"),
        "matchesPlayed",
      ),
      galleryPreview: gallery.photos,
    },
  };
};

export const getPublicSquad = async ({
  teamModel = Team,
  playerModel = Player,
  teamSlug,
}) => {
  const team = await resolvePublicTeam({ teamModel, teamSlug });
  const players = await playerModel
    .find({ team: team._id, isActive: true })
    .select(
      "name photo photoUrl position jerseyNumber age academicYear preferredFoot isCaptain isViceCaptain",
    )
    .sort({ position: 1, jerseyNumber: 1, name: 1 })
    .lean();
  return {
    team: serializePublicTeam(team),
    players: players.map(serializePublicPlayer),
  };
};

export const getPublicTeamMatches = async ({
  teamModel = Team,
  matchModel = Match,
  teamSlug,
  kind,
  query = {},
}) => {
  const team = await resolvePublicTeam({ teamModel, teamSlug });
  const data = await listPublicMatches({
    teamModel,
    matchModel,
    kind,
    query: {
      ...query,
      ...(kind === "fixtures" ? { from: new Date().toISOString() } : {}),
      teamId: idString(team),
    },
  });
  return { team: serializePublicTeam(team), ...data };
};

export const getPublicTeamGallery = async ({
  teamModel = Team,
  matchModel = Match,
  photoModel = MatchPhoto,
  teamSlug,
  query = {},
}) => {
  const team = await resolvePublicTeam({ teamModel, teamSlug });
  const page = Number(query.page) || 1;
  const limit = Math.min(30, Number(query.limit) || 18);
  const gallery = await galleryForTeam({
    matchModel,
    photoModel,
    teamId: team._id,
    category: query.category,
    page,
    limit,
  });
  return { team: serializePublicTeam(team), ...gallery };
};

export const getPublicPlayerProfile = async ({
  playerModel = Player,
  matchModel = Match,
  getPlayerStatisticsImpl = getPlayerStatistics,
  playerId,
}) => {
  const player = await playerModel
    .findOne({ _id: playerId, isActive: true })
    .select(
      "team name photo photoUrl position jerseyNumber age academicYear preferredFoot isCaptain isViceCaptain",
    )
    .populate({ path: "team", match: { isPublished: true, isArchived: false } })
    .lean();
  if (!player?.team)
    throw new AppError("Player not found.", 404, "PLAYER_NOT_FOUND");
  const [statisticsData, recentMatches] = await Promise.all([
    getPlayerStatisticsImpl({ playerId, teamId: player.team._id }),
    publicMatchQuery(
      matchModel
        .find({
          team: player.team._id,
          status: "completed",
          isActive: true,
          $or: [
            { "startingXI.player": playerId },
            { "substitutes.player": playerId },
          ],
        })
        .sort({ completedAt: -1, scheduledAt: -1 })
        .limit(5),
    ),
  ]);
  const statistics = statisticsData.statistics;
  return {
    player: {
      ...serializePublicPlayer(player),
      team: serializePublicTeam(player.team),
    },
    statistics,
    awards: {
      manOfTheMatch: statistics.manOfTheMatchAwards,
      goals: statistics.goals,
      assists: statistics.assists,
      yellowCards: statistics.yellowCards,
      redCards: statistics.redCards,
    },
    recentMatches: recentMatches.map((match) => serializePublicMatchCard(match)),
  };
};
