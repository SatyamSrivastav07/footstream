import { databaseStatus } from '../config/database.js';

export const getHealth = (_req, res) => {
  const database = databaseStatus();
  const healthy = database === 'connected';
  res.status(healthy ? 200 : 503).json({
    success: healthy,
    data: {
      service: 'footstream-api',
      status: healthy ? 'healthy' : 'degraded',
      database,
      uptimeSeconds: Math.floor(process.uptime()),
      timestamp: new Date().toISOString(),
    },
  });
};

