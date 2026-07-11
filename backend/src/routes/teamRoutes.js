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
import {
  cancelTeamMatch,
  createTeamMatch,
  deleteTeamMatch,
  getTeamMatch,
  listTeamMatches,
  updateTeamMatch,
} from '../controllers/matchController.js';
import { validateWithStatus } from '../middleware/validate.js';
import {
  createMatchValidator,
  listMatchesValidator,
  matchIdValidator,
  updateMatchValidator,
} from '../validators/matchValidators.js';
import {
  addAssist,
  addGoal,
  addOwnGoal,
  addPenalty,
  addRedCard,
  addSubstitution,
  addYellowCard,
  completeOwnedMatch,
  endOwnedFirstHalf,
  getOwnedEvents,
  getOwnedLiveState,
  startOwnedMatch,
  startOwnedSecondHalf,
  undoLastEvent,
} from '../controllers/liveMatchController.js';
import {
  assistValidator,
  cardValidator,
  goalValidator,
  liveMatchIdValidator,
  ownGoalValidator,
  penaltyValidator,
  substitutionValidator,
  undoValidator,
} from '../validators/liveMatchValidators.js';
import {
  deleteTeamPhoto, getPlayerStats, getTeamHistory, getTeamLeaderboards, getTeamPhotos,
  getTeamResult, getTeamStatistics, patchTeamPhoto, patchTeamResult, postTeamPhotos,
} from '../controllers/phaseFiveController.js';
import { uploadMatchPhotos, validatePhotoSignatures } from '../middleware/photoUpload.js';
import { photoMutationValidator, photoUploadValidator, playerStatsValidator, resultIdValidator, teamStatsValidator, updateResultValidator } from '../validators/phaseFiveValidators.js';

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
const validateMatch = validateWithStatus(400);
router.route('/matches')
  .get(listMatchesValidator, validateMatch, listTeamMatches)
  .post(createMatchValidator, validateMatch, createTeamMatch);
router.post('/matches/:matchId/start', liveMatchIdValidator, validateMatch, startOwnedMatch);
router.post('/matches/:matchId/end-first-half', liveMatchIdValidator, validateMatch, endOwnedFirstHalf);
router.post('/matches/:matchId/start-second-half', liveMatchIdValidator, validateMatch, startOwnedSecondHalf);
router.post('/matches/:matchId/complete', liveMatchIdValidator, validateMatch, completeOwnedMatch);
router.get('/matches/:matchId/live-state', liveMatchIdValidator, validateMatch, getOwnedLiveState);
router.get('/matches/:matchId/events', liveMatchIdValidator, validateMatch, getOwnedEvents);
router.route('/matches/:matchId/result')
  .get(resultIdValidator, validateMatch, getTeamResult)
  .patch(updateResultValidator, validateMatch, patchTeamResult);
router.route('/matches/:matchId/photos')
  .get(resultIdValidator, validateMatch, getTeamPhotos)
  .post(uploadMatchPhotos, validatePhotoSignatures, photoUploadValidator, validateMatch, postTeamPhotos);
router.route('/matches/:matchId/photos/:photoId')
  .patch(photoMutationValidator, validateMatch, patchTeamPhoto)
  .delete(photoMutationValidator, validateMatch, deleteTeamPhoto);
router.post('/matches/:matchId/events/goal', goalValidator, validateMatch, addGoal);
router.patch('/matches/:matchId/events/:eventId/assist', assistValidator, validateMatch, addAssist);
router.post('/matches/:matchId/events/yellow-card', cardValidator, validateMatch, addYellowCard);
router.post('/matches/:matchId/events/red-card', cardValidator, validateMatch, addRedCard);
router.post('/matches/:matchId/events/substitution', substitutionValidator, validateMatch, addSubstitution);
router.post('/matches/:matchId/events/penalty', penaltyValidator, validateMatch, addPenalty);
router.post('/matches/:matchId/events/own-goal', ownGoalValidator, validateMatch, addOwnGoal);
router.post('/matches/:matchId/events/undo-last', undoValidator, validateMatch, undoLastEvent);
router.get('/statistics', teamStatsValidator, validateMatch, getTeamStatistics);
router.get('/players/:playerId/statistics', playerStatsValidator, validateMatch, getPlayerStats);
router.get('/leaderboards', teamStatsValidator, validateMatch, getTeamLeaderboards);
router.get('/history', teamStatsValidator, validateMatch, getTeamHistory);
router.patch('/matches/:matchId/cancel', matchIdValidator, validateMatch, cancelTeamMatch);
router.route('/matches/:matchId')
  .get(matchIdValidator, validateMatch, getTeamMatch)
  .patch(updateMatchValidator, validateMatch, updateTeamMatch)
  .delete(matchIdValidator, validateMatch, deleteTeamMatch);

export default router;
