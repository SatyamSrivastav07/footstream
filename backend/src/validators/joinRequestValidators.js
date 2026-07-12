import { body, param, query } from 'express-validator';
import { ACADEMIC_YEARS, AVAILABILITY_STATUSES, PLAYER_POSITIONS, PREFERRED_FEET } from '../models/Player.js';
import { JOIN_REQUEST_STATUSES } from '../models/TeamJoinRequest.js';

const protectedPublicFields = [
  'jerseyNumber', 'team', 'teamId', 'status', 'reviewedBy', 'reviewedAt',
  'rejectionReason', 'approvalData', 'createdPlayer', 'requestCode', 'isActive',
  'publicId', 'imageUrl',
];

const rejectUnknown = (allowed, label = 'fields') => body().custom((value = {}) => {
  const unknown = Object.keys(value).filter((field) => !allowed.includes(field));
  if (unknown.length) throw new Error(`Unsupported ${label}: ${unknown.join(', ')}.`);
  return true;
});

const applicantFields = [
  'applicantName', 'position', 'age', 'academicYear', 'preferredFoot', 'email',
  'phone', 'shortBio', 'previousExperience', 'motivation', 'highlightsUrl',
];

export const submitJoinRequestValidator = [
  param('teamSlug').trim().isLength({ min: 1, max: 120 }).matches(/^[a-z0-9]+(?:-[a-z0-9]+)*$/).withMessage('Invalid team slug.'),
  body().custom((value = {}) => {
    const forbidden = Object.keys(value).filter((field) => protectedPublicFields.includes(field));
    if (forbidden.length) throw new Error(`Protected join request fields are not accepted: ${forbidden.join(', ')}.`);
    return true;
  }),
  body('applicantName').trim().isLength({ min: 2, max: 100 }).withMessage('Full name must be 2 to 100 characters.'),
  body('position').isIn(PLAYER_POSITIONS).withMessage('Select a valid position.'),
  body('age').optional({ nullable: true, checkFalsy: true }).isInt({ min: 14, max: 60 }).withMessage('Age must be between 14 and 60.').toInt(),
  body('academicYear').optional({ nullable: true, checkFalsy: true }).isIn(ACADEMIC_YEARS).withMessage('Select a valid academic year.'),
  body('preferredFoot').optional({ nullable: true, checkFalsy: true }).isIn(PREFERRED_FEET).withMessage('Select a valid preferred foot.'),
  body('email').trim().isEmail().withMessage('Enter a valid email address.').normalizeEmail(),
  body('phone').trim().matches(/^\+?[0-9][0-9\s().-]{6,23}$/).withMessage('Enter a valid phone number.'),
  body('shortBio').optional({ checkFalsy: true }).trim().isLength({ max: 500 }).withMessage('Short bio cannot exceed 500 characters.'),
  body('previousExperience').optional({ checkFalsy: true }).trim().isLength({ max: 1000 }).withMessage('Previous experience cannot exceed 1000 characters.'),
  body('motivation').optional({ checkFalsy: true }).trim().isLength({ max: 1000 }).withMessage('Motivation cannot exceed 1000 characters.'),
  body('highlightsUrl').optional({ checkFalsy: true }).trim().isLength({ max: 2048 }).isURL({ protocols: ['http', 'https'], require_protocol: true }).withMessage('Highlights URL must use HTTP or HTTPS.'),
  rejectUnknown(applicantFields, 'join request fields'),
];

export const requestCodeValidator = [
  param('requestCode').trim().isLength({ min: 10, max: 40 }).matches(/^[A-Z0-9-]+$/).withMessage('Invalid request code.'),
];

export const joinRequestIdValidator = [
  param('requestId').isMongoId().withMessage('Invalid join request identifier.'),
];

export const listJoinRequestsValidator = [
  query('status').optional().isIn(JOIN_REQUEST_STATUSES).withMessage('Invalid status.'),
  query('position').optional().isIn(PLAYER_POSITIONS).withMessage('Invalid position.'),
  query('academicYear').optional().isIn(ACADEMIC_YEARS).withMessage('Invalid academic year.'),
  query('from').optional().isISO8601().withMessage('Invalid from date.'),
  query('to').optional().isISO8601().withMessage('Invalid to date.'),
  query('search').optional().trim().isLength({ max: 100 }).withMessage('Search cannot exceed 100 characters.'),
  query('page').optional().isInt({ min: 1 }).withMessage('Page must be positive.').toInt(),
  query('limit').optional().isInt({ min: 1, max: 50 }).withMessage('Limit must be 1 to 50.').toInt(),
];

export const approveJoinRequestValidator = [
  ...joinRequestIdValidator,
  body('jerseyNumber').isInt({ min: 1, max: 99 }).withMessage('Official jersey number must be 1 to 99.').toInt(),
  body('availabilityStatus').optional().isIn(AVAILABILITY_STATUSES).withMessage('Select a valid availability status.'),
  body('isCaptain').optional().isBoolean().withMessage('Captain must be true or false.').toBoolean(),
  body('isViceCaptain').optional().isBoolean().withMessage('Vice-captain must be true or false.').toBoolean(),
  body('name').optional().trim().isLength({ min: 2, max: 100 }).withMessage('Name must be 2 to 100 characters.'),
  body('position').optional().isIn(PLAYER_POSITIONS).withMessage('Select a valid position.'),
  body('age').optional({ nullable: true, checkFalsy: true }).isInt({ min: 14, max: 60 }).withMessage('Age must be between 14 and 60.').toInt(),
  body('academicYear').optional({ nullable: true, checkFalsy: true }).isIn(ACADEMIC_YEARS).withMessage('Select a valid academic year.'),
  body('preferredFoot').optional({ nullable: true, checkFalsy: true }).isIn(PREFERRED_FEET).withMessage('Select a valid preferred foot.'),
  rejectUnknown(['jerseyNumber', 'availabilityStatus', 'isCaptain', 'isViceCaptain', 'name', 'position', 'age', 'academicYear', 'preferredFoot'], 'approval fields'),
];

export const rejectJoinRequestValidator = [
  ...joinRequestIdValidator,
  body('rejectionReason').optional({ checkFalsy: true }).trim().isLength({ max: 500 }).withMessage('Rejection reason cannot exceed 500 characters.'),
  rejectUnknown(['rejectionReason'], 'rejection fields'),
];
