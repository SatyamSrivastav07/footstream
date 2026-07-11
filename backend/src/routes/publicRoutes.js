import { Router } from 'express';
import { getPublicEvents, getPublicLiveState } from '../controllers/liveMatchController.js';
import { validateWithStatus } from '../middleware/validate.js';
import { liveMatchIdValidator } from '../validators/liveMatchValidators.js';
import { getAnyPhotos, getAnyResult, getPlayerStats, getTeamHistory, getTeamLeaderboards, getTeamStatistics } from '../controllers/phaseFiveController.js';
import { playerStatsValidator, resultIdValidator, teamStatsValidator } from '../validators/phaseFiveValidators.js';

const router = Router();
const validate = validateWithStatus(400);
router.get('/matches/:matchId/live', liveMatchIdValidator, validate, getPublicLiveState);
router.get('/matches/:matchId/events', liveMatchIdValidator, validate, getPublicEvents);
router.get('/matches/:matchId/result', resultIdValidator, validate, getAnyResult);
router.get('/matches/:matchId/photos', resultIdValidator, validate, getAnyPhotos);
router.get('/teams/:teamId/statistics', teamStatsValidator, validate, getTeamStatistics);
router.get('/teams/:teamId/leaderboards', teamStatsValidator, validate, getTeamLeaderboards);
router.get('/teams/:teamId/history', teamStatsValidator, validate, getTeamHistory);
router.get('/players/:playerId/statistics', playerStatsValidator, validate, getPlayerStats);
export default router;

