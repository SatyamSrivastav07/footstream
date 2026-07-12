import express from 'express';
import cookieParser from 'cookie-parser';
import compression from 'compression';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import { rateLimit } from 'express-rate-limit';
import env from './config/env.js';
import adminRoutes from './routes/adminRoutes.js';
import authRoutes from './routes/authRoutes.js';
import healthRoutes from './routes/healthRoutes.js';
import teamRoutes from './routes/teamRoutes.js';
import publicRoutes from './routes/publicRoutes.js';
import { getHealth, getReadiness } from './controllers/healthController.js';
import { imageCacheHeaders, publicCacheHeaders } from './middleware/cacheHeaders.js';
import { errorHandler, notFound } from './middleware/errorHandler.js';
import { requestId } from './middleware/requestId.js';
import AppError from './utils/AppError.js';

const app = express();
const corsOptions = {
  origin: (origin, callback) => {
    if (!origin || env.allowedOrigins.includes(origin)) return callback(null, true);
    return callback(new AppError('Origin is not allowed by CORS.', 403, 'CORS_ORIGIN_BLOCKED'));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Request-Id'],
};
const rateLimitHandler = (_req, _res, next) => next(new AppError('Too many requests. Try again later.', 429, 'RATE_LIMITED'));
const authLimiter = rateLimit({ windowMs: 15 * 60 * 1000, limit: 30, standardHeaders: 'draft-8', legacyHeaders: false, handler: rateLimitHandler });
const uploadLimiter = rateLimit({ windowMs: 15 * 60 * 1000, limit: 60, standardHeaders: 'draft-8', legacyHeaders: false, handler: rateLimitHandler });
const searchLimiter = rateLimit({ windowMs: 60 * 1000, limit: 120, standardHeaders: 'draft-8', legacyHeaders: false, handler: rateLimitHandler });

app.disable('x-powered-by');
app.set('trust proxy', env.isProduction ? 1 : false);
app.use(requestId);
app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' },
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      frameSrc: ["'self'", 'https://www.youtube.com', 'https://www.youtube-nocookie.com'],
      imgSrc: ["'self'", 'data:', 'https://res.cloudinary.com'],
    },
  },
}));
app.use(compression());
app.use(cors(corsOptions));
app.use(express.json({ limit: '100kb' }));
app.use(express.urlencoded({ extended: false, limit: '100kb' }));
app.use(cookieParser());
app.use(morgan(env.isProduction ? 'combined' : 'dev'));

app.get('/health', getHealth);
app.get('/ready', getReadiness);
app.use('/api/health', healthRoutes);
app.use('/api/public', publicCacheHeaders);
app.use(imageCacheHeaders);
app.use('/api/auth', authLimiter, authRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/team', uploadLimiter, teamRoutes);
app.use('/uploads', uploadLimiter);
app.use('/api/public/search', searchLimiter);
app.use('/api/public', publicRoutes);

app.use(notFound);
app.use(errorHandler);

export default app;
