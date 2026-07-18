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
import { protect, requireOperationalTeamForMutation, requireRole } from '../middleware/auth.js';
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
import {
  uploadMatchPhotos,
  uploadPlayerPhoto,
  uploadTeamCover,
  uploadTeamLogo,
  uploadTournamentCover,
  uploadTournamentLogo,
  uploadTournamentParticipantLogo,
  uploadTournamentSquadPlayerPhoto,
  validatePhotoSignatures,
  validatePlayerImageSignature,
  validateTeamImageSignature,
  validateTournamentBrandingSignature,
} from '../middleware/photoUpload.js';
import { photoMutationValidator, photoUploadValidator, playerStatsValidator, resultIdValidator, teamStatsValidator, updateResultValidator } from '../validators/phaseFiveValidators.js';
import { deleteOwnedStream, patchOwnedStreamStatus, putOwnedStream, readOwnedStream } from '../controllers/streamController.js';
import { configureStreamValidator, streamIdValidator, streamStatusValidator } from '../validators/streamValidators.js';
import { getTeamDirectResult, putTeamDirectResult } from '../controllers/directResultController.js';
import { directResultIdValidator, directResultValidator } from '../validators/directResultValidators.js';
import { approveTeamJoinRequest, getTeamJoinRequest, listTeamJoinRequests, rejectTeamJoinRequest } from '../controllers/joinRequestController.js';
import { approveJoinRequestValidator, joinRequestIdValidator, listJoinRequestsValidator, rejectJoinRequestValidator } from '../validators/joinRequestValidators.js';
import { body, param, query } from 'express-validator';
import {
  authenticatedMutationLimiter,
  tournamentCreateLimiter,
  tournamentMutationLimiter,
  tournamentParticipantLimiter,
  uploadLimiter,
} from '../middleware/rateLimiters.js';
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
import {
  createHostedTournament,
  deleteHosted,
  getHosted,
  getTeamTournament,
  hostedReviewHistory,
  listHosted,
  listTeamTournaments,
  publishHosted,
  resubmitHosted,
  submitHosted,
  unpublishHosted,
  updateHosted,
} from '../controllers/tournamentController.js';
import {
  availableRegisteredTeams,
  deleteParticipant,
  getTournamentParticipants,
  patchParticipant,
  patchParticipantStatus,
  postExternalParticipant,
  postIntraParticipant,
  postRegisteredParticipant,
} from '../controllers/tournamentParticipantController.js';
import {
  deleteParticipantLogo,
  deleteTournamentCover,
  deleteTournamentLogo,
  putParticipantLogo,
  putTournamentCover,
  putTournamentLogo,
} from '../controllers/tournamentBrandingController.js';
import {
  approveParticipantSquad,
  createParticipantSquad,
  deleteSquadPlayer,
  deleteSquadPlayerPhoto,
  eligiblePlayers,
  hostedSquads,
  lockParticipantSquad,
  myTournamentSquad,
  participantSquadHistory,
  patchParticipantSquad,
  patchSquadCaptain,
  patchSquadPlayer,
  patchSquadViceCaptain,
  postManualSquadPlayer,
  postRegisteredSquadPlayer,
  putSquadPlayerPhoto,
  readParticipantSquad,
  submitParticipantSquad,
  unlockParticipantSquad,
} from '../controllers/tournamentSquadController.js';
import {
  awayEligiblePlayers,
  getLineupHistory,
  homeEligiblePlayers,
  hostedLineups,
  patchAwayLineup,
  patchHomeLineup,
  patchLineup,
  postLineup,
  postLockLineup,
  postSubmitLineup,
  postUnlockLineup,
  readLineup,
} from '../controllers/tournamentLineupController.js';
import {
  createTournamentValidator,
  tournamentIdValidator,
  tournamentListValidator,
  updateTournamentValidator,
} from '../validators/tournamentValidators.js';
import {
  availableTeamsValidator,
  manualParticipantValidator,
  participantIdValidator,
  participantListValidator,
  participantStatusValidator,
  registeredParticipantValidator,
  updateParticipantValidator,
} from '../validators/tournamentParticipantValidators.js';
import {
  eligiblePlayersValidator,
  manualSquadPlayerValidator,
  registeredSquadPlayerValidator,
  squadCaptainValidator,
  squadListValidator,
  squadParamsValidator,
  squadPlayerParamsValidator,
  updateSquadPlayerValidator,
} from '../validators/tournamentSquadValidators.js';
import {
  createLineupValidator,
  lineupListValidator,
  lineupParamsValidator,
  updateLineupSideValidator,
  updateLineupValidator,
} from '../validators/tournamentLineupValidators.js';
const router = Router();
const validateMatch = validateWithStatus(400);

