import { body, param, query } from 'express-validator';
import { TEAM_REGISTRATION_STATUSES } from '../models/TeamRegistrationRequest.js';

const currentYear = new Date().getFullYear();
const allowedPublic = ['teamName', 'shortName', 'city', 'state', 'country', 'foundedYear', 'primaryColor', 'secondaryColor', 'description', 'instagramUrl', 'websiteUrl', 'representativeName', 'roleInTeam', 'email', 'phone', 'message'];
const protectedFields = ['status', 'reviewedBy', 'reviewedAt', 'rejectionReason', 'createdTeam', 'createdAdmin', 'requestCode', 'password', 'adminEmail', 'adminName', 'publicId'];

const rejectUnknown = (allowed, label) => body().custom((value = {}) => {
  const unknown = Object.keys(value).filter((field) => !allowed.includes(field));
  if (unknown.length) throw new Error(`Unsupported ${label}: ${unknown.join(', ')}.`);
  return true;
});

export const submitTeamRegistrationValidator = [
  body().custom((value = {}) => {
    const forbidden = Object.keys(value).filter((field) => protectedFields.includes(field));
    if (forbidden.length) throw new Error(`Protected team registration fields are not accepted: ${forbidden.join(', ')}.`);
    return true;
  }),
  body('teamName').trim().isLength({ min: 2, max: 100 }).withMessage('Team name must be 2 to 100 characters.').escape(),
  body('shortName').optional({ checkFalsy: true }).trim().isLength({ min: 2, max: 20 }).withMessage('Short name must be 2 to 20 characters.').escape(),
  body('city').trim().isLength({ min: 2, max: 100 }).withMessage('City must be 2 to 100 characters.').escape(),
  body('state').optional({ checkFalsy: true }).trim().isLength({ max: 100 }).withMessage('State is too long.').escape(),
  body('country').trim().isLength({ min: 2, max: 100 }).withMessage('Country must be 2 to 100 characters.').escape(),
  body('foundedYear').optional({ nullable: true, checkFalsy: true }).isInt({ min: 1800, max: currentYear }).withMessage('Founded year is invalid.').toInt(),
  body('primaryColor').optional({ checkFalsy: true }).trim().matches(/^#?[0-9a-fA-F]{3,8}$|^[a-zA-Z ]{3,20}$/).withMessage('Primary color is invalid.').escape(),
  body('secondaryColor').optional({ checkFalsy: true }).trim().matches(/^#?[0-9a-fA-F]{3,8}$|^[a-zA-Z ]{3,20}$/).withMessage('Secondary color is invalid.').escape(),
  body('description').optional({ checkFalsy: true }).trim().isLength({ max: 1000 }).withMessage('Description cannot exceed 1000 characters.').escape(),
  body('instagramUrl').optional({ checkFalsy: true }).trim().isURL({ protocols: ['http', 'https'], require_protocol: true }).withMessage('Instagram URL must use HTTP or HTTPS.'),
  body('websiteUrl').optional({ checkFalsy: true }).trim().isURL({ protocols: ['http', 'https'], require_protocol: true }).withMessage('Website URL must use HTTP or HTTPS.'),
  body('representativeName').trim().isLength({ min: 2, max: 80 }).withMessage('Representative name must be 2 to 80 characters.').escape(),
  body('roleInTeam').trim().isLength({ min: 2, max: 60 }).withMessage('Role must be 2 to 60 characters.').escape(),
  body('email').trim().isEmail().withMessage('Enter a valid email address.').normalizeEmail(),
  body('phone').trim().matches(/^\+?[0-9][0-9\s().-]{6,23}$/).withMessage('Enter a valid phone number.'),
  body('message').optional({ checkFalsy: true }).trim().isLength({ max: 1000 }).withMessage('Message cannot exceed 1000 characters.').escape(),
  rejectUnknown(allowedPublic, 'team registration fields'),
];

export const teamRegistrationCodeValidator = [
  param('requestCode').trim().isLength({ min: 10, max: 40 }).matches(/^[A-Z0-9-]+$/).withMessage('Invalid request code.'),
];

export const teamRegistrationIdValidator = [
  param('requestId').isMongoId().withMessage('Invalid team registration request identifier.'),
];

export const listTeamRegistrationValidator = [
  query('status').optional().isIn(TEAM_REGISTRATION_STATUSES).withMessage('Invalid status.'),
  query('search').optional().trim().isLength({ max: 100 }).withMessage('Search cannot exceed 100 characters.'),
  query('page').optional().isInt({ min: 1 }).withMessage('Page must be positive.').toInt(),
  query('limit').optional().isInt({ min: 1, max: 50 }).withMessage('Limit must be 1 to 50.').toInt(),
];

export const approveTeamRegistrationValidator = [
  ...teamRegistrationIdValidator,
  body('teamName').trim().isLength({ min: 2, max: 100 }).withMessage('Final team name must be 2 to 100 characters.').escape(),
  body('slug').trim().isLength({ min: 2, max: 120 }).matches(/^[a-z0-9]+(?:-[a-z0-9]+)*$/).withMessage('Slug must use lowercase letters, numbers, and hyphens.'),
  body('shortName').optional({ checkFalsy: true }).trim().isLength({ min: 2, max: 20 }).withMessage('Short name must be 2 to 20 characters.').escape(),
  body('city').optional({ checkFalsy: true }).trim().isLength({ max: 100 }).escape(),
  body('country').optional({ checkFalsy: true }).trim().isLength({ max: 100 }).escape(),
  body('foundedYear').optional({ nullable: true, checkFalsy: true }).isInt({ min: 1800, max: currentYear }).toInt(),
  body('description').optional({ checkFalsy: true }).trim().isLength({ max: 1000 }).escape(),
  body('adminName').trim().isLength({ min: 2, max: 100 }).withMessage('Admin name must be 2 to 100 characters.').escape(),
  body('adminEmail').trim().isEmail().withMessage('Enter a valid admin email.').normalizeEmail(),
  body('temporaryPassword').isLength({ min: 10, max: 128 }).withMessage('Temporary password must be at least 10 characters.'),
  rejectUnknown(['teamName', 'slug', 'shortName', 'city', 'country', 'foundedYear', 'description', 'adminName', 'adminEmail', 'temporaryPassword'], 'approval fields'),
];

export const rejectTeamRegistrationValidator = [
  ...teamRegistrationIdValidator,
  body('rejectionReason').trim().isLength({ min: 5, max: 300 }).withMessage('Rejection reason must be 5 to 300 characters.').escape(),
  rejectUnknown(['rejectionReason'], 'rejection fields'),
];
