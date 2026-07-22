import { body, param, query } from 'express-validator';
import {
  TOURNAMENT_APPROVAL_STATUS,
  TOURNAMENT_COMPETITION_FORMAT,
  TOURNAMENT_LIFECYCLE_STATUS,
  TOURNAMENT_MATCH_FORMAT_LABEL,
  TOURNAMENT_SCOPE,
  TOURNAMENT_VISIBILITY,
} from '../constants/tournamentConstants.js';

const protectedFields = ['hostTeam', 'organizerTeam', 'createdBy', 'updatedBy', 'reviewedBy', 'approvalStatus', 'lifecycleStatus', 'isPublished', 'publishedAt', 'isArchived', 'archivedAt', 'publicId', 'actorUser', 'internal', 'metadata'];
const createAllowed = [
  'name', 'shortName', 'slug', 'seriesName', 'seriesSlug', 'seasonLabel', 'editionNumber', 'description',
  'scope', 'competitionFormat', 'matchFormat', 'primaryColor', 'secondaryColor', 'country', 'state', 'city',
  'primaryVenue', 'additionalVenues', 'registrationOpen', 'registrationClose', 'squadLock', 'fixturePublish',
  'startDate', 'endDate', 'visibility', 'playersOnField', 'minimumSquad', 'maximumSquad', 'maximumMatchdaySquad',
  'maximumSubstitutes', 'rollingSubs', 'minimumTeams', 'maximumTeams', 'plannedTeams', 'winPoints', 'drawPoints',
  'lossPoints', 'numberOfGroups', 'teamsPerGroup', 'qualifiersPerGroup', 'groupMode', 'matchMinutes', 'halfMinutes',
  'extraTime', 'penalties', 'walkoverEnabled', 'walkoverWinnerGoals', 'walkoverLoserGoals', 'walkoverPoints',
  'awardsEnabled', 'tiebreakOrder', 'galleryEnabled', 'officialsEnabled', 'shareEnabled', 'qrEnabled',
];

const rejectProtected = (allowed = createAllowed) => body().custom((value = {}) => {
  const keys = Object.keys(value);
  const forbidden = keys.filter((field) => protectedFields.includes(field));
  if (forbidden.length) throw new Error(`Protected tournament fields are not accepted: ${forbidden.join(', ')}.`);
  const unknown = keys.filter((field) => !allowed.includes(field));
  if (unknown.length) throw new Error(`Unsupported tournament fields: ${unknown.join(', ')}.`);
  return true;
});

const optionalString = (field, max = 160) => body(field).optional({ nullable: true }).trim().isLength({ max }).withMessage(`${field} is too long.`);
const optionalInt = (field, min, max = 10000) => body(field).optional({ nullable: true }).isInt({ min, max }).withMessage(`${field} is invalid.`).toInt();
const optionalBool = (field) => body(field).optional({ nullable: true }).isBoolean().withMessage(`${field} must be true or false.`).toBoolean();
const optionalDate = (field) => body(field).optional({ nullable: true, checkFalsy: true }).isISO8601().withMessage(`${field} must be a valid date.`).toDate();

export const tournamentIdValidator = [param('tournamentId').isMongoId().withMessage('Invalid tournament identifier.')];
export const tournamentFixtureIdValidator = [
  ...tournamentIdValidator,
  param('lineupId').isMongoId().withMessage('Invalid tournament fixture identifier.'),
];

