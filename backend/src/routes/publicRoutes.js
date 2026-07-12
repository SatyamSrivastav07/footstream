import { Router } from 'express';
import { getPublicEvents, getPublicLiveState } from '../controllers/liveMatchController.js';
import { validateWithStatus } from '../middleware/validate.js';
import { liveMatchIdValidator } from '../validators/liveMatchValidators.js';
import { getAnyPhotos, getAnyResult, getPlayerStats, getTeamHistory, getTeamLeaderboards, getTeamStatistics } from '../controllers/phaseFiveController.js';
import { playerStatsValidator, resultIdValidator, teamStatsValidator } from '../validators/phaseFiveValidators.js';
import { readPublicStream } from '../controllers/streamController.js';
import { streamIdValidator } from '../validators/streamValidators.js';
import { publicFixtures, publicHome, publicLiveDirectory, publicMatch, publicResults } from '../controllers/publicPortalController.js';
import { publicFixturesValidator, publicLiveDirectoryValidator, publicMatchValidator, publicResultsValidator } from '../validators/publicPortalValidators.js';

const router = Router();
const validate = validateWithStatus(400);
router.get('/home', publicHome);
router.get('/live', publicLiveDirectoryValidator, validate, publicLiveDirectory);
router.get('/fixtures', publicFixturesValidator, validate, publicFixtures);
router.get('/results', publicResultsValidator, validate, publicResults);
router.get('/matches/:matchId', publicMatchValidator, validate, publicMatch);
router.get('/matches/:matchId/live', liveMatchIdValidator, validate, getPublicLiveState);
router.get('/matches/:matchId/events', liveMatchIdValidator, validate, getPublicEvents);
router.get('/matches/:matchId/stream', streamIdValidator, validate, readPublicStream);
router.get('/matches/:matchId/result', resultIdValidator, validate, getAnyResult);
router.get('/matches/:matchId/photos', resultIdValidator, validate, getAnyPhotos);
router.get('/teams/:teamId/statistics', teamStatsValidator, validate, getTeamStatistics);
router.get('/teams/:teamId/leaderboards', teamStatsValidator, validate, getTeamLeaderboards);
router.get('/teams/:teamId/history', teamStatsValidator, validate, getTeamHistory);
router.get('/players/:playerId/statistics', playerStatsValidator, validate, getPlayerStats);
export default router;

