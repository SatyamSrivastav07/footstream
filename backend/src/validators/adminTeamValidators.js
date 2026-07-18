import { body, param, query } from 'express-validator';
import { TEAM_STATUSES } from '../models/Team.js';

export const adminTeamIdValidator = [
  param('teamId').isMongoId().withMessage('Invalid team identifier.'),
];

export const adminTeamListValidator = [
  query('page').optional().isInt({ min: 1 }).withMessage('Page must be at least 1.').toInt(),
  query('limit').optional().isInt({ min: 1, max: 50 }).withMessage('Limit must be between 1 and 50.').toInt(),
  query('search').optional().trim().isLength({ max: 120 }).withMessage('Search is too long.'),
  query('status').optional().isIn(Object.values(TEAM_STATUSES)).withMessage('Invalid team status.'),
  query('teamType').optional().trim().isLength({ max: 60 }).withMessage('Team type filter is too long.'),
  query('sort').optional().isIn(['newest', 'oldest', 'alpha']).withMessage('Invalid sort option.'),
  query('includeArchived').optional().isBoolean().withMessage('includeArchived must be true or false.'),
];

export const pendingTeamListValidator = [
  query('page').optional().isInt({ min: 1 }).withMessage('Page must be at least 1.').toInt(),
  query('limit').optional().isInt({ min: 1, max: 50 }).withMessage('Limit must be between 1 and 50.').toInt(),
  query('search').optional().trim().isLength({ max: 120 }).withMessage('Search is too long.'),
  query('status').optional().isIn(['pending', 'changesRequested']).withMessage('Invalid pending status.'),
];

export const adminTeamUpdateValidator = [
  ...adminTeamIdValidator,
  body('name').optional().trim().isLength({ min: 2, max: 100 }).withMessage('Team name must be 2 to 100 characters.'),
  body('shortName').optional().trim().isLength({ max: 20 }).withMessage('Short name cannot exceed 20 characters.'),
  body('description').optional().trim().isLength({ max: 1000 }).withMessage('Description cannot exceed 1000 characters.'),
  body('location').optional().trim().isLength({ max: 160 }).withMessage('Location cannot exceed 160 characters.'),
  body('city').optional().trim().isLength({ max: 100 }).withMessage('City cannot exceed 100 characters.'),
  body('coach').optional().trim().isLength({ max: 100 }).withMessage('Coach cannot exceed 100 characters.'),
  body('homeGround').optional().trim().isLength({ max: 160 }).withMessage('Home ground cannot exceed 160 characters.'),
  body('organization').optional().trim().isLength({ max: 160 }).withMessage('Organization cannot exceed 160 characters.'),
  body('teamType').optional().trim().isLength({ max: 60 }).withMessage('Team type cannot exceed 60 characters.'),
  body('founded').optional({ nullable: true }).isInt({ min: 1800, max: new Date().getFullYear() }).withMessage('Founded year cannot be in the future.').toInt(),
  body('socialLinks').optional().isObject().withMessage('Social links must be an object.'),
  body('socialLinks.*').optional({ values: 'falsy' }).trim().isURL({ protocols: ['http', 'https'], require_protocol: true }).withMessage('Social links must use HTTP or HTTPS.'),
  body('isPublished').optional().isBoolean().withMessage('Publication status must be true or false.').toBoolean(),
  body('acceptingJoinRequests').optional().isBoolean().withMessage('Join-request status must be true or false.').toBoolean(),
];

export const adminTeamStatusValidator = [
  ...adminTeamIdValidator,
  body('status').isIn(Object.values(TEAM_STATUSES)).withMessage('Invalid team status.'),
  body('reason').optional().trim().isLength({ min: 3, max: 500 }).withMessage('Reason must be 3 to 500 characters.'),
];

export const adminTeamReasonValidator = [
  ...adminTeamIdValidator,
  body('reason').trim().isLength({ min: 3, max: 500 }).withMessage('Reason must be 3 to 500 characters.'),
];

export const adminTeamOptionalReasonValidator = [
  ...adminTeamIdValidator,
  body('reason').optional().trim().isLength({ max: 500 }).withMessage('Reason cannot exceed 500 characters.'),
];

export const assignTeamAdminValidator = [
  ...adminTeamIdValidator,
  body('userId').isMongoId().withMessage('Select a valid team administrator.'),
];

export const assignableAdminsValidator = [
  query('search').optional().trim().isLength({ max: 120 }).withMessage('Search is too long.'),
  query('limit').optional().isInt({ min: 1, max: 50 }).withMessage('Limit must be between 1 and 50.').toInt(),
];
