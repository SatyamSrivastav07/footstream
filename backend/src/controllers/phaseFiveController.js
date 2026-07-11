import Match from '../models/Match.js';
import MatchPhoto from '../models/MatchPhoto.js';
import Player from '../models/Player.js';
import asyncHandler from '../utils/asyncHandler.js';
import AppError from '../utils/AppError.js';
import { confirmResult, getResultBundle } from '../services/resultService.js';
import { getLeaderboards, getPlayerStatistics, loadTeamData } from '../services/statisticsService.js';
import { removePhoto, uploadPhotos } from '../services/photoService.js';

const ownedTeamId = (req) => req.user.team?._id || req.user.team;
const requestedTeamId = (req) => req.params.teamId || ownedTeamId(req);

const resultReader = (owned) => asyncHandler(async (req, res) => res.json({ success: true, data: await getResultBundle({ matchId: req.params.matchId, ...(owned ? { teamId: ownedTeamId(req) } : {}) }) }));
export const getTeamResult = resultReader(true);
export const getAnyResult = resultReader(false);
export const patchTeamResult = asyncHandler(async (req, res) => res.json({ success: true, data: await confirmResult({ matchId: req.params.matchId, teamId: ownedTeamId(req), userId: req.user._id, input: req.body }) }));

const photoReader = (owned) => asyncHandler(async (req, res) => {
  const matchFilter = { _id: req.params.matchId, isActive: true, status: 'completed' };
  if (owned) matchFilter.team = ownedTeamId(req);
  const match = await Match.findOne(matchFilter).select('_id');
  if (!match) throw new AppError('Completed match not found.', 404, 'COMPLETED_MATCH_NOT_FOUND');
  const photos = await MatchPhoto.find({ match: match._id, isActive: true }).sort({ createdAt: -1 });
  res.json({ success: true, data: { photos } });
});
export const getTeamPhotos = photoReader(true);
export const getAnyPhotos = photoReader(false);
export const postTeamPhotos = asyncHandler(async (req, res) => {
  const photos = await uploadPhotos({ matchId: req.params.matchId, teamId: ownedTeamId(req), userId: req.user._id, files: req.files, caption: req.body.caption || '', category: req.body.category || 'other' });
  res.status(201).json({ success: true, data: { photos } });
});
export const patchTeamPhoto = asyncHandler(async (req, res) => {
  const photo = await MatchPhoto.findOneAndUpdate({ _id: req.params.photoId, match: req.params.matchId, team: ownedTeamId(req), isActive: true }, { $set: req.body }, { new: true, runValidators: true });
  if (!photo) throw new AppError('Photo not found.', 404, 'PHOTO_NOT_FOUND');
  res.json({ success: true, data: { photo } });
});
export const deleteTeamPhoto = asyncHandler(async (req, res) => { await removePhoto({ matchId: req.params.matchId, photoId: req.params.photoId, teamId: ownedTeamId(req) }); res.json({ success: true, data: { message: 'Photo deleted.' } }); });

export const getTeamStatistics = asyncHandler(async (req, res) => { const data = await loadTeamData({ teamId: requestedTeamId(req) }); res.json({ success: true, data: { statistics: data.team } }); });
export const getPlayerStats = asyncHandler(async (req, res) => res.json({ success: true, data: await getPlayerStatistics({ playerId: req.params.playerId, ...(req.user?.role === 'teamAdmin' ? { teamId: ownedTeamId(req) } : {}) }) }));
export const getTeamLeaderboards = asyncHandler(async (req, res) => { const items = await getLeaderboards({ teamId: requestedTeamId(req), type: req.query.type || 'goals', limit: Number(req.query.limit) || 10 }); res.json({ success: true, data: { type: req.query.type || 'goals', items } }); });
export const getTeamHistory = asyncHandler(async (req, res) => {
  const data = await loadTeamData({ teamId: requestedTeamId(req) });
  const from = req.query.from ? new Date(req.query.from) : null; const to = req.query.to ? new Date(req.query.to) : null;
  if (to && /^\d{4}-\d{2}-\d{2}$/.test(req.query.to)) to.setUTCHours(23, 59, 59, 999);
  const history = data.history.filter((item) => (!from || new Date(item.scheduledAt) >= from) && (!to || new Date(item.scheduledAt) <= to) && (!req.query.opponent || item.opponentName.toLowerCase().includes(req.query.opponent.toLowerCase())) && (!req.query.tournament || item.tournament.toLowerCase().includes(req.query.tournament.toLowerCase())) && (!req.query.outcome || item.outcome === req.query.outcome));
  res.json({ success: true, data: { history } });
});

export const getAdminPlayerStats = asyncHandler(async (req, res) => { const player = await Player.findById(req.params.playerId).select('team'); if (!player) throw new AppError('Player not found.', 404, 'PLAYER_NOT_FOUND'); res.json({ success: true, data: await getPlayerStatistics({ playerId: player._id }) }); });
