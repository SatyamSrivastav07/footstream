import asyncHandler from '../utils/asyncHandler.js';
import {
  createHostedTournamentDraft,
  deleteHostedTournamentDraft,
  getHostedTournament,
  getPublicTournamentBySlug,
  getTeamAccessibleTournament,
  listHostedTournaments,
  listPublicTournaments,
  listTeamAccessibleTournaments,
  publishTournament,
  resubmitForApproval,
  submitForApproval,
  unpublishTournament,
  updateHostedTournament,
} from '../services/tournamentService.js';
import { getHostReviewHistory } from '../services/tournamentReviewService.js';

export const createHostedTournament = asyncHandler(async (req, res) => {
  const tournament = await createHostedTournamentDraft({ user: req.user, input: req.body });
  res.status(201).json({ success: true, data: { tournament } });
});

export const listHosted = asyncHandler(async (req, res) => {
  const data = await listHostedTournaments({ user: req.user, query: req.query });
  res.json({ success: true, data });
});

export const getHosted = asyncHandler(async (req, res) => {
  const tournament = await getHostedTournament({ user: req.user, tournamentId: req.params.tournamentId });
  res.json({ success: true, data: { tournament } });
});

export const updateHosted = asyncHandler(async (req, res) => {
  const tournament = await updateHostedTournament({ user: req.user, tournamentId: req.params.tournamentId, input: req.body });
  res.json({ success: true, data: { tournament } });
});

export const deleteHosted = asyncHandler(async (req, res) => {
  const result = await deleteHostedTournamentDraft({ user: req.user, tournamentId: req.params.tournamentId });
  res.json({ success: true, data: result });
});

export const submitHosted = asyncHandler(async (req, res) => {
  const tournament = await submitForApproval({ user: req.user, tournamentId: req.params.tournamentId });
  res.json({ success: true, data: { tournament } });
});

export const resubmitHosted = asyncHandler(async (req, res) => {
  const tournament = await resubmitForApproval({ user: req.user, tournamentId: req.params.tournamentId });
  res.json({ success: true, data: { tournament } });
});

export const publishHosted = asyncHandler(async (req, res) => {
  const tournament = await publishTournament({ user: req.user, tournamentId: req.params.tournamentId });
  res.json({ success: true, data: { tournament } });
});

export const unpublishHosted = asyncHandler(async (req, res) => {
  const tournament = await unpublishTournament({ user: req.user, tournamentId: req.params.tournamentId });
  res.json({ success: true, data: { tournament } });
});

export const hostedReviewHistory = asyncHandler(async (req, res) => {
  const data = await getHostReviewHistory({ tournamentId: req.params.tournamentId, hostTeamId: req.user.team, query: req.query });
  res.json({ success: true, data });
});

export const listTeamTournaments = asyncHandler(async (req, res) => {
  const data = await listTeamAccessibleTournaments({ user: req.user, query: req.query });
  res.json({ success: true, data });
});

export const getTeamTournament = asyncHandler(async (req, res) => {
  const tournament = await getTeamAccessibleTournament({ user: req.user, tournamentId: req.params.tournamentId });
  res.json({ success: true, data: { tournament } });
});

export const publicTournaments = asyncHandler(async (req, res) => {
  const data = await listPublicTournaments({ query: req.query });
  res.json({ success: true, data });
});

export const publicTournamentDetail = asyncHandler(async (req, res) => {
  const data = await getPublicTournamentBySlug({ slug: req.params.slug });
  res.json({ success: true, data });
});
