import { param, query } from 'express-validator';

export const notificationIdValidator = [
  param('notificationId').isMongoId().withMessage('Invalid notification identifier.'),
];

export const listNotificationsValidator = [
  query('page').optional().isInt({ min: 1 }).withMessage('Page must be positive.').toInt(),
  query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100.').toInt(),
  query('unreadOnly').optional().isBoolean().withMessage('Unread filter must be true or false.'),
];
