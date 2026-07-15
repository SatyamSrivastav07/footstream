import Notification from '../models/Notification.js';
import User, { USER_ROLES } from '../models/User.js';
import AppError from '../utils/AppError.js';

const idString = (value) => String(value?._id || value || '');

export const serializeNotification = (notification) => ({
  _id: notification._id,
  type: notification.type,
  title: notification.title,
  message: notification.message,
  entityType: notification.entityType,
  entityId: notification.entityId,
  actionUrl: notification.actionUrl,
  isRead: Boolean(notification.isRead),
  readAt: notification.readAt,
  createdAt: notification.createdAt,
});

export const createNotificationForUsers = async ({
  notificationModel = Notification,
  recipients = [],
  recipientTeam = null,
  type,
  title,
  message,
  entityType,
  entityId,
  actionUrl,
  dedupeKey,
}) => {
  const uniqueRecipients = [...new Set(recipients.map(idString).filter(Boolean))];
  await Promise.all(uniqueRecipients.map((recipientUser) => notificationModel.updateOne(
    { recipientUser, dedupeKey },
    {
      $setOnInsert: {
        recipientUser,
        recipientTeam,
        type,
        title,
        message,
        entityType,
        entityId,
        actionUrl,
        dedupeKey,
      },
    },
    { upsert: true },
  )));
};

export const createNotificationForTeam = async ({
  userModel = User,
  teamId,
  ...notification
}) => {
  const users = await userModel.find({ team: teamId, role: USER_ROLES.TEAM_ADMIN, isActive: true }).select('_id').lean();
  return createNotificationForUsers({ recipients: users.map((user) => user._id), recipientTeam: teamId, ...notification });
};

export const createNotificationForSuperAdmins = async ({
  userModel = User,
  ...notification
}) => {
  const users = await userModel.find({ role: USER_ROLES.SUPER_ADMIN, isActive: true }).select('_id').lean();
  return createNotificationForUsers({ recipients: users.map((user) => user._id), ...notification });
};

export const listNotifications = async ({ notificationModel = Notification, userId, query = {} }) => {
  const page = Math.max(Number(query.page) || 1, 1);
  const limit = Math.min(Math.max(Number(query.limit) || 30, 1), 100);
  const filter = { recipientUser: userId };
  if (query.unreadOnly === 'true') filter.isRead = false;
  const [notifications, total] = await Promise.all([
    notificationModel.find(filter).sort({ isRead: 1, createdAt: -1 }).skip((page - 1) * limit).limit(limit).lean(),
    notificationModel.countDocuments(filter),
  ]);
  return { notifications: notifications.map(serializeNotification), pagination: { page, limit, total, pages: Math.ceil(total / limit) } };
};

export const unreadCount = async ({ notificationModel = Notification, userId }) => ({
  count: await notificationModel.countDocuments({ recipientUser: userId, isRead: false }),
});

export const markNotificationRead = async ({ notificationModel = Notification, userId, notificationId, now = new Date() }) => {
  const notification = await notificationModel.findOne({ _id: notificationId, recipientUser: userId });
  if (!notification) throw new AppError('Notification not found.', 404, 'NOTIFICATION_NOT_FOUND');
  if (!notification.isRead) {
    notification.isRead = true;
    notification.readAt = now;
    await notification.save();
  }
  return serializeNotification(notification.toObject ? notification.toObject() : notification);
};

export const markAllNotificationsRead = async ({ notificationModel = Notification, userId, now = new Date() }) => {
  const result = await notificationModel.updateMany({ recipientUser: userId, isRead: false }, { $set: { isRead: true, readAt: now } });
  return { updated: result.modifiedCount || 0 };
};
