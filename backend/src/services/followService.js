import Team from '../models/Team.js';
import TeamFollow from '../models/TeamFollow.js';
import AppError from '../utils/AppError.js';

const preferenceKeys = ['matchReminder', 'matchStarted', 'goal', 'halfTime', 'fullTime', 'resultPublished'];

export const safeFollow = (follow, followerCount = null) => {
  if (!follow) return { following: false, isFollowing: false, preferences: {}, pushConfigured: false, notificationsEnabled: false, followerCount };
  const data = typeof follow?.toJSON === 'function' ? follow.toJSON() : { ...follow };
  const pushConfigured = Boolean(data.pushSubscription?.endpoint || follow.pushSubscription?.endpoint);
  return {
    following: Boolean(data.isActive),
    isFollowing: Boolean(data.isActive),
    preferences: data.preferences || {},
    pushConfigured,
    notificationsEnabled: pushConfigured,
    followedAt: data.followedAt || null,
    lastSeenAt: data.lastSeenAt || null,
    followerCount,
  };
};

export const sanitizePreferences = (input = {}) => {
  const unknown = Object.keys(input).filter((key) => !preferenceKeys.includes(key));
  if (unknown.length) throw new AppError(`Unsupported preference fields: ${unknown.join(', ')}.`, 400, 'PREFERENCES_INVALID');
  return Object.fromEntries(Object.entries(input).filter(([, value]) => typeof value === 'boolean'));
};

export const resolvePublicTeamBySlug = async ({ teamModel = Team, teamSlug }) => {
  const team = await teamModel.findOne({ slug: teamSlug, isPublished: true, isArchived: false });
  if (!team) throw new AppError('Team not found.', 404, 'TEAM_NOT_FOUND');
  return team;
};

export const activeFollowerCount = async ({ followModel = TeamFollow, teamId }) => followModel.countDocuments({ team: teamId, isActive: true });

export const getFollowStatus = async ({ teamModel = Team, followModel = TeamFollow, teamSlug, followerSessionId }) => {
  const team = await resolvePublicTeamBySlug({ teamModel, teamSlug });
  const follow = followerSessionId ? await followModel.findOne({ team: team._id, followerSessionId }) : null;
  const followerCount = await activeFollowerCount({ followModel, teamId: team._id });
  return safeFollow(follow, followerCount);
};

export const followTeam = async ({ teamModel = Team, followModel = TeamFollow, teamSlug, followerSessionId, now = new Date() }) => {
  const team = await resolvePublicTeamBySlug({ teamModel, teamSlug });
  const follow = await followModel.findOneAndUpdate(
    { team: team._id, followerSessionId },
    { $set: { isActive: true, unfollowedAt: null, lastSeenAt: now }, $setOnInsert: { followedAt: now, preferences: {} } },
    { new: true, upsert: true, runValidators: true },
  );
  const followerCount = await activeFollowerCount({ followModel, teamId: team._id });
  return safeFollow(follow, followerCount);
};

export const unfollowTeam = async ({ teamModel = Team, followModel = TeamFollow, teamSlug, followerSessionId, now = new Date() }) => {
  const team = await resolvePublicTeamBySlug({ teamModel, teamSlug });
  const follow = await followModel.findOneAndUpdate(
    { team: team._id, followerSessionId },
    { $set: { isActive: false, unfollowedAt: now, lastSeenAt: now, pushSubscription: null } },
    { new: true },
  );
  const followerCount = await activeFollowerCount({ followModel, teamId: team._id });
  return safeFollow(follow, followerCount);
};

export const updateFollowPreferences = async ({ teamModel = Team, followModel = TeamFollow, teamSlug, followerSessionId, preferences, now = new Date() }) => {
  const team = await resolvePublicTeamBySlug({ teamModel, teamSlug });
  const updates = sanitizePreferences(preferences);
  const set = Object.fromEntries(Object.entries(updates).map(([key, value]) => [`preferences.${key}`, value]));
  const follow = await followModel.findOneAndUpdate(
    { team: team._id, followerSessionId, isActive: true },
    { $set: { ...set, lastSeenAt: now } },
    { new: true, runValidators: true },
  );
  if (!follow) throw new AppError('Follow this team before updating preferences.', 404, 'FOLLOW_NOT_FOUND');
  const followerCount = await activeFollowerCount({ followModel, teamId: team._id });
  return safeFollow(follow, followerCount);
};

export const validateSubscription = (subscription = {}) => {
  const unknown = Object.keys(subscription).filter((key) => !['endpoint', 'expirationTime', 'keys'].includes(key));
  if (unknown.length) throw new AppError(`Unsupported subscription fields: ${unknown.join(', ')}.`, 400, 'SUBSCRIPTION_INVALID');
  if (typeof subscription.endpoint !== 'string' || subscription.endpoint.length > 2048 || !/^https:\/\//i.test(subscription.endpoint)) {
    throw new AppError('A valid HTTPS push endpoint is required.', 400, 'PUSH_ENDPOINT_INVALID');
  }
  if (!subscription.keys || typeof subscription.keys.p256dh !== 'string' || typeof subscription.keys.auth !== 'string') {
    throw new AppError('Push subscription keys are required.', 400, 'PUSH_KEYS_INVALID');
  }
  if (subscription.keys.p256dh.length > 512 || subscription.keys.auth.length > 256) {
    throw new AppError('Push subscription keys are too large.', 400, 'PUSH_KEYS_INVALID');
  }
  return {
    endpoint: subscription.endpoint,
    expirationTime: subscription.expirationTime || null,
    keys: { p256dh: subscription.keys.p256dh, auth: subscription.keys.auth },
  };
};

export const subscribePush = async ({ followModel = TeamFollow, followerSessionId, subscription, now = new Date() }) => {
  const safeSubscription = validateSubscription(subscription);
  const result = await followModel.updateMany(
    { followerSessionId, isActive: true },
    { $set: { pushSubscription: safeSubscription, lastSeenAt: now } },
  );
  return { updated: result.modifiedCount || 0 };
};

export const unsubscribePush = async ({ followModel = TeamFollow, followerSessionId, now = new Date() }) => {
  const result = await followModel.updateMany(
    { followerSessionId },
    { $set: { pushSubscription: null, lastSeenAt: now } },
  );
  return { updated: result.modifiedCount || 0 };
};
