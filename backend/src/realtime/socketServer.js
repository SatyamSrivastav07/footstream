import { Server } from 'socket.io';
import mongoose from 'mongoose';
import env from '../config/env.js';
import Match from '../models/Match.js';
import { setRealtimeServer } from './realtimeHub.js';

export const isValidMatchRoomId = (matchId) => mongoose.isValidObjectId(matchId);

export const initializeSocketServer = (httpServer) => {
  const io = new Server(httpServer, {
    cors: { origin: env.clientUrl, credentials: true, methods: ['GET', 'POST'] },
  });

  io.on('connection', (socket) => {
    socket.on('join-match', async (matchId, acknowledge) => {
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
        await socket.join(`match:${matchId}`);
        if (typeof acknowledge === 'function') acknowledge({ ok: true });
      } catch {
        const error = { code: 'LIVE_JOIN_FAILED', message: 'Live updates are temporarily unavailable.' };
        socket.emit('match:error', error);
        if (typeof acknowledge === 'function') acknowledge({ ok: false, error });
      }
    });

    socket.on('leave-match', async (matchId) => {
      if (isValidMatchRoomId(matchId)) await socket.leave(`match:${matchId}`);
    });
  });

  setRealtimeServer(io);
  return io;
};
