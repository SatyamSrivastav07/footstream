import { body, param, query } from 'express-validator';
import { TOURNAMENT_PARTICIPATION_STATUS } from '../constants/tournamentConstants.js';

export const tournamentParticipantParamsValidator = [
  param('tournamentId').isMongoId().withMessage('Invalid tournament identifier.'),
];

export const participantIdValidator = [
  ...tournamentParticipantParamsValidator,
  param('participantId').isMongoId().withMessage('Invalid participant identifier.'),
];

export const participantListValidator = [
  ...tournamentParticipantParamsValidator,
  query('status').optional().isIn(Object.values(TOURNAMENT_PARTICIPATION_STATUS)).withMessage('Invalid participant status.'),
  query('page').optional().isInt({ min: 1 }).withMessage('Page must be positive.').toInt(),
  query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be 1 to 100.').toInt(),
];

const rejectUnknown = (allowed) => body().custom((value = {}) => {
  const protectedFields = ['createdBy', 'updatedBy', 'addedBy', 'publicId', 'registeredTeamSnapshot', 'user', 'password'];
  const forbidden = Object.keys(value).filter((field) => protectedFields.includes(field));
  if (forbidden.length) throw new Error(`Protected participant fields are not accepted: ${forbidden.join(', ')}.`);
  const unknown = Object.keys(value).filter((field) => !allowed.includes(field));
  if (unknown.length) throw new Error(`Unsupported participant fields: ${unknown.join(', ')}.`);
  return true;
});

export const registeredParticipantValidator = [
  ...tournamentParticipantParamsValidator,
  rejectUnknown(['registeredTeam']),
  body('registeredTeam').isMongoId().withMessage('Registered team is required.'),
];

const manualFields = ['displayName', 'shortName', 'slug', 'captainName', 'managerName', 'coachName', 'seed'];
export const manualParticipantValidator = [
  ...tournamentParticipantParamsValidator,
  rejectUnknown(manualFields),
  body('displayName').trim().isLength({ min: 2, max: 160 }).withMessage('Display name must be 2 to 160 characters.'),
  body('shortName').optional({ checkFalsy: true }).trim().isLength({ max: 32 }).withMessage('Short name is too long.'),
  body('slug').optional({ checkFalsy: true }).trim().matches(/^[a-z0-9]+(?:-[a-z0-9]+)*$/).withMessage('Slug must be lowercase kebab-case.'),
  body('captainName').optional({ checkFalsy: true }).trim().isLength({ max: 120 }).withMessage('Captain name is too long.'),
  body('managerName').optional({ checkFalsy: true }).trim().isLength({ max: 120 }).withMessage('Manager name is too long.'),
  body('coachName').optional({ checkFalsy: true }).trim().isLength({ max: 120 }).withMessage('Coach name is too long.'),
  body('seed').optional({ nullable: true, checkFalsy: true }).isInt({ min: 1, max: 512 }).withMessage('Seed is invalid.').toInt(),
];

export const updateParticipantValidator = [
  ...participantIdValidator,
  rejectUnknown(manualFields),
  body('displayName').optional().trim().isLength({ min: 2, max: 160 }).withMessage('Display name must be 2 to 160 characters.'),
  body('shortName').optional({ checkFalsy: true }).trim().isLength({ max: 32 }).withMessage('Short name is too long.'),
  body('slug').optional({ checkFalsy: true }).trim().matches(/^[a-z0-9]+(?:-[a-z0-9]+)*$/).withMessage('Slug must be lowercase kebab-case.'),
  body('captainName').optional({ checkFalsy: true }).trim().isLength({ max: 120 }).withMessage('Captain name is too long.'),
  body('managerName').optional({ checkFalsy: true }).trim().isLength({ max: 120 }).withMessage('Manager name is too long.'),
  body('coachName').optional({ checkFalsy: true }).trim().isLength({ max: 120 }).withMessage('Coach name is too long.'),
  body('seed').optional({ nullable: true, checkFalsy: true }).isInt({ min: 1, max: 512 }).withMessage('Seed is invalid.').toInt(),
];

export const participantStatusValidator = [
  ...participantIdValidator,
  rejectUnknown(['status']),
  body('status').isIn(Object.values(TOURNAMENT_PARTICIPATION_STATUS)).withMessage('Invalid participant status.'),
];

export const availableTeamsValidator = [
  ...tournamentParticipantParamsValidator,
  query('search').optional().trim().isLength({ max: 120 }).withMessage('Search is too long.'),
  query('city').optional().trim().isLength({ max: 100 }).withMessage('City is too long.'),
  query('page').optional().isInt({ min: 1 }).withMessage('Page must be positive.').toInt(),
  query('limit').optional().isInt({ min: 1, max: 50 }).withMessage('Limit must be 1 to 50.').toInt(),
];
