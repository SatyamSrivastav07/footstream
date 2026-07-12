import asyncHandler from "../utils/asyncHandler.js";
import {
  getPublicHome,
  getPublicMatch,
  listPublicMatches,
} from "../services/publicPortalService.js";

export const publicHome = asyncHandler(async (_req, res) =>
  res.json({ success: true, data: await getPublicHome() }),
);
const list = (kind) =>
  asyncHandler(async (req, res) =>
    res.json({
      success: true,
      data: await listPublicMatches({ kind, query: req.query }),
    }),
  );
export const publicLiveDirectory = list("live");
export const publicFixtures = list("fixtures");
export const publicResults = list("results");
export const publicMatch = asyncHandler(async (req, res) =>
  res.json({
    success: true,
    data: { match: await getPublicMatch({ matchId: req.params.matchId }) },
  }),
);
