import jwt from 'jsonwebtoken';
import env from '../config/env.js';

export const signToken = (user) =>
  jwt.sign(
    { sub: user._id.toString(), role: user.role },
    env.jwtSecret,
    { expiresIn: env.jwtExpiresIn, issuer: 'footstream-api', audience: 'footstream-admin' },
  );

export const verifyToken = (token) =>
  jwt.verify(token, env.jwtSecret, {
    issuer: 'footstream-api',
    audience: 'footstream-admin',
  });

export const authCookieOptions = () => ({
  httpOnly: true,
  secure: env.cookieSecure,
  sameSite: env.cookieSameSite,
  maxAge: env.cookieMaxAge,
  path: '/',
});

export const clearAuthCookieOptions = () => ({
  httpOnly: true,
  secure: env.cookieSecure,
  sameSite: env.cookieSameSite,
  path: '/',
});
