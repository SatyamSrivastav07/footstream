import { Router } from 'express';
import {
  getNotifications,
  getUnreadCount,
  readAllNotifications,
  readNotification,
} from '../controllers/notificationController.js';
import { protect } from '../middleware/auth.js';
import validate from '../middleware/validate.js';
import { listNotificationsValidator, notificationIdValidator } from '../validators/notificationValidators.js';

const router = Router();

router.use(protect);
router.get('/', listNotificationsValidator, validate, getNotifications);
router.get('/unread-count', getUnreadCount);
router.patch('/read-all', readAllNotifications);
router.patch('/:notificationId/read', notificationIdValidator, validate, readNotification);

export default router;
