import { body, param, query } from 'express-validator';
import {
  ACADEMIC_YEARS,
  AVAILABILITY_STATUSES,
  PLAYER_POSITIONS,
  PREFERRED_FEET,
} from '../models/Player.js';

const nullableInteger = (field, min, max) =>
  body(field)
    .optional({ nullable: true })
    .customSanitizer((value) => (value === '' ? null : value))
    .isInt({ min, max })
    .withMessage(`${field === 'jerseyNumber' ? 'Jersey number' : 'Age'} must be between ${min} and ${max}.`)
    .toInt();

const optionalEnum = (field, values, label) =>
  body(field)
    .optional({ nullable: true })
    .customSanitizer((value) => (value === '' ? null : value))
    .isIn([...values, null])
    .withMessage(`Select a valid ${label}.`);

const rejectUnknownFields = (allowed) => body().custom((value) => {
  const unknown = Object.keys(value).filter((field) => !allowed.includes(field));
  if (unknown.length > 0) throw new Error(`Unsupported player fields: ${unknown.join(', ')}.`);
  return true;
});

const editableFields = [
  'name', 'position', 'jerseyNumber', 'age', 'academicYear', 'preferredFoot',
  'availabilityStatus', 'isCaptain', 'isViceCaptain',
];

const playerFields = (required) => [
  required
    ? body('name').trim().isLength({ min: 2, max: 100 }).withMessage('Name must be 2 to 100 characters.')
    : body('name').optional().trim().isLength({ min: 2, max: 100 }).withMessage('Name must be 2 to 100 characters.'),
  required
    ? body('position').isIn(PLAYER_POSITIONS).withMessage('Select a valid position.')
    : body('position').optional().isIn(PLAYER_POSITIONS).withMessage('Select a valid position.'),
  nullableInteger('jerseyNumber', 1, 99),
  nullableInteger('age', 14, 60),
  optionalEnum('academicYear', ACADEMIC_YEARS, 'academic year'),
  optionalEnum('preferredFoot', PREFERRED_FEET, 'preferred foot'),
  body('availabilityStatus').optional().isIn(AVAILABILITY_STATUSES).withMessage('Select a valid availability status.'),
  body('isCaptain').optional().isBoolean().withMessage('Captain must be true or false.').toBoolean(),
  body('isViceCaptain').optional().isBoolean().withMessage('Vice-captain must be true or false.').toBoolean(),
  body().custom((value) => {
    if (value.isCaptain && value.isViceCaptain) throw new Error('A player cannot hold both leadership roles.');
    return true;
  }),
];

export const playerIdValidator = [param('playerId').isMongoId().withMessage('Invalid player identifier.')];
export const teamIdValidator = [param('teamId').isMongoId().withMessage('Invalid team identifier.')];

export const listPlayersValidator = [
  query('search').optional().trim().isLength({ max: 100 }).withMessage('Search is too long.'),
  query('position').optional().isIn(PLAYER_POSITIONS).withMessage('Select a valid position filter.'),
  query('availabilityStatus').optional().isIn(AVAILABILITY_STATUSES).withMessage('Select a valid availability filter.'),
  query('isActive').optional().isBoolean().withMessage('isActive must be true or false.').toBoolean(),
];

export const createPlayerValidator = [...playerFields(true), rejectUnknownFields(editableFields)];

export const updatePlayerValidator = [
  ...playerIdValidator,
  ...playerFields(false),
  body().custom((value) => {
    if (!editableFields.some((field) => Object.hasOwn(value, field))) throw new Error('Provide at least one player field to update.');
    return true;
  }),
  rejectUnknownFields(editableFields),
];

export const updatePlayerStatusValidator = [
  ...playerIdValidator,
  body('availabilityStatus').optional().isIn(AVAILABILITY_STATUSES).withMessage('Select a valid availability status.'),
  body('isActive').optional().isBoolean().withMessage('isActive must be true or false.').toBoolean(),
  body().custom((value) => {
    if (!Object.hasOwn(value, 'availabilityStatus') && !Object.hasOwn(value, 'isActive')) {
      throw new Error('Provide availabilityStatus or isActive.');
    }
    return true;
  }),
  rejectUnknownFields(['availabilityStatus', 'isActive']),
];
