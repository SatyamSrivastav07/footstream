import { Server } from 'socket.io';
import mongoose from 'mongoose';
import env from '../config/env.js';
import Match from '../models/Match.js';
import { setRealtimeServer } from './realtimeHub.js';
import AppError from '../utils/AppError.js';

export const isValidMatchRoomId = (matchId) => mongoose.isValidObjectId(matchId);

const publicViewers = new Map();
const socketPublicRooms = new Map();
const roomName = (matchId) => `match:${matchId}`;
const publicCount = (matchId) => publicViewers.get(String(matchId))?.size || 0;
const emitViewerCount = (io, matchId) => {
  io.to(roomName(matchId)).emit('match:viewer-count', { matchId, count: publicCount(matchId) });
};

export const initializeSocketServer = (httpServer) => {
  const io = new Server(httpServer, {
    cors: {
      origin: (origin, callback) => {
        if (!origin || env.allowedOrigins.includes(origin)) return callback(null, true);
        return callback(new AppError('Origin is not allowed by Socket.IO CORS.', 403, 'SOCKET_CORS_ORIGIN_BLOCKED'));
      },
      credentials: true,
      methods: ['GET', 'POST'],
    },
  });

  io.on('connection', (socket) => {
    socket.on('join-match', async (payload, acknowledge) => {
      const matchId = typeof payload === 'object' && payload !== null ? payload.matchId : payload;
      const publicViewer = typeof payload === 'object' && payload?.mode === 'public';
      if (!isValidMatchRoomId(matchId)) {
        const error = { code: 'INVALID_MATCH_ID', message: 'Invalid match identifier.' };
        socket.emit('match:error', error);
        if (typeof acknowledge === 'function') acknowledge({ ok: false, error });
        return;
      }
      try {
        const exists = await Match.exists({ _id: matchId, isActive: true });
        if (!exists) {
          const error = { code: 'MATCH_NOT_FOUND', message: 'Match not found.' };
          socket.emit('match:error', error);
          if (typeof acknowledge === 'function') acknowledge({ ok: false, error });
          return;
        }
        await socket.join(roomName(matchId));
        if (publicViewer) {
          const key = String(matchId);
          const viewers = publicViewers.get(key) || new Set();
          viewers.add(socket.id);
          publicViewers.set(key, viewers);
          const joined = socketPublicRooms.get(socket.id) || new Set();
          joined.add(key);
          socketPublicRooms.set(socket.id, joined);
          emitViewerCount(io, key);
        }
        if (typeof acknowledge === 'function') acknowledge({ ok: true });
      } catch {
        const error = { code: 'LIVE_JOIN_FAILED', message: 'Live updates are temporarily unavailable.' };
        socket.emit('match:error', error);
        if (typeof acknowledge === 'function') acknowledge({ ok: false, error });
      }
    });

    socket.on('leave-match', async (matchId) => {
      if (isValidMatchRoomId(matchId)) {
        const key = String(matchId);
        await socket.leave(roomName(key));
        const viewers = publicViewers.get(key);
        if (viewers?.delete(socket.id)) {
          if (viewers.size === 0) publicViewers.delete(key);
          socketPublicRooms.get(socket.id)?.delete(key);
          emitViewerCount(io, key);
        }
      }
    });

    socket.on('disconnect', () => {
      const joined = socketPublicRooms.get(socket.id);
      if (!joined) return;
      for (const matchId of joined) {
        const viewers = publicViewers.get(matchId);
        if (viewers?.delete(socket.id)) {
          if (viewers.size === 0) publicViewers.delete(matchId);
          emitViewerCount(io, matchId);
        }
      }
      socketPublicRooms.delete(socket.id);
    });
  });

  setRealtimeServer(io);
  return io;
};
