import { body, param, query } from 'express-validator';
import { TOURNAMENT_LINEUP_STATUS } from '../constants/tournamentConstants.js';

export const lineupIdParam = param('lineupId').isMongoId().withMessage('Invalid lineup identifier.');
export const tournamentIdParam = param('tournamentId').isMongoId().withMessage('Invalid tournament identifier.');
const participantField = (field) => body(field).isMongoId().withMessage(`${field} must be a valid participant identifier.`);

export const lineupListValidator = [
  tournamentIdParam,
  query('page').optional().isInt({ min: 1 }).withMessage('Page must be positive.').toInt(),
  query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100.').toInt(),
];

export const createLineupValidator = [
  tournamentIdParam,
  body('provisionalFixtureKey').isString().trim().isLength({ min: 3, max: 160 }).withMessage('Lineup reference must be 3-160 characters.'),
  participantField('homeParticipant'),
  participantField('awayParticipant'),
];

export const lineupParamsValidator = [tournamentIdParam, lineupIdParam];

export const updateLineupValidator = [
  ...lineupParamsValidator,
  body('provisionalFixtureKey').optional().isString().trim().isLength({ min: 3, max: 160 }).withMessage('Lineup reference must be 3-160 characters.'),
  body('homeParticipant').optional().isMongoId().withMessage('Home participant must be valid.'),
  body('awayParticipant').optional().isMongoId().withMessage('Away participant must be valid.'),
  body('status').optional().isIn(Object.values(TOURNAMENT_LINEUP_STATUS)).withMessage('Lineup status is invalid.').custom(() => {
    throw new Error('Status changes must use submit, lock, or unlock endpoints.');
  }),
];

export const updateLineupSideValidator = [
  ...lineupParamsValidator,
  body('action').isIn(['formation', 'addStarter', 'addSubstitute', 'removePlayer', 'setCaptain', 'setGoalkeeper', 'assignSlot', 'clearSlot']).withMessage('Lineup action is invalid.'),
  body('squadPlayerId').if(body('action').isIn(['addStarter', 'addSubstitute', 'removePlayer', 'setCaptain', 'setGoalkeeper', 'assignSlot', 'clearSlot'])).isMongoId().withMessage('Squad player is required.'),
  body('slotId').if(body('action').equals('assignSlot')).isString().trim().matches(/^(GK|L\d-P\d)$/).withMessage('Pitch slot is invalid.'),
  body('formation').if(body('action').equals('formation')).isString().trim().isLength({ min: 1, max: 40 }).withMessage('Formation is required.'),
  body('customFormation').optional({ checkFalsy: true }).isString().trim().isLength({ max: 80 }).withMessage('Custom formation is too long.'),
];
