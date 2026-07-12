import { query } from "express-validator";

export const publicSearchValidator = [
  query("q")
    .exists()
    .withMessage("Search query is required.")
    .bail()
    .isString()
    .withMessage("Search query must be text.")
    .bail()
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage("Search query must be 2 to 100 characters."),
  query("type")
    .optional()
    .isString()
    .withMessage("Search type must be text.")
    .bail()
    .isIn(["all", "teams", "players", "matches"])
    .withMessage("Search type is invalid."),
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
