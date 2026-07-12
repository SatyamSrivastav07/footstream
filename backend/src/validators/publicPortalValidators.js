import { param, query } from "express-validator";
import { MATCH_TYPES } from "../models/Match.js";

const pagination = [
  query("page")
    .optional()
    .isInt({ min: 1 })
    .withMessage("Page must be a positive integer.")
    .toInt(),
  query("limit")
    .optional()
    .isInt({ min: 1, max: 50 })
    .withMessage("Limit must be between 1 and 50.")
    .toInt(),
];
const dates = [
  query("from").optional().isISO8601().withMessage("From date is invalid."),
  query("to")
    .optional()
    .isISO8601()
    .withMessage("To date is invalid.")
    .bail()
    .custom((value, { req }) =>
      !req.query.from || new Date(value) >= new Date(req.query.from),
    )
    .withMessage("To date must not be earlier than from date."),
];
const text = [
  query("tournament").optional().isString().trim().isLength({ max: 160 }),
  query("search").optional().isString().trim().isLength({ max: 160 }),
  query("teamId").optional().isMongoId().withMessage("Team filter is invalid."),
];

export const publicLiveDirectoryValidator = pagination;
export const publicFixturesValidator = [
  ...pagination,
  ...dates,
  ...text,
  query("matchType")
    .optional()
    .isIn(MATCH_TYPES)
    .withMessage("Match type is invalid."),
];
export const publicResultsValidator = [
  ...pagination,
  ...dates,
  ...text,
  query("outcome")
    .optional()
    .isIn(["win", "draw", "loss"])
    .withMessage("Outcome is invalid."),
];
export const publicMatchValidator = [
  param("matchId").isMongoId().withMessage("Invalid match identifier."),
];
