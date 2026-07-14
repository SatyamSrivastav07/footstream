import Match from '../models/Match.js';
import asyncHandler from '../utils/asyncHandler.js';
import AppError from '../utils/AppError.js';
import {
  cancelMatchForTeam,
  createMatchForTeam,
  getParticipantMatch,
  listOpponentPlayers,
  listOpponentTeams,
  serializeMatchForTeam,
  softDeleteMatchForTeam,
  sortMatchesForDisplay,
  teamMatchParticipantFilter,
  updateMatchForTeam,
} from '../services/matchService.js';

const teamId = (req) => req.user.team?._id || req.user.team;
const safeRegex = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const matchFilter = (query) => {
  const filter = { isActive: true };
  if (query.teamId) filter.team = query.teamId;
  if (query.status) filter.status = query.status;
  if (query.matchType) filter.matchType = query.matchType;
  if (query.from || query.to) {
    filter.scheduledAt = {};
    if (query.from) filter.scheduledAt.$gte = new Date(query.from);
    if (query.to) {
      const end = new Date(query.to);
      if (/^\d{4}-\d{2}-\d{2}$/.test(query.to)) end.setUTCHours(23, 59, 59, 999);
      filter.scheduledAt.$lte = end;
    }
  }
  if (query.search) filter['opponent.name'] = { $regex: safeRegex(query.search), $options: 'i' };
  return filter;
};

const findMatches = async (filter) => {
  const matches = await Match.find(filter)
    .select('-__v -createdBy -updatedBy')
    .populate('team', 'name slug logo')
    .populate('registeredOpponentTeam', 'name slug logo')
    .lean();
  return sortMatchesForDisplay(matches);
};

export const listTeamMatches = asyncHandler(async (req, res) => {
  const baseQuery = { ...req.query };
  delete baseQuery.teamId;
  delete baseQuery.search;
  const rawMatches = await findMatches(teamMatchParticipantFilter(teamId(req), matchFilter(baseQuery)));
  const matches = rawMatches
    .map((match) => serializeMatchForTeam(match, teamId(req)))
    .filter((match) => !req.query.search || match.opponent.name.toLowerCase().includes(req.query.search.toLowerCase()));
  res.json({ success: true, data: { matches, sort: 'upcoming-ascending-then-past-descending' } });
});

export const createTeamMatch = asyncHandler(async (req, res) => {
  const match = await createMatchForTeam({ teamId: teamId(req), userId: req.user._id, input: req.body });
  res.status(201).json({ success: true, data: { match } });
});

export const getTeamMatch = asyncHandler(async (req, res) => {
  const match = await getParticipantMatch({ teamId: teamId(req), matchId: req.params.matchId });
  res.json({ success: true, data: { match } });
});

export const updateTeamMatch = asyncHandler(async (req, res) => {
  const match = await updateMatchForTeam({
    teamId: teamId(req), matchId: req.params.matchId, userId: req.user._id, input: req.body,
  });
  res.json({ success: true, data: { match } });
});

export const getOpponentPlayers = asyncHandler(async (req, res) => {
  const data = await listOpponentPlayers({ hostTeamId: teamId(req), opponentTeamId: req.params.teamId });
  res.json({ success: true, data });
});

export const getOpponentTeams = asyncHandler(async (req, res) => {
  const data = await listOpponentTeams({ hostTeamId: teamId(req), query: req.query });
  res.json({ success: true, data });
});

export const cancelTeamMatch = asyncHandler(async (req, res) => {
  const match = await cancelMatchForTeam({ teamId: teamId(req), matchId: req.params.matchId, userId: req.user._id });
  res.json({ success: true, data: { match, message: 'Match cancelled.' } });
});

export const deleteTeamMatch = asyncHandler(async (req, res) => {
  await softDeleteMatchForTeam({ teamId: teamId(req), matchId: req.params.matchId, userId: req.user._id });
  res.json({ success: true, data: { message: 'Scheduled match deleted.' } });
});

export const listAdminMatches = asyncHandler(async (req, res) => {
  const matches = await findMatches(matchFilter(req.query));
  res.json({ success: true, data: { matches, sort: 'upcoming-ascending-then-past-descending' } });
});

export const getAdminMatch = asyncHandler(async (req, res) => {
  const match = await Match.findOne({ _id: req.params.matchId, isActive: true })
    .select('-__v -createdBy -updatedBy')
    .populate('team', 'name slug logo')
    .populate('registeredOpponentTeam', 'name slug logo');
  if (!match) throw new AppError('Match not found.', 404, 'MATCH_NOT_FOUND');
  res.json({ success: true, data: { match } });
});
