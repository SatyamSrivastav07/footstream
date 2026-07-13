import { body, param, query } from 'express-validator';

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
