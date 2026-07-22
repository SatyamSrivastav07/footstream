import { param, query } from "express-validator";
import { PHOTO_CATEGORIES } from "../models/MatchPhoto.js";
import { TEAM_GALLERY_CATEGORIES } from "../models/TeamGalleryPost.js";

const pagination = [
  query("page")
    .optional()
    .isInt({ min: 1 })
    .withMessage("Page must be a positive integer.")
    .toInt(),
  query("limit")
    .optional()
    .isInt({ min: 1, max: 30 })
    .withMessage("Limit must be between 1 and 30.")
    .toInt(),
];
const slug = param("teamSlug")
  .trim()
  .isLength({ min: 1, max: 120 })
  .matches(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)
  .withMessage("Invalid team slug.");

export const publicTeamsValidator = [
  ...pagination,
  query("search")
    .optional()
    .isString()
    .trim()
    .isLength({ max: 100 })
    .withMessage("Search cannot exceed 100 characters."),
  query("city")
    .optional()
    .isString()
    .trim()
    .isLength({ max: 100 })
    .withMessage("City cannot exceed 100 characters."),
];
export const publicTeamSlugValidator = [slug];
export const publicTeamMatchesValidator = [slug, ...pagination];
export const publicTeamGalleryValidator = [
  slug,
  ...pagination,
  query("category")
    .optional()
    .isIn([...PHOTO_CATEGORIES, ...TEAM_GALLERY_CATEGORIES])
    .withMessage("Invalid photo category."),
];
export const publicPlayerProfileValidator = [
  param("playerId").isMongoId().withMessage("Invalid player identifier."),
];
