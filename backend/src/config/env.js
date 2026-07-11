import dotenv from 'dotenv';

dotenv.config();

const requiredInProduction = ['MONGODB_URI', 'JWT_SECRET', 'CLIENT_URL'];

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

const env = Object.freeze({
  nodeEnv: process.env.NODE_ENV || 'development',
  port: Number(process.env.PORT) || 5000,
  mongoUri: process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/footstream',
  jwtSecret,
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '8h',
  cookieName: process.env.COOKIE_NAME || 'footstream_token',
  cookieMaxAge: Number(process.env.COOKIE_MAX_AGE_MS) || 8 * 60 * 60 * 1000,
  clientUrl: process.env.CLIENT_URL || 'http://localhost:5173',
  isProduction: process.env.NODE_ENV === 'production',
  cloudinary: {
    cloudName: process.env.CLOUDINARY_CLOUD_NAME || '',
    apiKey: process.env.CLOUDINARY_API_KEY || '',
    apiSecret: process.env.CLOUDINARY_API_SECRET || '',
    folder: process.env.CLOUDINARY_FOLDER || 'footstream/matches',
  },
});

export default env;
