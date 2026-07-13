import { body, param, query } from 'express-validator';
import { REACTION_TYPES } from '../models/MatchReaction.js';

export const chatMatchIdValidator = [param('matchId').isMongoId().withMessage('Invalid match identifier.')];

export const listChatValidator = [
  ...chatMatchIdValidator,
  query('before').optional().isISO8601().withMessage('Before cursor must be a valid date.'),
  query('limit').optional().isInt({ min: 1, max: 30 }).withMessage('Limit must be between 1 and 30.').toInt(),
];

export const postChatValidator = [
  ...chatMatchIdValidator,
  body('displayName').isString().withMessage('Display name must be text.').trim().isLength({ min: 2, max: 30 }).withMessage('Display name must be 2 to 30 characters.'),
  body('guestSessionId').isUUID().withMessage('Guest session is invalid.'),
  body('message').isString().withMessage('Message must be text.').trim().isLength({ min: 1, max: 300 }).withMessage('Message must be 1 to 300 characters.'),
  body().custom((value) => {
    const unknown = Object.keys(value).filter((key) => !['displayName', 'guestSessionId', 'message'].includes(key));
    if (unknown.length) throw new Error(`Unsupported chat fields: ${unknown.join(', ')}.`);
    return true;
  }),
];

export const deleteChatValidator = [
  ...chatMatchIdValidator,
  param('messageId').isMongoId().withMessage('Invalid chat message identifier.'),
];

export const announcementValidator = [
  ...chatMatchIdValidator,
  body('message').isString().withMessage('Announcement must be text.').trim().isLength({ min: 1, max: 240 }).withMessage('Announcement must be 1 to 240 characters.'),
  body().custom((value) => {
    const unknown = Object.keys(value).filter((key) => key !== 'message');
    if (unknown.length) throw new Error(`Unsupported announcement fields: ${unknown.join(', ')}.`);
    return true;
  }),
];

export const reactionMatchValidator = [...chatMatchIdValidator];

export const toggleReactionValidator = [
  ...chatMatchIdValidator,
  param('reactionType').isIn(REACTION_TYPES).withMessage('Unsupported reaction.'),
  body('guestSessionId').isUUID().withMessage('Guest session is invalid.'),
  body().custom((value) => {
    const unknown = Object.keys(value).filter((key) => key !== 'guestSessionId');
    if (unknown.length) throw new Error(`Unsupported reaction fields: ${unknown.join(', ')}.`);
    return true;
  }),
];

export const pollIdValidator = [
  ...chatMatchIdValidator,
  param('pollId').isMongoId().withMessage('Invalid poll identifier.'),
];

const pollBodyFields = ['question', 'options'];

export const pollBodyValidator = [
  ...chatMatchIdValidator,
  body('question').isString().withMessage('Question must be text.').trim().isLength({ min: 1, max: 160 }).withMessage('Question must be 1 to 160 characters.'),
  body('options').isArray({ min: 2, max: 6 }).withMessage('Polls must include 2 to 6 options.'),
  body('options.*').isString().withMessage('Poll options must be text.').trim().isLength({ min: 1, max: 80 }).withMessage('Poll options must be 1 to 80 characters.'),
  body().custom((value) => {
    const unknown = Object.keys(value).filter((key) => !pollBodyFields.includes(key));
    if (unknown.length) throw new Error(`Unsupported poll fields: ${unknown.join(', ')}.`);
    return true;
  }),
];

export const updatePollValidator = [
  ...pollBodyValidator,
  param('pollId').isMongoId().withMessage('Invalid poll identifier.'),
];

export const votePollValidator = [
  ...pollIdValidator,
  body('guestSessionId').isUUID().withMessage('Guest session is invalid.'),
  body('optionId').isMongoId().withMessage('Invalid poll option.'),
  body().custom((value) => {
    const unknown = Object.keys(value).filter((key) => !['guestSessionId', 'optionId'].includes(key));
    if (unknown.length) throw new Error(`Unsupported vote fields: ${unknown.join(', ')}.`);
    return true;
  }),
];
