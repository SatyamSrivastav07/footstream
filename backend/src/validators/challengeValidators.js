import { body, param, query } from 'express-validator';
import { CHALLENGE_MATCH_TYPES, CHALLENGE_SQUAD_SIZES, CHALLENGE_STATUSES } from '../models/TeamChallenge.js';

const rejectUnknown = (allowed, label = 'fields') => body().custom((value = {}) => {
  const unknown = Object.keys(value).filter((field) => !allowed.includes(field));
  if (unknown.length) throw new Error(`Unsupported ${label}: ${unknown.join(', ')}.`);
  return true;
});

export const challengeIdValidator = [
  param('challengeId').isMongoId().withMessage('Invalid challenge identifier.'),
];

export const listChallengesValidator = [
  query('status').optional().isIn(CHALLENGE_STATUSES).withMessage('Invalid challenge status.'),
  query('matchType').optional().isIn(CHALLENGE_MATCH_TYPES).withMessage('Invalid match type.'),
  query('squadSize').optional().isIn(CHALLENGE_SQUAD_SIZES).withMessage('Invalid squad size.'),
  query('from').optional().isISO8601().withMessage('From date is invalid.'),
  query('to').optional().isISO8601().withMessage('To date is invalid.'),
  query('opponent').optional().trim().isLength({ max: 100 }).withMessage('Opponent filter cannot exceed 100 characters.'),
  query('page').optional().isInt({ min: 1 }).withMessage('Page must be positive.').toInt(),
  query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100.').toInt(),
];

export const challengeTeamSearchValidator = [
  query('search').optional().trim().isLength({ max: 100 }).withMessage('Search cannot exceed 100 characters.'),
];

export const createChallengeValidator = [
  body('challengedTeam').isMongoId().withMessage('Select a valid opponent team.'),
  body('matchType').isIn(CHALLENGE_MATCH_TYPES).withMessage('Select a valid match type.'),
  body('squadSize').isIn(CHALLENGE_SQUAD_SIZES).withMessage('Select a valid squad size.'),
  body('venue').trim().isLength({ min: 2, max: 160 }).withMessage('Venue must be 2 to 160 characters.'),
  body('proposedDate').isISO8601({ strict: true }).withMessage('Select a valid proposed date.').toDate(),
  body('proposedTime').matches(/^([01]\d|2[0-3]):[0-5]\d$/).withMessage('Select a valid proposed time.'),
  body('message').optional({ checkFalsy: true }).trim().isLength({ max: 1000 }).withMessage('Message cannot exceed 1000 characters.'),
  rejectUnknown(['challengedTeam', 'matchType', 'squadSize', 'venue', 'proposedDate', 'proposedTime', 'message'], 'challenge fields'),
];

export const counterChallengeValidator = [
  ...challengeIdValidator,
  body('venue').trim().isLength({ min: 2, max: 160 }).withMessage('Venue must be 2 to 160 characters.'),
  body('proposedDate').isISO8601({ strict: true }).withMessage('Select a valid proposed date.').toDate(),
  body('proposedTime').matches(/^([01]\d|2[0-3]):[0-5]\d$/).withMessage('Select a valid proposed time.'),
  body('message').optional({ checkFalsy: true }).trim().isLength({ max: 1000 }).withMessage('Message cannot exceed 1000 characters.'),
  rejectUnknown(['venue', 'proposedDate', 'proposedTime', 'message'], 'counter proposal fields'),
];
