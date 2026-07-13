import { Router } from 'express';
import { getCurrentUser, login, logout } from '../controllers/authController.js';
import { protect } from '../middleware/auth.js';
import validate from '../middleware/validate.js';
import { loginValidator } from '../validators/authValidators.js';
import { authLoginLimiter } from '../middleware/rateLimiters.js';

const router = Router();

router.post('/login', authLoginLimiter, loginValidator, validate, login);
router.post('/logout', logout);
router.get('/me', protect, getCurrentUser);

export default router;
