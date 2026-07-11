import express from 'express';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import env from './config/env.js';
import adminRoutes from './routes/adminRoutes.js';
import authRoutes from './routes/authRoutes.js';
import healthRoutes from './routes/healthRoutes.js';
import teamRoutes from './routes/teamRoutes.js';
import publicRoutes from './routes/publicRoutes.js';
import { errorHandler, notFound } from './middleware/errorHandler.js';

const app = express();

app.disable('x-powered-by');
app.set('trust proxy', env.isProduction ? 1 : false);
app.use(helmet({ contentSecurityPolicy: { directives: { frameSrc: ["'self'", 'https://www.youtube.com'] } } }));
app.use(cors({ origin: env.clientUrl, credentials: true, methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'] }));
app.use(express.json({ limit: '100kb' }));
app.use(express.urlencoded({ extended: false, limit: '100kb' }));
app.use(cookieParser());
app.use(morgan(env.isProduction ? 'combined' : 'dev'));

app.use('/api/health', healthRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/team', teamRoutes);
app.use('/api/public', publicRoutes);

app.use(notFound);
app.use(errorHandler);

export default app;
