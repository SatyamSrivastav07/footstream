import mongoose from 'mongoose';
import env from './env.js';

mongoose.set('strictQuery', true);

export const connectDatabase = async () => {
  await mongoose.connect(env.mongoUri, {
    serverSelectionTimeoutMS: 5000,
  });
  return mongoose.connection;
};

export const disconnectDatabase = async () => {
  if (mongoose.connection.readyState !== 0) {
    await mongoose.disconnect();
  }
};

export const databaseStatus = () => {
  const states = ['disconnected', 'connected', 'connecting', 'disconnecting'];
  return states[mongoose.connection.readyState] || 'unknown';
};