export const tournamentBodyValidator = [
  rejectProtected(),
  body('name').optional().trim().isLength({ min: 2, max: 160 }).withMessage('Tournament name must be 2 to 160 characters.'),
  optionalString('shortName', 32),
  body('slug').optional().trim().matches(/^[a-z0-9]+(?:-[a-z0-9]+)*$/).withMessage('Slug must be lowercase kebab-case.'),
  optionalString('seriesName', 160),
  body('seriesSlug').optional({ checkFalsy: true }).trim().matches(/^[a-z0-9]+(?:-[a-z0-9]+)*$/).withMessage('Series slug must be lowercase kebab-case.'),
  optionalString('seasonLabel', 80),
  optionalInt('editionNumber', 1, 1000),
  optionalString('description', 4000),
  body('scope').optional().isIn(Object.values(TOURNAMENT_SCOPE)).withMessage('Invalid tournament scope.'),
  body('competitionFormat').optional().isIn(Object.values(TOURNAMENT_COMPETITION_FORMAT)).withMessage('Invalid competition format.'),
  body('matchFormat').optional().isIn(Object.values(TOURNAMENT_MATCH_FORMAT_LABEL)).withMessage('Invalid match format.'),
  body('visibility').optional().isIn(Object.values(TOURNAMENT_VISIBILITY)).withMessage('Invalid visibility.'),
  body('primaryColor').optional().trim().matches(/^#(?:[0-9a-fA-F]{3}){1,2}$/).withMessage('Primary color must be a hex color.'),
  body('secondaryColor').optional().trim().matches(/^#(?:[0-9a-fA-F]{3}){1,2}$/).withMessage('Secondary color must be a hex color.'),
  optionalString('country', 100),
  optionalString('state', 100),
  optionalString('city', 100),
  optionalString('primaryVenue', 180),
  optionalDate('registrationOpen'),
  optionalDate('registrationClose'),
  optionalDate('squadLock'),
  optionalDate('fixturePublish'),
  optionalDate('startDate'),
  optionalDate('endDate'),
  optionalInt('playersOnField', 3, 11),
  optionalInt('minimumSquad', 1, 100),
  optionalInt('maximumSquad', 1, 100),
  optionalInt('maximumMatchdaySquad', 1, 100),
  optionalInt('maximumSubstitutes', 0, 99),
  optionalInt('minimumTeams', 2, 512),
  optionalInt('maximumTeams', 2, 512),
  optionalInt('plannedTeams', 2, 512),
  optionalInt('winPoints', 0, 20),
  optionalInt('drawPoints', 0, 20),
  optionalInt('lossPoints', 0, 20),
  optionalInt('numberOfGroups', 0, 128),
  optionalInt('teamsPerGroup', 0, 128),
  optionalInt('qualifiersPerGroup', 0, 128),
  optionalInt('matchMinutes', 1, 150),
  optionalInt('halfMinutes', 1, 75),
  optionalBool('rollingSubs'),
  optionalBool('extraTime'),
  optionalBool('penalties'),
  optionalBool('walkoverEnabled'),
  optionalInt('walkoverWinnerGoals', 0, 99),
  optionalInt('walkoverLoserGoals', 0, 99),
  optionalInt('walkoverPoints', 0, 20),
  optionalBool('galleryEnabled'),
  optionalBool('officialsEnabled'),
  optionalBool('shareEnabled'),
  optionalBool('qrEnabled'),
  body('awardsEnabled').optional().isArray({ max: 30 }).withMessage('Awards must be an array.'),
  body('tiebreakOrder').optional().isArray({ max: 20 }).withMessage('Tiebreak order must be an array.'),
];

export const createTournamentValidator = [
  ...tournamentBodyValidator,
  body('name').exists().withMessage('Tournament name is required.'),
  body('scope').exists().withMessage('Tournament scope is required.'),
];

export const updateTournamentValidator = [...tournamentIdValidator, ...tournamentBodyValidator];

export const tournamentListValidator = [
  query('approvalStatus').optional().isIn(Object.values(TOURNAMENT_APPROVAL_STATUS)).withMessage('Invalid approval status.'),
  query('lifecycleStatus').optional().isIn(Object.values(TOURNAMENT_LIFECYCLE_STATUS)).withMessage('Invalid lifecycle status.'),
  query('scope').optional().isIn(Object.values(TOURNAMENT_SCOPE)).withMessage('Invalid scope.'),
  query('competitionFormat').optional().isIn(Object.values(TOURNAMENT_COMPETITION_FORMAT)).withMessage('Invalid competition format.'),
  query('matchFormat').optional().isIn(Object.values(TOURNAMENT_MATCH_FORMAT_LABEL)).withMessage('Invalid match format.'),
  query('city').optional().trim().isLength({ max: 100 }).withMessage('City is too long.'),
  query('search').optional().trim().isLength({ max: 120 }).withMessage('Search is too long.'),
  query('from').optional().isISO8601().withMessage('From date is invalid.').toDate(),
  query('to').optional().isISO8601().withMessage('To date is invalid.').toDate(),
  query('past').optional().isBoolean().withMessage('Past must be true or false.'),
  query('archived').optional().isBoolean().withMessage('Archived must be true or false.'),
  query('page').optional().isInt({ min: 1 }).withMessage('Page must be positive.').toInt(),
  query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be 1 to 100.').toInt(),
];

export const reviewActionValidator = [
  ...tournamentIdValidator,
  body().custom((value = {}) => {
    const allowed = ['reason', 'message'];
    const unknown = Object.keys(value).filter((field) => !allowed.includes(field));
    if (unknown.length) throw new Error(`Unsupported review fields: ${unknown.join(', ')}.`);
    return true;
  }),
  body('reason').optional({ checkFalsy: true }).trim().isLength({ min: 5, max: 1000 }).withMessage('Reason must be 5 to 1000 characters.'),
  body('message').optional({ checkFalsy: true }).trim().isLength({ min: 5, max: 1000 }).withMessage('Message must be 5 to 1000 characters.'),
];

export const requiredReasonValidator = [
  ...tournamentIdValidator,
  body('reason').trim().isLength({ min: 5, max: 1000 }).withMessage('Reason must be 5 to 1000 characters.'),
  body().custom((value = {}) => {
    const unknown = Object.keys(value).filter((field) => !['reason'].includes(field));
    if (unknown.length) throw new Error(`Unsupported review fields: ${unknown.join(', ')}.`);
    return true;
  }),
];

export const requiredMessageValidator = [
  ...tournamentIdValidator,
  body('message').trim().isLength({ min: 5, max: 1000 }).withMessage('Message must be 5 to 1000 characters.'),
  body().custom((value = {}) => {
    const unknown = Object.keys(value).filter((field) => !['message'].includes(field));
    if (unknown.length) throw new Error(`Unsupported review fields: ${unknown.join(', ')}.`);
    return true;
  }),
];

export const publicTournamentSlugValidator = [param('slug').trim().matches(/^[a-z0-9]+(?:-[a-z0-9]+)*$/).withMessage('Invalid tournament slug.')];

export const tournamentFixtureValidator = [
  ...tournamentIdValidator,
  body().custom((value = {}) => {
    const allowed = ['homeParticipant', 'awayParticipant', 'fixtureNumber', 'scheduledAt', 'venue', 'officials', 'stage', 'round'];
    const unknown = Object.keys(value).filter((field) => !allowed.includes(field));
    if (unknown.length) throw new Error(`Unsupported fixture fields: ${unknown.join(', ')}.`);
    return true;
  }),
  body('homeParticipant').isMongoId().withMessage('Choose a valid home participant.'),
  body('awayParticipant').isMongoId().withMessage('Choose a valid away participant.'),
  body('fixtureNumber').optional({ nullable: true, checkFalsy: true }).isInt({ min: 1, max: 10000 }).withMessage('Fixture number must be positive.').toInt(),
  body('scheduledAt').optional({ nullable: true, checkFalsy: true }).isISO8601().withMessage('Kickoff must be a valid date.').toDate(),
  body('venue').optional({ nullable: true, checkFalsy: true }).trim().isLength({ max: 200 }).withMessage('Venue is too long.'),
  body('officials').optional({ nullable: true, checkFalsy: true }).trim().isLength({ max: 300 }).withMessage('Officials are too long.'),
  body('stage').optional({ nullable: true, checkFalsy: true }).trim().isLength({ max: 60 }).withMessage('Stage is too long.'),
  body('round').optional({ nullable: true, checkFalsy: true }).trim().isLength({ max: 80 }).withMessage('Round is too long.'),
];

export const tournamentFixtureGenerationValidator = [
  ...tournamentIdValidator,
  body().custom((value = {}) => {
    const allowed = ['append', 'startDate', 'intervalDays', 'venue', 'officials', 'stage', 'round'];
    const unknown = Object.keys(value).filter((field) => !allowed.includes(field));
    if (unknown.length) throw new Error(`Unsupported fixture generation fields: ${unknown.join(', ')}.`);
    return true;
  }),
  body('append').optional({ nullable: true }).isBoolean().withMessage('Append must be true or false.').toBoolean(),
  body('startDate').optional({ nullable: true, checkFalsy: true }).isISO8601().withMessage('Start date must be valid.').toDate(),
  body('intervalDays').optional({ nullable: true, checkFalsy: true }).isInt({ min: 1, max: 30 }).withMessage('Interval days must be 1 to 30.').toInt(),
  body('venue').optional({ nullable: true, checkFalsy: true }).trim().isLength({ max: 200 }).withMessage('Venue is too long.'),
  body('officials').optional({ nullable: true, checkFalsy: true }).trim().isLength({ max: 300 }).withMessage('Officials are too long.'),
  body('stage').optional({ nullable: true, checkFalsy: true }).trim().isLength({ max: 60 }).withMessage('Stage is too long.'),
  body('round').optional({ nullable: true, checkFalsy: true }).trim().isLength({ max: 80 }).withMessage('Round is too long.'),
];

export const tournamentMatchFromFixtureValidator = [
  ...tournamentFixtureIdValidator,
  body().custom((value = {}) => {
    const allowed = ['matchMode', 'scheduledAt', 'venue', 'stage', 'round'];
    const unknown = Object.keys(value).filter((field) => !allowed.includes(field));
    if (unknown.length) throw new Error(`Unsupported tournament match fields: ${unknown.join(', ')}.`);
    return true;
  }),
  body('matchMode').optional({ nullable: true, checkFalsy: true }).isIn(['stream', 'direct']).withMessage('Match mode must be stream or direct.'),
  body('scheduledAt').optional({ nullable: true, checkFalsy: true }).isISO8601().withMessage('Kickoff must be a valid date.').toDate(),
  body('venue').optional({ nullable: true, checkFalsy: true }).trim().isLength({ max: 200 }).withMessage('Venue is too long.'),
  body('stage').optional({ nullable: true, checkFalsy: true }).trim().isLength({ max: 60 }).withMessage('Stage is too long.'),
  body('round').optional({ nullable: true, checkFalsy: true }).trim().isLength({ max: 80 }).withMessage('Round is too long.'),
];
