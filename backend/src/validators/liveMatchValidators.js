import { body, param } from 'express-validator';
import { PENALTY_OUTCOMES, SCORING_SIDES } from '../models/MatchEvent.js';

export const liveMatchIdValidator = [param('matchId').isMongoId().withMessage('Invalid match identifier.')];
export const eventIdValidator = [param('eventId').isMongoId().withMessage('Invalid event identifier.')];

const common = [
  body('minute').optional().isInt({ min: 0, max: 150 }).withMessage('Minute must be from 0 to 150.').toInt(),
  body('stoppageMinute').optional({ nullable: true }).isInt({ min: 0, max: 30 }).withMessage('Stoppage minute must be from 0 to 30.').toInt(),
  body('description').optional().isString().withMessage('Description must be text.').trim().isLength({ max: 500 }).withMessage('Description is too long.'),
];

const rejectUnknown = (allowed) => body().custom((value) => {
  const unknown = Object.keys(value).filter((key) => !allowed.includes(key));
  if (unknown.length) throw new Error(`Unsupported event fields: ${unknown.join(', ')}.`);
  return true;
});

const sideActor = [
  body('scoringSide').optional().isIn(SCORING_SIDES).withMessage('Select team or opponent.'),
  body('side').optional().isIn(SCORING_SIDES).withMessage('Select team or opponent.'),
  body('playerId').optional().isMongoId().withMessage('Invalid player selection.'),
  body('temporaryOpponentPlayerName').optional().isString().withMessage('Opponent name must be text.').trim().isLength({ min: 2, max: 100 }).withMessage('Opponent name must be 2 to 100 characters.'),
];

const commonFields = ['minute', 'stoppageMinute', 'description'];
export const goalValidator = [
  ...liveMatchIdValidator, ...common, ...sideActor,
  body('scoringSide').isIn(SCORING_SIDES).withMessage('Choose the scoring side.'),
  body('assistPlayerId').optional().isMongoId().withMessage('Invalid assist player.'),
  rejectUnknown([...commonFields, 'scoringSide', 'playerId', 'assistPlayerId', 'temporaryOpponentPlayerName']),
];

export const assistValidator = [
  ...liveMatchIdValidator, ...eventIdValidator,
  body('assistPlayerId').isMongoId().withMessage('Select a valid assist player.'),
  rejectUnknown(['assistPlayerId']),
];

export const cardValidator = [
  ...liveMatchIdValidator, ...common, ...sideActor,
  body('side').isIn(SCORING_SIDES).withMessage('Choose the card side.'),
  rejectUnknown([...commonFields, 'side', 'playerId', 'temporaryOpponentPlayerName']),
];

export const substitutionValidator = [
  ...liveMatchIdValidator, ...common,
  body('playerOutId').isMongoId().withMessage('Select a valid player leaving the field.'),
  body('playerInId').isMongoId().withMessage('Select a valid player entering the field.'),
  rejectUnknown([...commonFields, 'playerOutId', 'playerInId']),
];

export const penaltyValidator = [
  ...liveMatchIdValidator, ...common, ...sideActor,
  body('scoringSide').isIn(SCORING_SIDES).withMessage('Choose the penalty side.'),
  body('outcome').isIn(PENALTY_OUTCOMES).withMessage('Choose scored, missed, or saved.'),
  rejectUnknown([...commonFields, 'scoringSide', 'playerId', 'temporaryOpponentPlayerName', 'outcome']),
];

export const ownGoalValidator = [
  ...liveMatchIdValidator, ...common,
  body('ownGoalBySide').isIn(SCORING_SIDES).withMessage('Choose the own-goal actor side.'),
  body('playerId').optional().isMongoId().withMessage('Invalid own-goal player.'),
  body('temporaryOpponentPlayerName').optional().isString().trim().isLength({ min: 2, max: 100 }).withMessage('Opponent name must be 2 to 100 characters.'),
  rejectUnknown([...commonFields, 'ownGoalBySide', 'playerId', 'temporaryOpponentPlayerName']),
];

export const undoValidator = [
  ...liveMatchIdValidator,
  body('reason').optional().isString().withMessage('Undo reason must be text.').trim().isLength({ max: 300 }).withMessage('Undo reason is too long.'),
  rejectUnknown(['reason']),
];