router.use(protect, requireRole(USER_ROLES.TEAM_ADMIN));
router.use((req, res, next) => ['GET', 'HEAD', 'OPTIONS'].includes(req.method) ? next() : authenticatedMutationLimiter(req, res, next));
router.use(requireOperationalTeamForMutation);
router.get('/current', getAssignedTeam);
router.route('/hosted-tournaments')
  .get(tournamentListValidator, validateMatch, listHosted)
  .post(tournamentCreateLimiter, createTournamentValidator, validateMatch, createHostedTournament);
router.get('/tournaments', tournamentListValidator, validateMatch, listTeamTournaments);
router.get('/tournaments/:tournamentId', tournamentIdValidator, validateMatch, getTeamTournament);
router.get('/tournaments/:tournamentId/my-squad', tournamentIdValidator, validateMatch, myTournamentSquad);
router.post('/hosted-tournaments/:tournamentId/submit-for-approval', tournamentMutationLimiter, tournamentIdValidator, validateMatch, submitHosted);
router.post('/hosted-tournaments/:tournamentId/resubmit', tournamentMutationLimiter, tournamentIdValidator, validateMatch, resubmitHosted);
router.patch('/hosted-tournaments/:tournamentId/publish', tournamentMutationLimiter, tournamentIdValidator, validateMatch, publishHosted);
router.patch('/hosted-tournaments/:tournamentId/unpublish', tournamentMutationLimiter, tournamentIdValidator, validateMatch, unpublishHosted);
router.put('/hosted-tournaments/:tournamentId/logo', uploadLimiter, tournamentIdValidator, validateMatch, uploadTournamentLogo, validateTournamentBrandingSignature, putTournamentLogo);
router.delete('/hosted-tournaments/:tournamentId/logo', tournamentMutationLimiter, tournamentIdValidator, validateMatch, deleteTournamentLogo);
router.put('/hosted-tournaments/:tournamentId/cover', uploadLimiter, tournamentIdValidator, validateMatch, uploadTournamentCover, validateTournamentBrandingSignature, putTournamentCover);
router.delete('/hosted-tournaments/:tournamentId/cover', tournamentMutationLimiter, tournamentIdValidator, validateMatch, deleteTournamentCover);
router.get('/hosted-tournaments/:tournamentId/review-history', tournamentIdValidator, validateMatch, hostedReviewHistory);
router.get('/hosted-tournaments/:tournamentId/squads', squadListValidator, validateMatch, hostedSquads);
router.route('/hosted-tournaments/:tournamentId/lineups')
  .get(lineupListValidator, validateMatch, hostedLineups)
  .post(tournamentParticipantLimiter, createLineupValidator, validateMatch, postLineup);
router.get('/hosted-tournaments/:tournamentId/lineups/:lineupId/history', lineupParamsValidator, validateMatch, getLineupHistory);
router.get('/hosted-tournaments/:tournamentId/lineups/:lineupId/home/eligible-players', lineupParamsValidator, validateMatch, homeEligiblePlayers);
router.get('/hosted-tournaments/:tournamentId/lineups/:lineupId/away/eligible-players', lineupParamsValidator, validateMatch, awayEligiblePlayers);
router.patch('/hosted-tournaments/:tournamentId/lineups/:lineupId/home', tournamentParticipantLimiter, updateLineupSideValidator, validateMatch, patchHomeLineup);
router.patch('/hosted-tournaments/:tournamentId/lineups/:lineupId/away', tournamentParticipantLimiter, updateLineupSideValidator, validateMatch, patchAwayLineup);
router.post('/hosted-tournaments/:tournamentId/lineups/:lineupId/submit', tournamentParticipantLimiter, lineupParamsValidator, validateMatch, postSubmitLineup);
router.post('/hosted-tournaments/:tournamentId/lineups/:lineupId/lock', tournamentParticipantLimiter, lineupParamsValidator, validateMatch, postLockLineup);
router.post('/hosted-tournaments/:tournamentId/lineups/:lineupId/unlock', tournamentParticipantLimiter, lineupParamsValidator, validateMatch, postUnlockLineup);
router.route('/hosted-tournaments/:tournamentId/lineups/:lineupId')
  .get(lineupParamsValidator, validateMatch, readLineup)
  .patch(tournamentParticipantLimiter, updateLineupValidator, validateMatch, patchLineup);
