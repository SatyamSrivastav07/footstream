import { body, param, query } from 'express-validator';
import { PHOTO_CATEGORIES } from '../models/MatchPhoto.js';

export const resultIdValidator = [param('matchId').isMongoId().withMessage('Invalid match identifier.')];
export const updateResultValidator = [...resultIdValidator,
  body('manOfTheMatchPlayerId').optional({ nullable: true }).isMongoId().withMessage('Invalid Man of the Match player.'),
  body('completionNotes').optional().isString().trim().isLength({ max: 2000 }).withMessage('Completion notes cannot exceed 2000 characters.'),
  body('attendance').optional({ nullable: true }).isInt({ min: 0 }).withMessage('Attendance must be a non-negative integer.').toInt(),
];
export const photoUploadValidator = [...resultIdValidator, body('caption').optional().isString().trim().isLength({ max: 500 }), body('category').optional().isIn(PHOTO_CATEGORIES)];
export const photoMutationValidator = [...resultIdValidator, param('photoId').isMongoId().withMessage('Invalid photo identifier.'), body('caption').optional().isString().trim().isLength({ max: 500 }), body('category').optional().isIn(PHOTO_CATEGORIES), body().custom((value) => { const unknown = Object.keys(value || {}).filter((key) => !['caption', 'category'].includes(key)); if (unknown.length) throw new Error('Only caption and category can be edited.'); return true; })];
export const teamStatsValidator = [param('teamId').optional().isMongoId(), query('type').optional().isIn(['goals', 'assists', 'appearances', 'motm']), query('limit').optional().isInt({ min: 1, max: 50 }).toInt(), query('from').optional().isISO8601(), query('to').optional().isISO8601(), query('opponent').optional().isString().trim().isLength({ max: 120 }), query('tournament').optional().isString().trim().isLength({ max: 160 }), query('outcome').optional().isIn(['win', 'draw', 'loss'])];
export const playerStatsValidator = [param('playerId').isMongoId().withMessage('Invalid player identifier.')];
