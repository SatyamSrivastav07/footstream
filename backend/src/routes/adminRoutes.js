import { Router } from 'express';
import {
  createTeam,
  createTeamAdmin,
  getTeamAdmins,
  getTeams,
  setTeamAdminStatus,
} from '../controllers/adminController.js';
import { listPlayersForAdmin } from '../controllers/playerController.js';
import { protect, requireRole } from '../middleware/auth.js';
import validate from '../middleware/validate.js';
import { USER_ROLES } from '../models/User.js';
import {
  createTeamAdminValidator,
  createTeamValidator,
  statusValidator,
} from '../validators/adminValidators.js';
import { teamIdValidator } from '../validators/playerValidators.js';
import { getAdminMatch, listAdminMatches } from '../controllers/matchController.js';
import { validateWithStatus } from '../middleware/validate.js';
import { adminListMatchesValidator, matchIdValidator } from '../validators/matchValidators.js';
import { getAdminEvents, getAdminLiveState } from '../controllers/liveMatchController.js';
import { getAdminPlayerStats, getAnyPhotos, getAnyResult, getTeamHistory, getTeamLeaderboards, getTeamStatistics } from '../controllers/phaseFiveController.js';
import { playerStatsValidator, resultIdValidator, teamStatsValidator } from '../validators/phaseFiveValidators.js';

const router = Router();

router.use(protect, requireRole(USER_ROLES.SUPER_ADMIN));
router.route('/teams').get(getTeams).post(createTeamValidator, validate, createTeam);
router.get('/teams/:teamId/players', teamIdValidator, validate, listPlayersForAdmin);
router.route('/team-admins').get(getTeamAdmins).post(createTeamAdminValidator, validate, createTeamAdmin);
router.patch('/team-admins/:userId/status', statusValidator, validate, setTeamAdminStatus);
const validateMatch = validateWithStatus(400);
router.get('/matches', adminListMatchesValidator, validateMatch, listAdminMatches);
router.get('/matches/:matchId', matchIdValidator, validateMatch, getAdminMatch);
router.get('/matches/:matchId/live-state', matchIdValidator, validateMatch, getAdminLiveState);
router.get('/matches/:matchId/events', matchIdValidator, validateMatch, getAdminEvents);
router.get('/matches/:matchId/result', resultIdValidator, validateMatch, getAnyResult);
router.get('/matches/:matchId/photos', resultIdValidator, validateMatch, getAnyPhotos);
router.get('/teams/:teamId/statistics', teamStatsValidator, validateMatch, getTeamStatistics);
router.get('/teams/:teamId/leaderboards', teamStatsValidator, validateMatch, getTeamLeaderboards);
router.get('/teams/:teamId/history', teamStatsValidator, validateMatch, getTeamHistory);
router.get('/players/:playerId/statistics', playerStatsValidator, validateMatch, getAdminPlayerStats);

export default router;