router.get('/hosted-tournaments/:tournamentId/participants', participantListValidator, validateMatch, getTournamentParticipants);
router.post('/hosted-tournaments/:tournamentId/participants/registered', tournamentParticipantLimiter, registeredParticipantValidator, validateMatch, postRegisteredParticipant);
router.post('/hosted-tournaments/:tournamentId/participants/external', tournamentParticipantLimiter, manualParticipantValidator, validateMatch, postExternalParticipant);
router.post('/hosted-tournaments/:tournamentId/participants/intra', tournamentParticipantLimiter, manualParticipantValidator, validateMatch, postIntraParticipant);
router.put('/hosted-tournaments/:tournamentId/participants/:participantId/logo', uploadLimiter, participantIdValidator, validateMatch, uploadTournamentParticipantLogo, validateTournamentBrandingSignature, putParticipantLogo);
router.delete('/hosted-tournaments/:tournamentId/participants/:participantId/logo', tournamentMutationLimiter, participantIdValidator, validateMatch, deleteParticipantLogo);
router.get('/hosted-tournaments/:tournamentId/participants/:participantId/eligible-players', eligiblePlayersValidator, validateMatch, eligiblePlayers);
router.post('/hosted-tournaments/:tournamentId/participants/:participantId/squad', tournamentParticipantLimiter, squadParamsValidator, validateMatch, createParticipantSquad);
router.route('/hosted-tournaments/:tournamentId/participants/:participantId/squad')
  .get(squadParamsValidator, validateMatch, readParticipantSquad)
  .patch(tournamentParticipantLimiter, squadParamsValidator, validateMatch, patchParticipantSquad);
router.post('/hosted-tournaments/:tournamentId/participants/:participantId/squad/submit', tournamentParticipantLimiter, squadParamsValidator, validateMatch, submitParticipantSquad);
router.post('/hosted-tournaments/:tournamentId/participants/:participantId/squad/approve', tournamentParticipantLimiter, squadParamsValidator, validateMatch, approveParticipantSquad);
router.post('/hosted-tournaments/:tournamentId/participants/:participantId/squad/lock', tournamentParticipantLimiter, squadParamsValidator, validateMatch, lockParticipantSquad);
router.post('/hosted-tournaments/:tournamentId/participants/:participantId/squad/unlock', tournamentParticipantLimiter, squadParamsValidator, validateMatch, unlockParticipantSquad);
router.get('/hosted-tournaments/:tournamentId/participants/:participantId/squad/history', squadParamsValidator, validateMatch, participantSquadHistory);
router.post('/hosted-tournaments/:tournamentId/participants/:participantId/squad/players/registered', tournamentParticipantLimiter, registeredSquadPlayerValidator, validateMatch, postRegisteredSquadPlayer);
router.post('/hosted-tournaments/:tournamentId/participants/:participantId/squad/players/manual', tournamentParticipantLimiter, manualSquadPlayerValidator, validateMatch, postManualSquadPlayer);
router.patch('/hosted-tournaments/:tournamentId/participants/:participantId/squad/players/:squadPlayerId', tournamentParticipantLimiter, updateSquadPlayerValidator, validateMatch, patchSquadPlayer);
router.delete('/hosted-tournaments/:tournamentId/participants/:participantId/squad/players/:squadPlayerId', tournamentParticipantLimiter, squadPlayerParamsValidator, validateMatch, deleteSquadPlayer);
router.patch('/hosted-tournaments/:tournamentId/participants/:participantId/squad/captain', tournamentParticipantLimiter, squadCaptainValidator, validateMatch, patchSquadCaptain);
router.patch('/hosted-tournaments/:tournamentId/participants/:participantId/squad/vice-captain', tournamentParticipantLimiter, squadCaptainValidator, validateMatch, patchSquadViceCaptain);
router.put('/hosted-tournaments/:tournamentId/participants/:participantId/squad/players/:squadPlayerId/photo', uploadLimiter, squadPlayerParamsValidator, validateMatch, uploadTournamentSquadPlayerPhoto, validateTournamentBrandingSignature, putSquadPlayerPhoto);
router.delete('/hosted-tournaments/:tournamentId/participants/:participantId/squad/players/:squadPlayerId/photo', tournamentParticipantLimiter, squadPlayerParamsValidator, validateMatch, deleteSquadPlayerPhoto);
router.patch('/hosted-tournaments/:tournamentId/participants/:participantId', tournamentParticipantLimiter, updateParticipantValidator, validateMatch, patchParticipant);
router.patch('/hosted-tournaments/:tournamentId/participants/:participantId/status', tournamentParticipantLimiter, participantStatusValidator, validateMatch, patchParticipantStatus);
router.delete('/hosted-tournaments/:tournamentId/participants/:participantId', tournamentParticipantLimiter, participantIdValidator, validateMatch, deleteParticipant);
router.get('/hosted-tournaments/:tournamentId/available-teams', availableTeamsValidator, validateMatch, availableRegisteredTeams);
router.route('/hosted-tournaments/:tournamentId')
  .get(tournamentIdValidator, validateMatch, getHosted)
  .patch(tournamentMutationLimiter, updateTournamentValidator, validateMatch, updateHosted)
  .delete(tournamentMutationLimiter, tournamentIdValidator, validateMatch, deleteHosted);
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
router.route('/matches/:matchId/direct-result')
  .get(directResultIdValidator, validateMatch, getTeamDirectResult)
  .post(directResultValidator, validateMatch, putTeamDirectResult)
  .patch(directResultValidator, validateMatch, putTeamDirectResult);
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
