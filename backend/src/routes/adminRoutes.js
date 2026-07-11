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

export default router;
