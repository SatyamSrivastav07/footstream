import { body, param } from 'express-validator';

const matchId = param('matchId').isMongoId().withMessage('Invalid match identifier.');
const rejectUnknown = (allowed) => body().custom((value) => { const unknown = Object.keys(value || {}).filter((key) => !allowed.includes(key)); if (unknown.length) throw new Error(`Unsupported stream fields: ${unknown.join(', ')}.`); return true; });

export const streamIdValidator = [matchId];
export const configureStreamValidator = [
  matchId,
  body('sourceUrl').isString().withMessage('YouTube URL is required.').trim().isLength({ min: 1, max: 2048 }).withMessage('YouTube URL is too long.'),
  body('title').optional().isString().trim().isLength({ max: 160 }).withMessage('Stream title cannot exceed 160 characters.'),
  body('scheduledLiveAt').optional({ nullable: true }).isISO8601().withMessage('Scheduled live time is invalid.').toDate(),
  body('isEnabled').optional().isBoolean().withMessage('Enabled must be true or false.').toBoolean(),
  rejectUnknown(['sourceUrl', 'title', 'scheduledLiveAt', 'isEnabled']),
];
export const streamStatusValidator = [matchId, body('isEnabled').isBoolean().withMessage('Enabled must be true or false.').toBoolean(), rejectUnknown(['isEnabled'])];
