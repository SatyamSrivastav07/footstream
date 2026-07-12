import asyncHandler from "../utils/asyncHandler.js";
import { globalPublicSearch } from "../services/publicSearchService.js";

export const publicSearch = asyncHandler(async (req, res) => {
  const data = await globalPublicSearch({
    query: req.query.q,
    type: req.query.type || "all",
    page: Number(req.query.page) || 1,
    limit: Number(req.query.limit) || 10,
  });
  res.json({ success: true, data });
});
