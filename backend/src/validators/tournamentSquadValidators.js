import { body, param, query } from 'express-validator';
import { PLAYER_POSITIONS } from '../models/Player.js';

export const squadParamsValidator = [
  param('tournamentId').isMongoId().withMessage('Invalid tournament identifier.'),
  param('participantId').isMongoId().withMessage('Invalid participant identifier.'),
];

export const squadPlayerParamsValidator = [
  ...squadParamsValidator,
  param('squadPlayerId').isMongoId().withMessage('Invalid squad player identifier.'),
];

const rejectUnknown = (allowed) => body().custom((value = {}) => {
  const protectedFields = ['team', 'registeredPlayer', 'player', 'statistics', 'publicId', 'createdBy', 'updatedBy', 'email', 'phone', 'password'];
  const forbidden = Object.keys(value).filter((field) => protectedFields.includes(field) && !allowed.includes(field));
  if (forbidden.length) throw new Error(`Protected squad-player fields are not accepted: ${forbidden.join(', ')}.`);
  const unknown = Object.keys(value).filter((field) => !allowed.includes(field));
  if (unknown.length) throw new Error(`Unsupported squad fields: ${unknown.join(', ')}.`);
  return true;
});

export const squadListValidator = [
  param('tournamentId').isMongoId().withMessage('Invalid tournament identifier.'),
];

export const eligiblePlayersValidator = [
  ...squadParamsValidator,
  query('search').optional().trim().isLength({ max: 120 }).withMessage('Search is too long.'),
];

export const registeredSquadPlayerValidator = [
  ...squadParamsValidator,
  rejectUnknown(['playerId', 'jersey', 'isGoalkeeper']),
  body('playerId').isMongoId().withMessage('Player is required.'),
  body('jersey').optional({ nullable: true, checkFalsy: true }).isInt({ min: 1, max: 99 }).withMessage('Jersey must be 1 to 99.').toInt(),
  body('isGoalkeeper').optional().isBoolean().withMessage('Goalkeeper must be true or false.').toBoolean(),
];

export const manualSquadPlayerValidator = [
  ...squadParamsValidator,
  rejectUnknown(['name', 'position', 'jersey', 'photoUrl', 'isGoalkeeper', 'isCaptain', 'isViceCaptain']),
  body('name').trim().isLength({ min: 2, max: 100 }).withMessage('Player name must be 2 to 100 characters.').not().matches(/[<>]/).withMessage('Player name cannot contain HTML.'),
  body('position').isIn(PLAYER_POSITIONS).withMessage('Invalid player position.'),
  body('jersey').optional({ nullable: true, checkFalsy: true }).isInt({ min: 1, max: 99 }).withMessage('Jersey must be 1 to 99.').toInt(),
  body('photoUrl').optional({ checkFalsy: true }).isURL({ protocols: ['http', 'https'] }).withMessage('Photo URL must be HTTP or HTTPS.'),
  body('isGoalkeeper').optional().isBoolean().withMessage('Goalkeeper must be true or false.').toBoolean(),
];

export const updateSquadPlayerValidator = [
  ...squadPlayerParamsValidator,
  rejectUnknown(['name', 'position', 'jersey', 'goalkeeper']),
  body('name').optional().trim().isLength({ min: 2, max: 100 }).withMessage('Player name must be 2 to 100 characters.').not().matches(/[<>]/).withMessage('Player name cannot contain HTML.'),
  body('position').optional().isIn(PLAYER_POSITIONS).withMessage('Invalid player position.'),
  body('jersey').optional({ nullable: true, checkFalsy: true }).isInt({ min: 1, max: 99 }).withMessage('Jersey must be 1 to 99.').toInt(),
  body('goalkeeper').optional().isBoolean().withMessage('Goalkeeper must be true or false.').toBoolean(),
];

export const squadCaptainValidator = [
  ...squadParamsValidator,
  rejectUnknown(['squadPlayerId']),
  body('squadPlayerId').isMongoId().withMessage('Squad player is required.'),
];

export const publicTournamentSquadValidator = [
  param('slug').trim().matches(/^[a-z0-9]+(?:-[a-z0-9]+)*$/).withMessage('Invalid tournament slug.'),
  param('participantSlug').trim().matches(/^[a-z0-9]+(?:-[a-z0-9]+)*$/).withMessage('Invalid participant slug.'),
];
