import { body, param } from 'express-validator';

const optionalProfileFields = [
  body('shortName').optional().trim().isLength({ max: 20 }).withMessage('Short name cannot exceed 20 characters.'),
  body('logo').optional({ values: 'falsy' }).trim().isURL({ protocols: ['http', 'https'], require_protocol: true }).withMessage('Logo must be an HTTP or HTTPS URL.'),
  body('coverPhoto').optional({ values: 'falsy' }).trim().isURL({ protocols: ['http', 'https'], require_protocol: true }).withMessage('Cover photo must be an HTTP or HTTPS URL.'),
  body('city').optional().trim().isLength({ max: 100 }).withMessage('City cannot exceed 100 characters.'),
  body('coach').optional().trim().isLength({ max: 100 }).withMessage('Coach cannot exceed 100 characters.'),
  body('homeGround').optional().trim().isLength({ max: 160 }).withMessage('Home ground cannot exceed 160 characters.'),
  body('founded').optional({ nullable: true }).isInt({ min: 1800, max: new Date().getFullYear() }).withMessage('Founded year cannot be in the future.').toInt(),
  body('socialLinks').optional().isObject().withMessage('Social links must be an object.'),
  body('socialLinks.*').optional({ values: 'falsy' }).trim().isURL({ protocols: ['http', 'https'], require_protocol: true }).withMessage('Social links must use HTTP or HTTPS.'),
  body('isPublished').optional().isBoolean().withMessage('Publication status must be true or false.').toBoolean(),
];

export const createTeamValidator = [
  body('name').trim().isLength({ min: 2, max: 100 }).withMessage('Team name must be 2 to 100 characters.'),
  body('description').optional().trim().isLength({ max: 1000 }).withMessage('Description cannot exceed 1000 characters.'),
  body('location').optional().trim().isLength({ max: 160 }).withMessage('Location cannot exceed 160 characters.'),
  ...optionalProfileFields,
];

export const updateTeamValidator = [
  param('teamId').isMongoId().withMessage('Invalid team identifier.'),
  body('name').optional().trim().isLength({ min: 2, max: 100 }).withMessage('Team name must be 2 to 100 characters.'),
  body('description').optional().trim().isLength({ max: 1000 }).withMessage('Description cannot exceed 1000 characters.'),
  body('location').optional().trim().isLength({ max: 160 }).withMessage('Location cannot exceed 160 characters.'),
  ...optionalProfileFields,
];

export const createTeamAdminValidator = [
  body('name').trim().isLength({ min: 2, max: 100 }).withMessage('Name must be 2 to 100 characters.'),
  body('email').trim().isEmail().withMessage('Enter a valid email address.').normalizeEmail(),
  body('password')
    .isLength({ min: 10, max: 128 })
    .withMessage('Password must be 10 to 128 characters.')
    .matches(/[a-z]/).withMessage('Password must include a lowercase letter.')
    .matches(/[A-Z]/).withMessage('Password must include an uppercase letter.')
    .matches(/[0-9]/).withMessage('Password must include a number.'),
  body('teamId').isMongoId().withMessage('Select a valid team.'),
];

export const userIdValidator = [param('userId').isMongoId().withMessage('Invalid user identifier.')];

export const statusValidator = [
  ...userIdValidator,
  body('isActive').isBoolean().withMessage('isActive must be true or false.'),
];
