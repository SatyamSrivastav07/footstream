import asyncHandler from "../utils/asyncHandler.js";
import {
  getPublicPlayerProfile,
  getPublicSquad,
  getPublicTeamGallery,
  getPublicTeamMatches,
  getPublicTeamProfile,
  listPublicTeams,
} from "../services/publicProfileService.js";

export const publicTeams = asyncHandler(async (req, res) =>
  res.json({
    success: true,
    data: await listPublicTeams({ query: req.query }),
  }),
);
export const publicTeamProfile = asyncHandler(async (req, res) =>
  res.json({
    success: true,
    data: await getPublicTeamProfile({ teamSlug: req.params.teamSlug }),
  }),
);
export const publicTeamSquad = asyncHandler(async (req, res) =>
  res.json({
    success: true,
    data: await getPublicSquad({ teamSlug: req.params.teamSlug }),
  }),
);
export const publicTeamFixtures = asyncHandler(async (req, res) =>
  res.json({
    success: true,
    data: await getPublicTeamMatches({
      teamSlug: req.params.teamSlug,
      kind: "fixtures",
      query: req.query,
    }),
  }),
);
export const publicTeamResults = asyncHandler(async (req, res) =>
  res.json({
    success: true,
    data: await getPublicTeamMatches({
      teamSlug: req.params.teamSlug,
      kind: "results",
      query: req.query,
    }),
  }),
);
export const publicTeamGallery = asyncHandler(async (req, res) =>
  res.json({
    success: true,
    data: await getPublicTeamGallery({
      teamSlug: req.params.teamSlug,
      query: req.query,
    }),
  }),
);
export const publicPlayerProfile = asyncHandler(async (req, res) =>
  res.json({
    success: true,
    data: await getPublicPlayerProfile({ playerId: req.params.playerId }),
  }),
);
