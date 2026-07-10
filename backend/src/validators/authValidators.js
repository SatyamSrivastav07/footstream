import { body } from 'express-validator';

export const loginValidator = [
  body('email').trim().isEmail().withMessage('Enter a valid email address.').normalizeEmail(),
  body('password').isString().notEmpty().withMessage('Password is required.'),
];

