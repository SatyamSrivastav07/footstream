import { Router } from 'express';
import {
  createTeam,
  createTeamAdmin,
  getTeamAdmins,
  getTeams,
  removeTeamCover,
  removeTeamLogo,
  setTeamAdminStatus,
  updateTeam,
  uploadTeamCover as uploadTeamCoverController,
  uploadTeamLogo as uploadTeamLogoController,
} from '../controllers/adminController.js';
import { listPlayersForAdmin } from '../controllers/playerController.js';
import { protect, requireRole } from '../middleware/auth.js';
import validate from '../middleware/validate.js';
import { USER_ROLES } from '../models/User.js';
import {
  createTeamAdminValidator,
  createTeamValidator,
  statusValidator,
  updateTeamValidator,
} from '../validators/adminValidators.js';
import { teamIdValidator } from '../validators/playerValidators.js';
import { getAdminMatch, listAdminMatches } from '../controllers/matchController.js';
import { validateWithStatus } from '../middleware/validate.js';
import { adminListMatchesValidator, matchIdValidator } from '../validators/matchValidators.js';
import { getAdminEvents, getAdminLiveState } from '../controllers/liveMatchController.js';
import { getAdminPlayerStats, getAnyPhotos, getAnyResult, getTeamHistory, getTeamLeaderboards, getTeamStatistics } from '../controllers/phaseFiveController.js';
import { playerStatsValidator, resultIdValidator, teamStatsValidator } from '../validators/phaseFiveValidators.js';
import { readAdminStream } from '../controllers/streamController.js';
import { streamIdValidator } from '../validators/streamValidators.js';
import { uploadTeamCover, uploadTeamLogo, validateTeamImageSignature } from '../middleware/photoUpload.js';
import { getAdminJoinRequest, listAdminTeamJoinRequests } from '../controllers/joinRequestController.js';
import { joinRequestIdValidator, listJoinRequestsValidator } from '../validators/joinRequestValidators.js';
import {
  approveAdminTeamRegistrationRequest,
  getAdminTeamRegistrationRequest,
  listAdminTeamRegistrationRequests,
  rejectAdminTeamRegistrationRequest,
} from '../controllers/teamRegistrationController.js';
import {
  approveTeamRegistrationValidator,
  listTeamRegistrationValidator,
  rejectTeamRegistrationValidator,
  teamRegistrationIdValidator,
} from '../validators/teamRegistrationValidators.js';
import {
  adminApproveTournament,
  adminArchiveTournament,
  adminGetTournament,
  adminListTournaments,
  adminRejectTournament,
  adminRequestChanges,
  adminSuspendTournament,
  adminTournamentReviewHistory,
  adminUnsuspendTournament,
} from '../controllers/tournamentAdminController.js';
import {
  requiredMessageValidator,
  requiredReasonValidator,
  reviewActionValidator,
  tournamentIdValidator,
  tournamentListValidator,
} from '../validators/tournamentValidators.js';
import { tournamentAdminReviewLimiter, tournamentApprovalLimiter } from '../middleware/rateLimiters.js';

const router = Router();

router.use(protect, requireRole(USER_ROLES.SUPER_ADMIN));
router.route('/teams').get(getTeams).post(createTeamValidator, validate, createTeam);
router.patch('/teams/:teamId', updateTeamValidator, validate, updateTeam);
router.put('/teams/:teamId/logo', teamIdValidator, validate, uploadTeamLogo, validateTeamImageSignature, uploadTeamLogoController);
router.delete('/teams/:teamId/logo', teamIdValidator, validate, removeTeamLogo);
router.put('/teams/:teamId/cover', teamIdValidator, validate, uploadTeamCover, validateTeamImageSignature, uploadTeamCoverController);
router.delete('/teams/:teamId/cover', teamIdValidator, validate, removeTeamCover);
router.get('/teams/:teamId/players', teamIdValidator, validate, listPlayersForAdmin);
router.get('/teams/:teamId/join-requests', teamIdValidator, listJoinRequestsValidator, validate, listAdminTeamJoinRequests);
router.get('/join-requests/:requestId', joinRequestIdValidator, validate, getAdminJoinRequest);
router.get('/team-registration-requests', listTeamRegistrationValidator, validate, listAdminTeamRegistrationRequests);
router.get('/team-registration-requests/:requestId', teamRegistrationIdValidator, validate, getAdminTeamRegistrationRequest);
router.patch('/team-registration-requests/:requestId/approve', approveTeamRegistrationValidator, validate, approveAdminTeamRegistrationRequest);
router.patch('/team-registration-requests/:requestId/reject', rejectTeamRegistrationValidator, validate, rejectAdminTeamRegistrationRequest);
router.get('/tournaments', tournamentListValidator, validate, adminListTournaments);
router.get('/tournaments/:tournamentId', tournamentIdValidator, validate, adminGetTournament);
router.get('/tournaments/:tournamentId/review-history', tournamentIdValidator, validate, adminTournamentReviewHistory);
router.patch('/tournaments/:tournamentId/approve', tournamentApprovalLimiter, reviewActionValidator, validate, adminApproveTournament);
router.patch('/tournaments/:tournamentId/reject', tournamentApprovalLimiter, requiredReasonValidator, validate, adminRejectTournament);
router.patch('/tournaments/:tournamentId/request-changes', tournamentApprovalLimiter, requiredMessageValidator, validate, adminRequestChanges);
router.patch('/tournaments/:tournamentId/suspend', tournamentAdminReviewLimiter, requiredReasonValidator, validate, adminSuspendTournament);
router.patch('/tournaments/:tournamentId/unsuspend', tournamentAdminReviewLimiter, reviewActionValidator, validate, adminUnsuspendTournament);
router.patch('/tournaments/:tournamentId/archive', tournamentAdminReviewLimiter, reviewActionValidator, validate, adminArchiveTournament);
router.route('/team-admins').get(getTeamAdmins).post(createTeamAdminValidator, validate, createTeamAdmin);
router.patch('/team-admins/:userId/status', statusValidator, validate, setTeamAdminStatus);
const validateMatch = validateWithStatus(400);
router.get('/matches', adminListMatchesValidator, validateMatch, listAdminMatches);
router.get('/matches/:matchId', matchIdValidator, validateMatch, getAdminMatch);
router.get('/matches/:matchId/live-state', matchIdValidator, validateMatch, getAdminLiveState);
router.get('/matches/:matchId/events', matchIdValidator, validateMatch, getAdminEvents);
router.get('/matches/:matchId/stream', streamIdValidator, validateMatch, readAdminStream);
router.get('/matches/:matchId/result', resultIdValidator, validateMatch, getAnyResult);
router.get('/matches/:matchId/photos', resultIdValidator, validateMatch, getAnyPhotos);
router.get('/teams/:teamId/statistics', teamStatsValidator, validateMatch, getTeamStatistics);
router.get('/teams/:teamId/leaderboards', teamStatsValidator, validateMatch, getTeamLeaderboards);
router.get('/teams/:teamId/history', teamStatsValidator, validateMatch, getTeamHistory);
router.get('/players/:playerId/statistics', playerStatsValidator, validateMatch, getAdminPlayerStats);

export default router;
