import express from 'express';
import cookieParser from 'cookie-parser';
import compression from 'compression';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import env from './config/env.js';
import adminRoutes from './routes/adminRoutes.js';
import authRoutes from './routes/authRoutes.js';
import healthRoutes from './routes/healthRoutes.js';
import notificationRoutes from './routes/notificationRoutes.js';
import teamRoutes from './routes/teamRoutes.js';
import publicRoutes from './routes/publicRoutes.js';
import { getHealth, getReadiness } from './controllers/healthController.js';
import { imageCacheHeaders, publicCacheHeaders } from './middleware/cacheHeaders.js';
import { errorHandler, notFound } from './middleware/errorHandler.js';
import { requestId } from './middleware/requestId.js';
import AppError from './utils/AppError.js';
import { publicReadLimiter, searchLimiter } from './middleware/rateLimiters.js';

const app = express();
const corsOptions = {
  origin: (origin, callback) => {
    if (!origin || env.allowedOrigins.includes(origin)) return callback(null, true);
    return callback(new AppError('Origin is not allowed by CORS.', 403, 'CORS_ORIGIN_BLOCKED'));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Request-Id', 'X-Follower-Session-Id'],
};
app.disable('x-powered-by');
app.set('trust proxy', env.trustProxy);
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
app.use('/api/auth', authRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/team', teamRoutes);
app.use('/api/public/search', searchLimiter);
app.use('/api/public', publicReadLimiter, publicRoutes);

app.use(notFound);
app.use(errorHandler);

export default app;
