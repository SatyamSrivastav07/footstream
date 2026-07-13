import asyncHandler from '../utils/asyncHandler.js';
import {
  listNotifications,
  markAllNotificationsRead,
  markNotificationRead,
  unreadCount,
} from '../services/notificationService.js';

export const getNotifications = asyncHandler(async (req, res) => {
  const data = await listNotifications({ userId: req.user._id, query: req.query });
  res.json({ success: true, data });
});

export const getUnreadCount = asyncHandler(async (req, res) => {
  const data = await unreadCount({ userId: req.user._id });
  res.json({ success: true, data });
});

export const readNotification = asyncHandler(async (req, res) => {
  const notification = await markNotificationRead({ userId: req.user._id, notificationId: req.params.notificationId });
  res.json({ success: true, data: { notification } });
});

export const readAllNotifications = asyncHandler(async (req, res) => {
  const data = await markAllNotificationsRead({ userId: req.user._id });
  res.json({ success: true, data });
});
