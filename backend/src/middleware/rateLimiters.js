import { ipKeyGenerator, rateLimit } from 'express-rate-limit';
import env from '../config/env.js';
import AppError from '../utils/AppError.js';

const limiterHandler = (_req, _res, next) => next(
  new AppError('Too many requests. Please wait and try again.', 429, 'RATE_LIMIT_EXCEEDED'),
);

const makeLimiter = ({ windowMs = env.rateLimits.windowMs, limit, keyGenerator, skipSuccessfulRequests = false, skip }) => rateLimit({
  windowMs,
  limit,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  keyGenerator: keyGenerator || ((req) => ipKeyGenerator(req.ip)),
  skipSuccessfulRequests,
  skip,
  handler: limiterHandler,
});

export const authLoginLimiter = makeLimiter({
  windowMs: 15 * 60 * 1000,
  limit: env.rateLimits.authMax,
  skipSuccessfulRequests: true,
});

export const publicReadLimiter = makeLimiter({
  limit: env.rateLimits.publicReadMax,
  skip: (req) => req.method !== 'GET' || req.originalUrl.startsWith('/api/public/search'),
});
export const searchLimiter = makeLimiter({ windowMs: 60 * 1000, limit: env.rateLimits.searchMax });
export const uploadLimiter = makeLimiter({ limit: env.rateLimits.uploadMax });
export const joinRequestSubmitLimiter = makeLimiter({
  windowMs: 60 * 60 * 1000,
  limit: env.rateLimits.joinRequestMax,
});
export const joinRequestStatusLimiter = makeLimiter({
  windowMs: 15 * 60 * 1000,
  limit: Math.max(60, env.rateLimits.publicReadMax),
});
export const publicFollowLimiter = makeLimiter({
  windowMs: 15 * 60 * 1000,
  limit: env.rateLimits.followMax,
  keyGenerator: (req) => `${ipKeyGenerator(req.ip)}:${req.body?.followerSessionId || req.query?.followerSessionId || 'anonymous'}`,
});
export const authenticatedMutationLimiter = makeLimiter({ limit: env.rateLimits.mutationMax });
export const publicChatPostLimiter = makeLimiter({
  windowMs: 60 * 1000,
  limit: env.rateLimits.chatMax,
  keyGenerator: (req) => `${ipKeyGenerator(req.ip)}:${req.body?.guestSessionId || 'anonymous'}`,
});
