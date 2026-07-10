import { body, param } from 'express-validator';

export const createTeamValidator = [
  body('name').trim().isLength({ min: 2, max: 100 }).withMessage('Team name must be 2 to 100 characters.'),
  body('description').optional().trim().isLength({ max: 1000 }).withMessage('Description cannot exceed 1000 characters.'),
  body('location').optional().trim().isLength({ max: 160 }).withMessage('Location cannot exceed 160 characters.'),
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

