import { Router } from 'express';
import { getAssignedTeam } from '../controllers/teamController.js';
import {
  createTeamPlayer,
  deleteTeamPlayer,
  getTeamPlayer,
  listTeamPlayers,
  updateTeamPlayer,
  updateTeamPlayerStatus,
} from '../controllers/playerController.js';
import { protect, requireRole } from '../middleware/auth.js';
import validate from '../middleware/validate.js';
import { USER_ROLES } from '../models/User.js';
import {
  createPlayerValidator,
  listPlayersValidator,
  playerIdValidator,
  updatePlayerStatusValidator,
  updatePlayerValidator,
} from '../validators/playerValidators.js';

const router = Router();

router.use(protect, requireRole(USER_ROLES.TEAM_ADMIN));
router.get('/current', getAssignedTeam);
router.route('/players')
  .get(listPlayersValidator, validate, listTeamPlayers)
  .post(createPlayerValidator, validate, createTeamPlayer);
router.patch('/players/:playerId/status', updatePlayerStatusValidator, validate, updateTeamPlayerStatus);
router.route('/players/:playerId')
  .get(playerIdValidator, validate, getTeamPlayer)
  .patch(updatePlayerValidator, validate, updateTeamPlayer)
  .delete(playerIdValidator, validate, deleteTeamPlayer);

export default router;
