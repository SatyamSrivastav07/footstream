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
import { publicPlayerProfile, publicTeamFixtures, publicTeamGallery, publicTeamProfile, publicTeamResults, publicTeamSquad, publicTeams } from '../controllers/publicProfileController.js';
import { publicPlayerProfileValidator, publicTeamGalleryValidator, publicTeamMatchesValidator, publicTeamsValidator, publicTeamSlugValidator } from '../validators/publicProfileValidators.js';
import { publicSearch } from '../controllers/publicSearchController.js';
import { publicSearchValidator } from '../validators/publicSearchValidators.js';
import { publicJoinRequestStatus, submitPublicJoinRequest } from '../controllers/joinRequestController.js';
import { requestCodeValidator, submitJoinRequestValidator } from '../validators/joinRequestValidators.js';
import { uploadJoinRequestPhoto, validateOptionalJoinRequestImageSignature } from '../middleware/photoUpload.js';
import { getPublicChat, getPublicMatchAnnouncement, getPublicPolls, getPublicReactions, postPublicChat, togglePublicReaction, votePublicPoll } from '../controllers/engagementController.js';
import { listChatValidator, postChatValidator, chatMatchIdValidator, reactionMatchValidator, toggleReactionValidator, votePollValidator } from '../validators/engagementValidators.js';
import { joinRequestStatusLimiter, joinRequestSubmitLimiter, publicChatPostLimiter, publicFollowLimiter } from '../middleware/rateLimiters.js';
import {
  deleteFollowTeam,
  deletePushSubscribe,
  followStatus,
  patchFollowPreferences,
  postFollowTeam,
  postPushSubscribe,
  publicPushConfig,
} from '../controllers/followController.js';
import { followActionValidator, followPreferencesValidator, followStatusValidator, pushSubscribeValidator, pushUnsubscribeValidator } from '../validators/followValidators.js';

const router = Router();
const validate = validateWithStatus(400);
router.get('/home', publicHome);
router.get('/live', publicLiveDirectoryValidator, validate, publicLiveDirectory);
router.get('/fixtures', publicFixturesValidator, validate, publicFixtures);
router.get('/results', publicResultsValidator, validate, publicResults);
router.get('/search', publicSearchValidator, validate, publicSearch);
router.get('/teams', publicTeamsValidator, validate, publicTeams);
router.get('/push/config', publicPushConfig);
router.post('/push/subscribe', publicFollowLimiter, pushSubscribeValidator, validate, postPushSubscribe);
router.delete('/push/unsubscribe', publicFollowLimiter, pushUnsubscribeValidator, validate, deletePushSubscribe);
router.post('/teams/:teamSlug/join-requests', joinRequestSubmitLimiter, uploadJoinRequestPhoto, validateOptionalJoinRequestImageSignature, submitJoinRequestValidator, validate, submitPublicJoinRequest);
router.get('/teams/:teamSlug/follow-status', followStatusValidator, validate, followStatus);
router.post('/teams/:teamSlug/follow', publicFollowLimiter, followActionValidator, validate, postFollowTeam);
router.delete('/teams/:teamSlug/follow', publicFollowLimiter, followActionValidator, validate, deleteFollowTeam);
router.patch('/teams/:teamSlug/follow/preferences', publicFollowLimiter, followPreferencesValidator, validate, patchFollowPreferences);
router.get('/join-requests/:requestCode/status', joinRequestStatusLimiter, requestCodeValidator, validate, publicJoinRequestStatus);
router.get('/teams/:teamSlug/squad', publicTeamSlugValidator, validate, publicTeamSquad);
router.get('/teams/:teamSlug/fixtures', publicTeamMatchesValidator, validate, publicTeamFixtures);
router.get('/teams/:teamSlug/results', publicTeamMatchesValidator, validate, publicTeamResults);
router.get('/teams/:teamSlug/gallery', publicTeamGalleryValidator, validate, publicTeamGallery);
router.get('/teams/:teamSlug', publicTeamSlugValidator, validate, publicTeamProfile);
router.get('/players/:playerId/profile', publicPlayerProfileValidator, validate, publicPlayerProfile);
router.get('/matches/:matchId', publicMatchValidator, validate, publicMatch);
router.get('/matches/:matchId/live', liveMatchIdValidator, validate, getPublicLiveState);
router.get('/matches/:matchId/events', liveMatchIdValidator, validate, getPublicEvents);
router.get('/matches/:matchId/stream', streamIdValidator, validate, readPublicStream);
router.get('/matches/:matchId/chat', listChatValidator, validate, getPublicChat);
router.post('/matches/:matchId/chat', publicChatPostLimiter, postChatValidator, validate, postPublicChat);
router.get('/matches/:matchId/announcement', chatMatchIdValidator, validate, getPublicMatchAnnouncement);
router.get('/matches/:matchId/reactions', reactionMatchValidator, validate, getPublicReactions);
router.post('/matches/:matchId/reactions/:reactionType/toggle', toggleReactionValidator, validate, togglePublicReaction);
router.get('/matches/:matchId/polls', chatMatchIdValidator, validate, getPublicPolls);
router.post('/matches/:matchId/polls/:pollId/vote', votePollValidator, validate, votePublicPoll);
router.get('/matches/:matchId/result', resultIdValidator, validate, getAnyResult);
router.get('/matches/:matchId/photos', resultIdValidator, validate, getAnyPhotos);
router.get('/teams/:teamId/statistics', teamStatsValidator, validate, getTeamStatistics);
router.get('/teams/:teamId/leaderboards', teamStatsValidator, validate, getTeamLeaderboards);
router.get('/teams/:teamId/history', teamStatsValidator, validate, getTeamHistory);
router.get('/players/:playerId/statistics', playerStatsValidator, validate, getPlayerStats);
export default router;

