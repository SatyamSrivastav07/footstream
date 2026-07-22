import TeamActivity from '../models/TeamActivity.js';

const idString = (value) => String(value?._id || value || '');

export const logTeamActivity = async ({
  activityModel = TeamActivity,
  teamId,
  actor = null,
  type,
  title,
  message = '',
  metadata = {},
}) => {
  if (!teamId || !type || !title) return null;
  return activityModel.create({
    team: teamId,
    actor,
    type,
    title,
    message,
    metadata,
  }).catch(() => null);
};

const serializeActivity = (activity) => ({
  id: idString(activity._id || activity.id),
  type: activity.type,
  title: activity.title,
  message: activity.message || '',
  metadata: activity.metadata || {},
  createdAt: activity.createdAt,
});

export const listTeamActivity = async ({ activityModel = TeamActivity, teamId, query = {} }) => {
  const page = Math.max(Number(query.page) || 1, 1);
  const limit = Math.min(Math.max(Number(query.limit) || 20, 1), 50);
  const filter = { team: teamId };
  const [activities, total] = await Promise.all([
    activityModel.find(filter).sort({ createdAt: -1, _id: -1 }).skip((page - 1) * limit).limit(limit).lean(),
    activityModel.countDocuments(filter),
  ]);
  return {
    activities: activities.map(serializeActivity),
    pagination: { page, limit, total, pages: Math.ceil(total / limit) },
  };
};
