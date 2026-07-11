import asyncHandler from '../utils/asyncHandler.js';
import { configureStream, getAdminStream, getOwnedStream, getPublicStream, removeStream, setStreamStatus } from '../services/streamService.js';

const teamId = (req) => req.user.team?._id || req.user.team;

export const readOwnedStream = asyncHandler(async (req, res) => res.json({ success: true, data: { stream: await getOwnedStream({ matchId: req.params.matchId, teamId: teamId(req) }) } }));
export const putOwnedStream = asyncHandler(async (req, res) => res.json({ success: true, data: { stream: await configureStream({ matchId: req.params.matchId, teamId: teamId(req), userId: req.user._id, input: req.body }) } }));
export const patchOwnedStreamStatus = asyncHandler(async (req, res) => res.json({ success: true, data: { stream: await setStreamStatus({ matchId: req.params.matchId, teamId: teamId(req), userId: req.user._id, isEnabled: req.body.isEnabled }) } }));
export const deleteOwnedStream = asyncHandler(async (req, res) => { await removeStream({ matchId: req.params.matchId, teamId: teamId(req), userId: req.user._id }); res.json({ success: true, data: { message: 'Stream configuration removed.' } }); });
export const readPublicStream = asyncHandler(async (req, res) => res.json({ success: true, data: { stream: await getPublicStream({ matchId: req.params.matchId }) } }));
export const readAdminStream = asyncHandler(async (req, res) => res.json({ success: true, data: await getAdminStream({ matchId: req.params.matchId }) }));
