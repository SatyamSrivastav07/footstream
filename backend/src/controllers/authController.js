import User from '../models/User.js';
import env from '../config/env.js';
import AppError from '../utils/AppError.js';
import asyncHandler from '../utils/asyncHandler.js';
import { authCookieOptions, clearAuthCookieOptions, signToken } from '../utils/token.js';

const safeUser = (user) => ({
  id: user._id,
  name: user.name,
  email: user.email,
  role: user.role,
  team: user.team || null,
  isActive: user.isActive,
  lastLogin: user.lastLogin,
});

export const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;
  const user = await User.findOne({ email }).select('+password').populate('team', 'name slug isArchived');

  if (!user || !(await user.comparePassword(password))) {
    throw new AppError('Email or password is incorrect.', 401, 'INVALID_CREDENTIALS');
  }
  if (!user.isActive) {
    throw new AppError('This account has been disabled.', 403, 'ACCOUNT_DISABLED');
  }

  user.lastLogin = new Date();
  await user.save({ validateModifiedOnly: true });

  const token = signToken(user);
  res.cookie(env.cookieName, token, authCookieOptions());
  res.json({ success: true, data: { user: safeUser(user) } });
});

export const logout = (_req, res) => {
  res.clearCookie(env.cookieName, clearAuthCookieOptions());
  res.json({ success: true, data: { message: 'You have been logged out.' } });
};

export const getCurrentUser = (req, res) => {
  res.json({ success: true, data: { user: safeUser(req.user) } });
};

