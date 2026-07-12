import app from './app.js';
import env from './config/env.js';
import { connectDatabase, disconnectDatabase } from './config/database.js';
import { createServer } from 'node:http';
import { initializeSocketServer } from './realtime/socketServer.js';

const server = createServer(app);
initializeSocketServer(server);

connectDatabase()
  .then(() => {
    console.log('MongoDB connected');
    server.listen(env.port, () => {
      console.log(`FootStream API listening on http://localhost:${env.port}`);
    });
  })
  .catch((error) => {
    console.error(`MongoDB connection failed: ${error.message}`);
    process.exit(1);
  });

const shutdown = async (signal) => {
  console.log(`${signal} received. Shutting down gracefully.`);
  server.close(async () => {
    await disconnectDatabase();
    process.exit(0);
  });

  setTimeout(() => process.exit(1), 10_000).unref();
};

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

process.on('unhandledRejection', (error) => {
  console.error('Unhandled rejection:', error);
});
