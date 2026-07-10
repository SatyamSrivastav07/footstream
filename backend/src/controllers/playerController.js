import Player from '../models/Player.js';
import Team from '../models/Team.js';
import AppError from '../utils/AppError.js';
import asyncHandler from '../utils/asyncHandler.js';
import {
  createPlayerForTeam,
  getPlayerForTeam,
  serializePlayers,
  softDeletePlayerForTeam,
  updatePlayerForTeam,
  updatePlayerStatusForTeam,
} from '../services/playerService.js';

const assignedTeamId = (req) => req.user.team?._id || req.user.team;

const buildFilter = (teamId, query) => {
  const filter = { team: teamId };
  if (query.search) filter.name = { $regex: query.search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), $options: 'i' };
  if (query.position) filter.position = query.position;
  if (query.availabilityStatus) filter.availabilityStatus = query.availabilityStatus;
  if (query.isActive !== undefined) filter.isActive = query.isActive;
  return filter;
};

export const listTeamPlayers = asyncHandler(async (req, res) => {
  const players = await Player.find(buildFilter(assignedTeamId(req), req.query))
    .select('-__v -createdBy -updatedBy')
    .sort({ position: 1, jerseyNumber: 1, name: 1 });
  res.json({ success: true, data: { players: serializePlayers(players) } });
});

export const createTeamPlayer = asyncHandler(async (req, res) => {
  const player = await createPlayerForTeam({
    teamId: assignedTeamId(req),
    userId: req.user._id,
    input: req.body,
  });
  res.status(201).json({ success: true, data: { player } });
});

export const getTeamPlayer = asyncHandler(async (req, res) => {
  const player = await getPlayerForTeam({ teamId: assignedTeamId(req), playerId: req.params.playerId });
  res.json({ success: true, data: { player } });
});

export const updateTeamPlayer = asyncHandler(async (req, res) => {
  const player = await updatePlayerForTeam({
    teamId: assignedTeamId(req),
    playerId: req.params.playerId,
    userId: req.user._id,
    input: req.body,
  });
  res.json({ success: true, data: { player } });
});

export const updateTeamPlayerStatus = asyncHandler(async (req, res) => {
  const player = await updatePlayerStatusForTeam({
    teamId: assignedTeamId(req),
    playerId: req.params.playerId,
    userId: req.user._id,
    input: req.body,
  });
  res.json({ success: true, data: { player } });
});

export const deleteTeamPlayer = asyncHandler(async (req, res) => {
  const player = await softDeletePlayerForTeam({
    teamId: assignedTeamId(req),
    playerId: req.params.playerId,
    userId: req.user._id,
  });
  res.json({ success: true, data: { player, message: 'Player deactivated.' } });
});

export const listPlayersForAdmin = asyncHandler(async (req, res) => {
  const team = await Team.findOne({ _id: req.params.teamId, isArchived: false }).select('name slug location');
  if (!team) throw new AppError('Team not found.', 404, 'TEAM_NOT_FOUND');

  const players = await Player.find({ team: team._id })
    .select('-__v -createdBy -updatedBy')
    .sort({ isActive: -1, position: 1, jerseyNumber: 1, name: 1 });
  res.json({ success: true, data: { team, players: serializePlayers(players) } });
});

