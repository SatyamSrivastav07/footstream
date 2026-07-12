import { databaseStatus } from '../config/database.js';
import env from '../config/env.js';
import { cloudinaryStatus } from '../config/cloudinary.js';

const healthPayload = () => {
  const database = databaseStatus();
  const cloudinary = cloudinaryStatus();
  const healthy = database === 'connected';
  return {
    healthy,
    payload: {
      status: healthy ? 'healthy' : 'degraded',
      uptime: Math.floor(process.uptime()),
      database,
      cloudinary,
      version: env.appVersion,
      environment: env.nodeEnv,
    },
  };
};

export const getHealth = (_req, res) => {
  const { healthy, payload } = healthPayload();
  res.status(healthy ? 200 : 503).json({
    success: healthy,
    data: payload,
  });
};

export const getReadiness = (_req, res) => {
  const { healthy, payload } = healthPayload();
  res.status(healthy ? 200 : 503).json({
    success: healthy,
    data: {
      ...payload,
      ready: healthy,
    },
  });
};
