import dotenv from 'dotenv';

dotenv.config();

const requiredInProduction = [
  'MONGODB_URI',
  'JWT_SECRET',
  'CLIENT_URL',
  'CLOUDINARY_CLOUD_NAME',
  'CLOUDINARY_API_KEY',
  'CLOUDINARY_API_SECRET',
];

if (process.env.NODE_ENV === 'production') {
  const missing = requiredInProduction.filter((name) => !process.env[name]);
  if (missing.length > 0) {
    throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
  }
}

const jwtSecret = process.env.JWT_SECRET || 'development-only-secret-change-before-production';

if (process.env.NODE_ENV === 'production' && jwtSecret.length < 32) {
  throw new Error('JWT_SECRET must be at least 32 characters in production');
}

if (process.env.NODE_ENV === 'production') {
  const missingPush = ['VAPID_PUBLIC_KEY', 'VAPID_PRIVATE_KEY', 'VAPID_SUBJECT'].filter((name) => !process.env[name]);
  if (missingPush.length) throw new Error(`Missing required push notification variables: ${missingPush.join(', ')}`);
}

const parseOrigins = (value) => value
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);

const parsePositiveInteger = (name, fallback, { min = 1, max = 1_000_000 } = {}) => {
  const raw = process.env[name];
  if (raw === undefined || raw === '') return fallback;
  const parsed = Number(raw);
  if (!Number.isInteger(parsed) || parsed < min || parsed > max) {
    throw new Error(`${name} must be an integer between ${min} and ${max}`);
  }
  return parsed;
};

const clientUrl = process.env.CLIENT_URL || 'http://localhost:5173';
const allowedOrigins = parseOrigins(process.env.CORS_ORIGINS || clientUrl);
const isProduction = process.env.NODE_ENV === 'production';
const isTest = process.env.NODE_ENV === 'test';
const isDevelopment = !isProduction && !isTest;
const defaultWindowMs = parsePositiveInteger('RATE_LIMIT_WINDOW_MS', 15 * 60 * 1000, { min: 1000, max: 24 * 60 * 60 * 1000 });
const developmentMultiplier = isDevelopment ? 5 : 1;
const blockedChatWords = (process.env.CHAT_BLOCKED_WORDS || '')
  .split(',')
  .map((word) => word.trim().toLowerCase())
  .filter(Boolean);

const env = Object.freeze({
  nodeEnv: process.env.NODE_ENV || 'development',
  port: Number(process.env.PORT) || 5000,
  mongoUri: process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/footstream',
  jwtSecret,
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '8h',
  cookieName: process.env.COOKIE_NAME || 'footstream_token',
  cookieMaxAge: Number(process.env.COOKIE_MAX_AGE_MS) || 8 * 60 * 60 * 1000,
  clientUrl,
  allowedOrigins,
  appVersion: process.env.npm_package_version || '1.0.0',
  isProduction,
  isTest,
  trustProxy: process.env.TRUST_PROXY === undefined || process.env.TRUST_PROXY === ''
    ? (isProduction ? 1 : false)
    : process.env.TRUST_PROXY === 'true'
      ? 1
      : process.env.TRUST_PROXY === 'false'
        ? false
        : parsePositiveInteger('TRUST_PROXY', 1, { min: 1, max: 5 }),
  rateLimits: {
    windowMs: defaultWindowMs,
    globalMax: parsePositiveInteger('RATE_LIMIT_MAX', 1000 * developmentMultiplier, { min: 10, max: 100_000 }),
    authMax: parsePositiveInteger('AUTH_RATE_LIMIT_MAX', 10 * developmentMultiplier, { min: 1, max: 10_000 }),
    publicReadMax: parsePositiveInteger('PUBLIC_READ_RATE_LIMIT_MAX', 500 * developmentMultiplier, { min: 10, max: 100_000 }),
    chatMax: parsePositiveInteger('CHAT_RATE_LIMIT_MAX', 8, { min: 1, max: 1_000 }),
    searchMax: parsePositiveInteger('SEARCH_RATE_LIMIT_MAX', 120 * developmentMultiplier, { min: 10, max: 100_000 }),
    uploadMax: parsePositiveInteger('UPLOAD_RATE_LIMIT_MAX', 60 * developmentMultiplier, { min: 1, max: 10_000 }),
    joinRequestMax: parsePositiveInteger('JOIN_REQUEST_RATE_LIMIT_MAX', 5 * (isDevelopment ? 3 : 1), { min: 1, max: 10_000 }),
    followMax: parsePositiveInteger('FOLLOW_RATE_LIMIT_MAX', 60 * developmentMultiplier, { min: 5, max: 10_000 }),
    mutationMax: parsePositiveInteger('MUTATION_RATE_LIMIT_MAX', 300 * developmentMultiplier, { min: 10, max: 100_000 }),
  },
  moderation: {
    blockedChatWords,
  },
  push: {
    vapidPublicKey: process.env.VAPID_PUBLIC_KEY || '',
    vapidPrivateKey: process.env.VAPID_PRIVATE_KEY || '',
    vapidSubject: process.env.VAPID_SUBJECT || 'mailto:admin@example.com',
  },
  cloudinary: {
    cloudName: process.env.CLOUDINARY_CLOUD_NAME || '',
    apiKey: process.env.CLOUDINARY_API_KEY || '',
    apiSecret: process.env.CLOUDINARY_API_SECRET || '',
    folder: process.env.CLOUDINARY_FOLDER || 'footstream/matches',
  },
});

export default env;
