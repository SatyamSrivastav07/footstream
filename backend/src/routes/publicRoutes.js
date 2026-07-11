import { Router } from 'express';
import { getPublicEvents, getPublicLiveState } from '../controllers/liveMatchController.js';
import { validateWithStatus } from '../middleware/validate.js';
import { liveMatchIdValidator } from '../validators/liveMatchValidators.js';

const router = Router();
const validate = validateWithStatus(400);
router.get('/matches/:matchId/live', liveMatchIdValidator, validate, getPublicLiveState);
router.get('/matches/:matchId/events', liveMatchIdValidator, validate, getPublicEvents);
export default router;

