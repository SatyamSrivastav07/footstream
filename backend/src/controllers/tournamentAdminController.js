import asyncHandler from '../utils/asyncHandler.js';
import {
  approveTournament,
  archiveTournament,
  getAdminReviewHistory,
  getTournamentForAdmin,
  listTournamentsForAdmin,
  rejectTournament,
  requestChanges,
  suspendTournament,
  unsuspendTournament,
} from '../services/tournamentReviewService.js';

export const adminListTournaments = asyncHandler(async (req, res) => {
  const data = await listTournamentsForAdmin({ query: req.query });
  res.json({ success: true, data });
});

export const adminGetTournament = asyncHandler(async (req, res) => {
  const tournament = await getTournamentForAdmin({ tournamentId: req.params.tournamentId });
  res.json({ success: true, data: { tournament } });
});

export const adminTournamentReviewHistory = asyncHandler(async (req, res) => {
  const data = await getAdminReviewHistory({ tournamentId: req.params.tournamentId, query: req.query });
  res.json({ success: true, data });
});

export const adminApproveTournament = asyncHandler(async (req, res) => {
  const tournament = await approveTournament({ tournamentId: req.params.tournamentId, actor: req.user, message: req.body.message || '' });
  res.json({ success: true, data: { tournament } });
});

export const adminRejectTournament = asyncHandler(async (req, res) => {
  const tournament = await rejectTournament({ tournamentId: req.params.tournamentId, actor: req.user, message: req.body.reason });
  res.json({ success: true, data: { tournament } });
});

export const adminRequestChanges = asyncHandler(async (req, res) => {
  const tournament = await requestChanges({ tournamentId: req.params.tournamentId, actor: req.user, message: req.body.message });
  res.json({ success: true, data: { tournament } });
});

export const adminSuspendTournament = asyncHandler(async (req, res) => {
  const tournament = await suspendTournament({ tournamentId: req.params.tournamentId, actor: req.user, message: req.body.reason });
  res.json({ success: true, data: { tournament } });
});

export const adminUnsuspendTournament = asyncHandler(async (req, res) => {
  const tournament = await unsuspendTournament({ tournamentId: req.params.tournamentId, actor: req.user, message: req.body.message || '' });
  res.json({ success: true, data: { tournament } });
});

export const adminArchiveTournament = asyncHandler(async (req, res) => {
  const tournament = await archiveTournament({ tournamentId: req.params.tournamentId, actor: req.user, message: req.body.reason || '' });
  res.json({ success: true, data: { tournament } });
});
