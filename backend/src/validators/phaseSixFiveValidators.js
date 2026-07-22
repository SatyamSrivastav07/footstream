import { body, param, query } from 'express-validator';
import { TEAM_GALLERY_CATEGORIES } from '../models/TeamGalleryPost.js';

const objectId = (field) => param(field).isMongoId().withMessage(`${field} must be a valid id.`);
const optionalUrl = (field) => body(field).optional({ checkFalsy: true }).isURL({ require_protocol: true, protocols: ['http', 'https'] }).withMessage(`${field} must be a valid HTTP or HTTPS URL.`);
const optionalJsonList = (field, label) => body(field).optional({ checkFalsy: true }).custom((value) => {
  if (Array.isArray(value)) return true;
  if (typeof value !== 'string') throw new Error(`${label} must be a list.`);
  try {
    const parsed = JSON.parse(value);
    if (!Array.isArray(parsed)) throw new Error();
  } catch {
    const lines = value.split('\n').map((item) => item.trim()).filter(Boolean);
    if (!lines.length) throw new Error();
  }
  return true;
}).withMessage(`${label} must be a valid list.`);

export const whatsappSettingValidator = [
  body('url').optional({ checkFalsy: true }).trim().isURL({ require_protocol: true, protocols: ['http', 'https'] }).withMessage('Enter a valid WhatsApp community link.'),
  body('enabled').optional().isBoolean().withMessage('Enabled must be true or false.'),
];

export const activityListValidator = [
  query('page').optional().isInt({ min: 1 }).withMessage('Page must be positive.'),
  query('limit').optional().isInt({ min: 1, max: 50 }).withMessage('Limit must be between 1 and 50.'),
];

export const galleryListValidator = [
  query('page').optional().isInt({ min: 1 }),
  query('limit').optional().isInt({ min: 1, max: 30 }),
  query('category').optional({ checkFalsy: true }).isIn(TEAM_GALLERY_CATEGORIES).withMessage('Choose a valid gallery category.'),
];

export const galleryPostValidator = [
  body('caption').optional({ checkFalsy: true }).trim().isLength({ max: 1000 }).withMessage('Caption is too long.'),
  body('category').optional().isIn(TEAM_GALLERY_CATEGORIES).withMessage('Choose a valid gallery category.'),
];

export const galleryPostParamsValidator = [objectId('postId')];

export const achievementValidator = [
  body('tournamentName').trim().isLength({ min: 2, max: 160 }).withMessage('Tournament name must be 2 to 160 characters.'),
  body('position').trim().isLength({ min: 1, max: 80 }).withMessage('Position is required.'),
  body('year').isInt({ min: 1800, max: new Date().getFullYear() + 1 }).withMessage('Enter a valid achievement year.'),
  body('category').optional({ checkFalsy: true }).isIn(['inter_college', 'intra_college']).withMessage('Choose Inter College or Intra College.'),
  body('description').optional({ checkFalsy: true }).trim().isLength({ max: 1200 }).withMessage('Description is too long.'),
  optionalJsonList('trophyImages', 'Trophy image URLs'),
  optionalJsonList('celebrationPhotos', 'Celebration photo URLs'),
  optionalJsonList('winningSquadRegisteredPlayers', 'Registered winning squad'),
  optionalJsonList('registeredPlayerIds', 'Registered winning squad'),
  optionalJsonList('winningSquadManualPlayers', 'Manual winning squad'),
  optionalJsonList('manualPlayers', 'Manual winning squad'),
  optionalUrl('certificateUrl'),
  optionalUrl('matchReportLink'),
];

export const updateAchievementValidator = [
  body('tournamentName').optional().trim().isLength({ min: 2, max: 160 }),
  body('position').optional().trim().isLength({ min: 1, max: 80 }),
  body('year').optional().isInt({ min: 1800, max: new Date().getFullYear() + 1 }),
  body('category').optional({ checkFalsy: true }).isIn(['inter_college', 'intra_college']).withMessage('Choose Inter College or Intra College.'),
  body('description').optional({ checkFalsy: true }).trim().isLength({ max: 1200 }),
  optionalJsonList('trophyImages', 'Trophy image URLs'),
  optionalJsonList('celebrationPhotos', 'Celebration photo URLs'),
  optionalJsonList('winningSquadRegisteredPlayers', 'Registered winning squad'),
  optionalJsonList('registeredPlayerIds', 'Registered winning squad'),
  optionalJsonList('winningSquadManualPlayers', 'Manual winning squad'),
  optionalJsonList('manualPlayers', 'Manual winning squad'),
  optionalUrl('certificateUrl'),
  optionalUrl('matchReportLink'),
];

export const achievementParamsValidator = [objectId('achievementId')];

export const matchCollaborationValidator = [
  objectId('matchId'),
  body('message').optional({ checkFalsy: true }).trim().isLength({ max: 1000 }).withMessage('Message is too long.'),
  body('reason').optional({ checkFalsy: true }).trim().isLength({ max: 1000 }).withMessage('Reason is too long.'),
];

export const collaborationIdValidator = [objectId('collaborationId')];

export const teamProfileUpdateValidator = [
  body('motto').optional({ checkFalsy: true }).trim().isLength({ max: 240 }).withMessage('Motto is too long.'),
  body('description').optional({ checkFalsy: true }).trim().isLength({ max: 1000 }).withMessage('Description is too long.'),
  body('coach').optional({ checkFalsy: true }).trim().isLength({ max: 100 }),
  body('homeGround').optional({ checkFalsy: true }).trim().isLength({ max: 160 }),
  body('city').optional({ checkFalsy: true }).trim().isLength({ max: 100 }),
  body('location').optional({ checkFalsy: true }).trim().isLength({ max: 160 }),
  optionalUrl('website'),
  optionalUrl('instagram'),
  optionalUrl('facebook'),
  optionalUrl('youtube'),
];
