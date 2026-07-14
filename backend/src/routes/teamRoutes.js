import { Router } from 'express';
import { getAssignedTeam, removeOwnCover, removeOwnLogo, updateOwnJoinRequestStatus, uploadOwnCover, uploadOwnLogo } from '../controllers/teamController.js';
import {
  createTeamPlayer,
  deleteTeamPlayerPhoto,
  deleteTeamPlayer,
  getTeamPlayer,
  listTeamPlayers,
  updateTeamPlayer,
  updateTeamPlayerStatus,
  uploadTeamPlayerPhoto,
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
  getOpponentPlayers,
  getOpponentTeams,
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
import { uploadMatchPhotos, uploadPlayerPhoto, uploadTeamCover, uploadTeamLogo, validatePhotoSignatures, validatePlayerImageSignature, validateTeamImageSignature } from '../middleware/photoUpload.js';
import { photoMutationValidator, photoUploadValidator, playerStatsValidator, resultIdValidator, teamStatsValidator, updateResultValidator } from '../validators/phaseFiveValidators.js';
import { deleteOwnedStream, patchOwnedStreamStatus, putOwnedStream, readOwnedStream } from '../controllers/streamController.js';
import { configureStreamValidator, streamIdValidator, streamStatusValidator } from '../validators/streamValidators.js';
import { approveTeamJoinRequest, getTeamJoinRequest, listTeamJoinRequests, rejectTeamJoinRequest } from '../controllers/joinRequestController.js';
import { approveJoinRequestValidator, joinRequestIdValidator, listJoinRequestsValidator, rejectJoinRequestValidator } from '../validators/joinRequestValidators.js';
import { body, param, query } from 'express-validator';
import { authenticatedMutationLimiter, uploadLimiter } from '../middleware/rateLimiters.js';
import {
  closeTeamPoll,
  deleteTeamAnnouncement,
  deleteTeamChatMessage,
  deleteTeamPoll,
  getTeamAnnouncement,
  getTeamPolls,
  openTeamPoll,
  patchTeamPoll,
  postTeamPoll,
  putTeamAnnouncement,
} from '../controllers/engagementController.js';
import { announcementValidator, chatMatchIdValidator, deleteChatValidator, pollBodyValidator, pollIdValidator, updatePollValidator } from '../validators/engagementValidators.js';
import { postMatchReminder } from '../controllers/followController.js';

const router = Router();

router.use(protect, requireRole(USER_ROLES.TEAM_ADMIN));
router.use((req, res, next) => ['GET', 'HEAD', 'OPTIONS'].includes(req.method) ? next() : authenticatedMutationLimiter(req, res, next));
router.get('/current', getAssignedTeam);
router.put('/profile/logo', uploadLimiter, uploadTeamLogo, validateTeamImageSignature, uploadOwnLogo);
router.delete('/profile/logo', removeOwnLogo);
router.put('/profile/cover', uploadLimiter, uploadTeamCover, validateTeamImageSignature, uploadOwnCover);
router.delete('/profile/cover', removeOwnCover);
router.patch('/profile/join-requests-status', body('acceptingJoinRequests').isBoolean().withMessage('Join-request status must be true or false.').toBoolean(), validate, updateOwnJoinRequestStatus);
router.get('/join-requests', listJoinRequestsValidator, validate, listTeamJoinRequests);
router.get('/join-requests/:requestId', joinRequestIdValidator, validate, getTeamJoinRequest);
router.patch('/join-requests/:requestId/approve', approveJoinRequestValidator, validate, approveTeamJoinRequest);
router.patch('/join-requests/:requestId/reject', rejectJoinRequestValidator, validate, rejectTeamJoinRequest);
router.route('/players')
  .get(listPlayersValidator, validate, listTeamPlayers)
  .post(createPlayerValidator, validate, createTeamPlayer);
router.patch('/players/:playerId/status', updatePlayerStatusValidator, validate, updateTeamPlayerStatus);
router.put('/players/:playerId/photo', uploadLimiter, playerIdValidator, validate, uploadPlayerPhoto, validatePlayerImageSignature, uploadTeamPlayerPhoto);
router.delete('/players/:playerId/photo', playerIdValidator, validate, deleteTeamPlayerPhoto);
router.route('/players/:playerId')
  .get(playerIdValidator, validate, getTeamPlayer)
  .patch(updatePlayerValidator, validate, updateTeamPlayer)
  .delete(playerIdValidator, validate, deleteTeamPlayer);
const validateMatch = validateWithStatus(400);
router.route('/matches')
  .get(listMatchesValidator, validateMatch, listTeamMatches)
  .post(createMatchValidator, validateMatch, createTeamMatch);
router.get('/opponents', query('search').optional().isString().trim().isLength({ max: 120 }).withMessage('Search is too long.'), validateMatch, getOpponentTeams);
router.get('/opponents/:teamId/players', param('teamId').isMongoId().withMessage('Invalid opponent team identifier.'), validateMatch, getOpponentPlayers);
router.post('/matches/:matchId/start', liveMatchIdValidator, validateMatch, startOwnedMatch);
router.post('/matches/:matchId/reminder', liveMatchIdValidator, validateMatch, postMatchReminder);
router.post('/matches/:matchId/end-first-half', liveMatchIdValidator, validateMatch, endOwnedFirstHalf);
router.post('/matches/:matchId/start-second-half', liveMatchIdValidator, validateMatch, startOwnedSecondHalf);
router.post('/matches/:matchId/complete', liveMatchIdValidator, validateMatch, completeOwnedMatch);
router.get('/matches/:matchId/live-state', liveMatchIdValidator, validateMatch, getOwnedLiveState);
router.get('/matches/:matchId/events', liveMatchIdValidator, validateMatch, getOwnedEvents);
router.route('/matches/:matchId/announcement')
  .get(chatMatchIdValidator, validateMatch, getTeamAnnouncement)
  .put(announcementValidator, validateMatch, putTeamAnnouncement)
  .delete(chatMatchIdValidator, validateMatch, deleteTeamAnnouncement);
router.delete('/matches/:matchId/chat/:messageId', deleteChatValidator, validateMatch, deleteTeamChatMessage);
router.route('/matches/:matchId/polls')
  .get(chatMatchIdValidator, validateMatch, getTeamPolls)
  .post(pollBodyValidator, validateMatch, postTeamPoll);
router.route('/matches/:matchId/polls/:pollId')
  .patch(updatePollValidator, validateMatch, patchTeamPoll)
  .delete(pollIdValidator, validateMatch, deleteTeamPoll);
router.patch('/matches/:matchId/polls/:pollId/open', pollIdValidator, validateMatch, openTeamPoll);
router.patch('/matches/:matchId/polls/:pollId/close', pollIdValidator, validateMatch, closeTeamPoll);
router.route('/matches/:matchId/stream')
  .get(streamIdValidator, validateMatch, readOwnedStream)
  .put(configureStreamValidator, validateMatch, putOwnedStream)
  .delete(streamIdValidator, validateMatch, deleteOwnedStream);
router.patch('/matches/:matchId/stream/status', streamStatusValidator, validateMatch, patchOwnedStreamStatus);
router.route('/matches/:matchId/result')
  .get(resultIdValidator, validateMatch, getTeamResult)
  .patch(updateResultValidator, validateMatch, patchTeamResult);
router.route('/matches/:matchId/photos')
  .get(resultIdValidator, validateMatch, getTeamPhotos)
  .post(uploadLimiter, uploadMatchPhotos, validatePhotoSignatures, photoUploadValidator, validateMatch, postTeamPhotos);
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
