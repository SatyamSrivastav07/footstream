import { Server } from 'socket.io';
import mongoose from 'mongoose';
import env from '../config/env.js';
import Match from '../models/Match.js';
import User, { USER_ROLES } from '../models/User.js';
import { setRealtimeServer } from './realtimeHub.js';
import AppError from '../utils/AppError.js';
import { verifyToken } from '../utils/token.js';
import { assertActiveAccount } from '../services/playerService.js';
import { assertTeamOperational } from '../services/teamStatusTransitions.js';

export const isValidMatchRoomId = (matchId) => mongoose.isValidObjectId(matchId);

const publicViewers = new Map();
const socketPublicRooms = new Map();
const roomName = (matchId) => `match:${matchId}`;
const teamRoomName = (teamId) => `team:${teamId}`;
const teamAdminsCommunityRoomName = 'team-admins:community';
const publicCount = (matchId) => publicViewers.get(String(matchId))?.size || 0;
const emitViewerCount = (io, matchId) => {
  io.to(roomName(matchId)).emit('match:viewer-count', { matchId, count: publicCount(matchId) });
};

const parseCookies = (header = '') => Object.fromEntries(
  String(header)
    .split(';')
    .map((part) => part.trim())
    .filter(Boolean)
    .map((part) => {
      const index = part.indexOf('=');
      if (index === -1) return [part, ''];
      return [part.slice(0, index), decodeURIComponent(part.slice(index + 1))];
    }),
);

export const authenticateTeamSocket = async (socket) => {
  const token = parseCookies(socket.handshake.headers.cookie || '')[env.cookieName];
  if (!token) throw new AppError('Authentication is required for team admin chat.', 401, 'AUTH_REQUIRED');
  let payload;
  try {
    payload = verifyToken(token);
  } catch {
    throw new AppError('Your session is invalid or has expired.', 401, 'INVALID_SESSION');
  }
  const user = await User.findById(payload.sub).populate('team', 'name slug isArchived status');
  if (!user) throw new AppError('This account is unavailable.', 401, 'ACCOUNT_UNAVAILABLE');
  assertActiveAccount(user);
  if (user.role !== USER_ROLES.TEAM_ADMIN || !user.team) {
    throw new AppError('Team admin chat is available only to assigned team administrators.', 403, 'TEAM_ADMIN_CHAT_FORBIDDEN');
  }
  assertTeamOperational(user.team);
  return { userId: String(user._id), teamId: String(user.team._id || user.team), teamName: user.team.name || 'Your team' };
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
    const teamAuthPromise = authenticateTeamSocket(socket)
      .then(async (auth) => {
        socket.data.teamChatAuth = auth;
        await socket.join(teamRoomName(auth.teamId));
        await socket.join(teamAdminsCommunityRoomName);
        socket.emit('team-admin-chat:connected', { teamId: auth.teamId, teamName: auth.teamName });
        return auth;
      })
      .catch((error) => {
        socket.data.teamChatAuthError = {
          code: error.code || 'TEAM_ADMIN_CHAT_AUTH_FAILED',
          message: error.message || 'Team admin chat is unavailable for this session.',
        };
        return null;
      });

    socket.on('join-team-admin-chat', async (_payload, acknowledge) => {
      const auth = await teamAuthPromise;
      if (!auth) {
        const error = socket.data.teamChatAuthError || { code: 'TEAM_ADMIN_CHAT_AUTH_FAILED', message: 'Team admin chat is unavailable for this session.' };
        socket.emit('team-admin-chat:error', error);
        if (typeof acknowledge === 'function') acknowledge({ ok: false, error });
        return;
      }
      await socket.join(teamRoomName(auth.teamId));
      await socket.join(teamAdminsCommunityRoomName);
      if (typeof acknowledge === 'function') acknowledge({ ok: true, teamId: auth.teamId, teamName: auth.teamName });
    });

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
