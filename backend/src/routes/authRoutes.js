import { Router } from 'express';
import { rateLimit } from 'express-rate-limit';
import { getCurrentUser, login, logout } from '../controllers/authController.js';
import { protect } from '../middleware/auth.js';
import validate from '../middleware/validate.js';
import { loginValidator } from '../validators/authValidators.js';

const router = Router();

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  message: { success: false, error: { code: 'TOO_MANY_ATTEMPTS', message: 'Too many login attempts. Try again later.' } },
});

router.post('/login', loginLimiter, loginValidator, validate, login);
router.post('/logout', logout);
router.get('/me', protect, getCurrentUser);

export default router;

