import asyncHandler from '../utils/asyncHandler.js';
import {
  followTeam,
  getFollowStatus,
  subscribePush,
  unfollowTeam,
  unsubscribePush,
  updateFollowPreferences,
} from '../services/followService.js';
import { publicVapidKey, sendManualMatchReminder } from '../services/pushService.js';

const followerSessionId = (req) => req.body?.followerSessionId || req.query?.followerSessionId || req.get('x-follower-session-id');
const ownedTeamId = (req) => req.user.team?._id || req.user.team;

export const publicPushConfig = asyncHandler(async (_req, res) => {
  res.json({ success: true, data: { vapidPublicKey: publicVapidKey() } });
});

export const followStatus = asyncHandler(async (req, res) => {
  const follow = await getFollowStatus({ teamSlug: req.params.teamSlug, followerSessionId: followerSessionId(req) });
  res.json({ success: true, data: { ...follow, follow } });
});

export const postFollowTeam = asyncHandler(async (req, res) => {
  const follow = await followTeam({ teamSlug: req.params.teamSlug, followerSessionId: req.body.followerSessionId });
  res.status(201).json({ success: true, data: { follow } });
});

export const deleteFollowTeam = asyncHandler(async (req, res) => {
  const follow = await unfollowTeam({ teamSlug: req.params.teamSlug, followerSessionId: req.body.followerSessionId });
  res.json({ success: true, data: { follow } });
});

export const patchFollowPreferences = asyncHandler(async (req, res) => {
  const follow = await updateFollowPreferences({ teamSlug: req.params.teamSlug, followerSessionId: req.body.followerSessionId, preferences: req.body.preferences || {} });
  res.json({ success: true, data: { follow } });
});

export const postPushSubscribe = asyncHandler(async (req, res) => {
  const result = await subscribePush({ followerSessionId: req.body.followerSessionId, subscription: req.body.subscription });
  res.json({ success: true, data: result });
});

export const deletePushSubscribe = asyncHandler(async (req, res) => {
  const result = await unsubscribePush({ followerSessionId: req.body.followerSessionId });
  res.json({ success: true, data: result });
});

export const postMatchReminder = asyncHandler(async (req, res) => {
  const result = await sendManualMatchReminder({ teamId: ownedTeamId(req), matchId: req.params.matchId });
  res.json({ success: true, data: result });
});
