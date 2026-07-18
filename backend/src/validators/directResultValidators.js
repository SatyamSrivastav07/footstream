import { body, param } from 'express-validator';

const minuteValidator = (path) => [
  body(`${path}.minute`).optional({ nullable: true, checkFalsy: true }).isInt({ min: 0, max: 150 }).withMessage('Minute must be 0 to 150.').toInt(),
  body(`${path}.stoppageMinute`).optional({ nullable: true, checkFalsy: true }).isInt({ min: 0, max: 30 }).withMessage('Stoppage minute must be 0 to 30.').toInt(),
  body(`${path}.period`).optional({ checkFalsy: true }).isIn(['first_half', 'second_half', 'extra_time_first', 'extra_time_second', 'penalties']).withMessage('Select a valid match period.'),
  body(`${path}.description`).optional().isString().trim().isLength({ max: 500 }).withMessage('Description cannot exceed 500 characters.'),
];

const cardValidator = (path) => [
  body(`${path}.*.side`).optional().isIn(['team', 'opponent']).withMessage('Card side must be team or opponent.'),
  body(`${path}.*.playerId`).optional({ nullable: true, checkFalsy: true }).isMongoId().withMessage('Selected card player is invalid.'),
  body(`${path}.*.temporaryOpponentPlayerName`).optional().isString().trim().isLength({ max: 100 }).withMessage('Opponent player name is too long.'),
  ...minuteValidator(`${path}.*`),
];

const allowed = [
  'finalTeamScore', 'finalOpponentScore', 'homeGoals', 'awayGoals', 'goals', 'yellowCards', 'redCards',
  'substitutions', 'manOfTheMatchPlayerId', 'completionNotes', 'attendance', 'matchDuration', 'refereeName', 'venueNotes',
];

export const directResultValidator = [
  param('matchId').isMongoId().withMessage('Invalid match identifier.'),
  body().custom((value) => {
    const unknown = Object.keys(value || {}).filter((key) => !allowed.includes(key));
    if (unknown.length) throw new Error(`Unsupported direct result fields: ${unknown.join(', ')}.`);
    return true;
  }),
  body('finalTeamScore').optional().isInt({ min: 0, max: 99 }).withMessage('Team score must be 0 or more.').toInt(),
  body('finalOpponentScore').optional().isInt({ min: 0, max: 99 }).withMessage('Opponent score must be 0 or more.').toInt(),
  body('homeGoals').optional().isInt({ min: 0, max: 99 }).withMessage('Home goals must be 0 or more.').toInt(),
  body('awayGoals').optional().isInt({ min: 0, max: 99 }).withMessage('Away goals must be 0 or more.').toInt(),
  body('goals').optional().isArray({ max: 40 }).withMessage('Goals must be an array.'),
  body('goals.*.side').optional({ checkFalsy: true }).isIn(['team', 'opponent']).withMessage('Goal side must be team or opponent.'),
  body('goals.*.scoringSide').optional({ checkFalsy: true }).isIn(['team', 'opponent']).withMessage('Goal side must be team or opponent.'),
  body('goals.*.playerId').optional({ nullable: true, checkFalsy: true }).isMongoId().withMessage('Selected goal scorer is invalid.'),
  body('goals.*.assistPlayerId').optional({ nullable: true, checkFalsy: true }).isMongoId().withMessage('Selected assist player is invalid.'),
  body('goals.*.temporaryOpponentPlayerName').optional().isString().trim().isLength({ max: 100 }).withMessage('Opponent scorer name is too long.'),
  ...minuteValidator('goals.*'),
  body('yellowCards').optional().isArray({ max: 40 }).withMessage('Yellow cards must be an array.'),
  ...cardValidator('yellowCards'),
  body('redCards').optional().isArray({ max: 20 }).withMessage('Red cards must be an array.'),
  ...cardValidator('redCards'),
  body('substitutions').optional().isArray({ max: 30 }).withMessage('Substitutions must be an array.'),
  body('substitutions.*.playerInId').optional({ nullable: true, checkFalsy: true }).isMongoId().withMessage('Incoming player is invalid.'),
  body('substitutions.*.playerOutId').optional({ nullable: true, checkFalsy: true }).isMongoId().withMessage('Outgoing player is invalid.'),
  ...minuteValidator('substitutions.*'),
  body('manOfTheMatchPlayerId').optional({ nullable: true, checkFalsy: true }).isMongoId().withMessage('Invalid Man of the Match player.'),
  body('completionNotes').optional().isString().trim().isLength({ max: 2000 }).withMessage('Match notes cannot exceed 2000 characters.'),
  body('attendance').optional({ nullable: true, checkFalsy: true }).isInt({ min: 0 }).withMessage('Attendance must be a non-negative integer.').toInt(),
  body('matchDuration').optional({ nullable: true, checkFalsy: true }).isInt({ min: 1, max: 300 }).withMessage('Match duration must be 1 to 300 minutes.').toInt(),
  body('refereeName').optional().isString().trim().isLength({ max: 120 }).withMessage('Referee name cannot exceed 120 characters.'),
  body('venueNotes').optional().isString().trim().isLength({ max: 1000 }).withMessage('Venue notes cannot exceed 1000 characters.'),
];

export const directResultIdValidator = [param('matchId').isMongoId().withMessage('Invalid match identifier.')];
