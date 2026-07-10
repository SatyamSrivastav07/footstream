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

const router = Router();

router.use(protect, requireRole(USER_ROLES.SUPER_ADMIN));
router.route('/teams').get(getTeams).post(createTeamValidator, validate, createTeam);
router.get('/teams/:teamId/players', teamIdValidator, validate, listPlayersForAdmin);
router.route('/team-admins').get(getTeamAdmins).post(createTeamAdminValidator, validate, createTeamAdmin);
router.patch('/team-admins/:userId/status', statusValidator, validate, setTeamAdminStatus);

export default router;
