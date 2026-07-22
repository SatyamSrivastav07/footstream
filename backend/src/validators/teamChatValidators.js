import { body, param, query } from 'express-validator';

const rejectUnknown = (allowed) => body().custom((value) => {
  const unknown = Object.keys(value || {}).filter((key) => !allowed.includes(key));
  if (unknown.length) throw new Error(`Unsupported admin chat fields: ${unknown.join(', ')}.`);
  return true;
});

export const listTeamAdminChatValidator = [
  query('before').optional().isISO8601().withMessage('Before cursor must be a valid date.'),
  query('limit').optional().isInt({ min: 1, max: 50 }).withMessage('Limit must be between 1 and 50.').toInt(),
];

export const postTeamAdminChatValidator = [
  rejectUnknown(['message']),
  body('message')
    .isString()
    .withMessage('Message is required.')
    .trim()
    .isLength({ min: 1, max: 1000 })
    .withMessage('Message must be 1 to 1000 characters.'),
];

export const adminChatTeamsValidator = [
  query('search').optional().isString().trim().isLength({ max: 100 }).withMessage('Search must be 100 characters or less.'),
  query('limit').optional().isInt({ min: 1, max: 50 }).withMessage('Limit must be between 1 and 50.').toInt(),
];

export const createConversationValidator = [
  rejectUnknown(['opponentTeamId']),
  body('opponentTeamId').isMongoId().withMessage('Choose a valid registered opponent team.'),
];

export const conversationIdValidator = [
  param('conversationId').isMongoId().withMessage('Conversation id is invalid.'),
];
