import { body, param, query } from 'express-validator';
import { MATCH_FORMATIONS, MATCH_STATUSES, MATCH_TYPES, TEAM_SIDES } from '../models/Match.js';

const editable = [
  'opponent', 'tournament', 'venue', 'matchType', 'teamSide', 'scheduledAt', 'formation',
  'customFormation', 'startingPlayerIds', 'substitutePlayerIds', 'notes',
];

const rejectUnknown = (allowed) => body().custom((value) => {
  const unknown = Object.keys(value).filter((key) => !allowed.includes(key));
  if (unknown.length) throw new Error(`Unsupported match fields: ${unknown.join(', ')}.`);
  return true;
});

const temporaryPlayers = () => [
  body('opponent.temporaryPlayers').optional().isArray({ max: 30 }).withMessage('Temporary opponent players must be an array of at most 30.'),
  body('opponent.temporaryPlayers.*.name').isString().withMessage('Temporary player name must be text.').trim().isLength({ min: 2, max: 100 }).withMessage('Temporary player name must be 2 to 100 characters.'),
  body('opponent.temporaryPlayers.*.position').optional({ checkFalsy: true }).isString().withMessage('Temporary position must be text.').trim().isLength({ max: 40 }).withMessage('Temporary position is too long.'),
  body('opponent.temporaryPlayers.*.jerseyNumber').optional({ nullable: true }).isInt({ min: 1, max: 99 }).withMessage('Temporary jersey number must be 1 to 99.').toInt(),
];

const matchFields = (required) => [
  required
    ? body('opponent').isObject().withMessage('Opponent details are required.')
    : body('opponent').optional().isObject().withMessage('Opponent must be an object.'),
  required
    ? body('opponent.name').isString().withMessage('Opponent name must be text.').trim().isLength({ min: 2, max: 120 }).withMessage('Opponent name must be 2 to 120 characters.')
    : body('opponent.name').optional().isString().withMessage('Opponent name must be text.').trim().isLength({ min: 2, max: 120 }).withMessage('Opponent name must be 2 to 120 characters.'),
  body('opponent').optional().custom((value) => {
    const unknown = Object.keys(value).filter((key) => !['name', 'temporaryPlayers'].includes(key));
    if (unknown.length) throw new Error(`Unsupported opponent fields: ${unknown.join(', ')}.`);
    return true;
  }),
  ...temporaryPlayers(),
  body('tournament').optional().isString().withMessage('Tournament must be text.').trim().isLength({ max: 160 }).withMessage('Tournament is too long.'),
  required
    ? body('venue').isString().withMessage('Venue must be text.').trim().isLength({ min: 2, max: 200 }).withMessage('Venue must be 2 to 200 characters.')
    : body('venue').optional().isString().withMessage('Venue must be text.').trim().isLength({ min: 2, max: 200 }).withMessage('Venue must be 2 to 200 characters.'),
  required ? body('matchType').isIn(MATCH_TYPES).withMessage('Select a valid match type.') : body('matchType').optional().isIn(MATCH_TYPES).withMessage('Select a valid match type.'),
  required ? body('teamSide').isIn(TEAM_SIDES).withMessage('Select home or away.') : body('teamSide').optional().isIn(TEAM_SIDES).withMessage('Select home or away.'),
  required ? body('scheduledAt').isISO8601().withMessage('Enter a valid scheduled date and time.') : body('scheduledAt').optional().isISO8601().withMessage('Enter a valid scheduled date and time.'),
  body('formation').optional({ nullable: true }).isIn([...MATCH_FORMATIONS, null]).withMessage('Select a valid formation.'),
  body('customFormation').optional().isString().withMessage('Custom formation must be text.').trim().isLength({ max: 60 }).withMessage('Custom formation is too long.'),
  required
    ? body('startingPlayerIds').isArray({ min: 11, max: 11 }).withMessage('Select exactly 11 starting players.')
    : body('startingPlayerIds').optional().isArray({ min: 1, max: 11 }).withMessage('Select a valid starting lineup.'),
  body('startingPlayerIds.*').isMongoId().withMessage('Starting XI contains an invalid player.'),
  body('substitutePlayerIds').optional().isArray({ max: 30 }).withMessage('Substitutes must be an array of at most 30 players.'),
  body('substitutePlayerIds.*').isMongoId().withMessage('Substitutes contain an invalid player.'),
  body('notes').optional().isString().withMessage('Notes must be text.').trim().isLength({ max: 2000 }).withMessage('Notes cannot exceed 2000 characters.'),
  body().custom((value) => {
    if (value.formation === 'custom' && !value.customFormation?.trim()) throw new Error('Custom formation is required.');
    if (value.formation && value.formation !== 'custom' && value.customFormation?.trim()) throw new Error('Custom formation is only allowed with custom formation.');
    return true;
  }),
];

export const matchIdValidator = [param('matchId').isMongoId().withMessage('Invalid match identifier.')];
export const createMatchValidator = [...matchFields(true), rejectUnknown(editable)];
export const updateMatchValidator = [
  ...matchIdValidator,
  ...matchFields(false),
  body().custom((value) => {
    if (!editable.some((field) => Object.hasOwn(value, field))) throw new Error('Provide at least one match field to update.');
    return true;
  }),
  rejectUnknown(editable),
];

const listFilters = [
  query('status').optional().isIn(MATCH_STATUSES).withMessage('Select a valid status filter.'),
  query('matchType').optional().isIn(MATCH_TYPES).withMessage('Select a valid match type filter.'),
  query('from').optional().isISO8601().withMessage('From date is invalid.'),
  query('to').optional().isISO8601().withMessage('To date is invalid.'),
  query('search').optional().isString().withMessage('Search must be text.').trim().isLength({ max: 120 }).withMessage('Search is too long.'),
];

export const listMatchesValidator = listFilters;
export const adminListMatchesValidator = [
  query('teamId').optional().isMongoId().withMessage('Team filter is invalid.'),
  ...listFilters,
];
