import User from '../models/User.js';
import env from '../config/env.js';
import { verifyToken } from '../utils/token.js';
import AppError from '../utils/AppError.js';
import asyncHandler from '../utils/asyncHandler.js';
import { assertActiveAccount } from '../services/playerService.js';

export const protect = asyncHandler(async (req, _res, next) => {
  const token = req.cookies[env.cookieName];

  if (!token) {
    throw new AppError('Authentication is required.', 401, 'AUTH_REQUIRED');
  }

  let payload;
  try {
    payload = verifyToken(token);
  } catch {
    throw new AppError('Your session is invalid or has expired.', 401, 'INVALID_SESSION');
  }

  const user = await User.findById(payload.sub).populate('team', 'name slug isArchived');
  if (!user) {
    throw new AppError('This account is unavailable.', 401, 'ACCOUNT_UNAVAILABLE');
  }
  assertActiveAccount(user);

  req.user = user;
  next();
});

export const requireRole = (...roles) => (req, _res, next) => {
  if (!req.user || !roles.includes(req.user.role)) {
    return next(new AppError('You do not have permission to perform this action.', 403, 'FORBIDDEN'));
  }
  return next();
};
