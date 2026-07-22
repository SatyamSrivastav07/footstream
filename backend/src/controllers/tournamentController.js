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
import {
  buildTournamentReportHtml,
  calculateTournamentAwards,
  calculateTournamentStandings,
  calculateTournamentStatistics,
  createMatchFromTournamentFixture,
  createTournamentFixture,
  generateTournamentFixtures,
  listTournamentFixtures,
} from '../services/tournamentCompetitionService.js';

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

export const hostedTournamentFixtures = asyncHandler(async (req, res) => {
  const data = await listTournamentFixtures({ tournamentId: req.params.tournamentId, user: req.user, query: req.query });
  res.json({ success: true, data });
});

export const postHostedTournamentFixture = asyncHandler(async (req, res) => {
  const data = await createTournamentFixture({ tournamentId: req.params.tournamentId, user: req.user, input: req.body });
  res.status(201).json({ success: true, data });
});

export const postGenerateHostedFixtures = asyncHandler(async (req, res) => {
  const data = await generateTournamentFixtures({ tournamentId: req.params.tournamentId, user: req.user, input: req.body });
  res.status(201).json({ success: true, data });
});

export const postCreateMatchFromHostedFixture = asyncHandler(async (req, res) => {
  const data = await createMatchFromTournamentFixture({
    tournamentId: req.params.tournamentId,
    lineupId: req.params.lineupId,
    user: req.user,
    input: req.body,
  });
  res.status(201).json({ success: true, data });
});

export const hostedTournamentStandings = asyncHandler(async (req, res) => {
  const data = await calculateTournamentStandings({ tournamentId: req.params.tournamentId, user: req.user });
  res.json({ success: true, data });
});

export const hostedTournamentAwards = asyncHandler(async (req, res) => {
  const data = await calculateTournamentAwards({ tournamentId: req.params.tournamentId, user: req.user });
  res.json({ success: true, data });
});

export const hostedTournamentStatistics = asyncHandler(async (req, res) => {
  const data = await calculateTournamentStatistics({ tournamentId: req.params.tournamentId, user: req.user });
  res.json({ success: true, data });
});

export const hostedTournamentReport = asyncHandler(async (req, res) => {
  const { html } = await buildTournamentReportHtml({
    tournamentId: req.params.tournamentId,
    user: req.user,
    publicUrl: process.env.PUBLIC_APP_URL,
  });
  res.type('html').send(html);
});

export const adminTournamentFixtures = asyncHandler(async (req, res) => {
  const data = await listTournamentFixtures({ tournamentId: req.params.tournamentId, user: req.user, query: req.query });
  res.json({ success: true, data });
});

export const adminTournamentStandings = asyncHandler(async (req, res) => {
  const data = await calculateTournamentStandings({ tournamentId: req.params.tournamentId, user: req.user });
  res.json({ success: true, data });
});

export const adminTournamentAwards = asyncHandler(async (req, res) => {
  const data = await calculateTournamentAwards({ tournamentId: req.params.tournamentId, user: req.user });
  res.json({ success: true, data });
});

export const adminTournamentStatistics = asyncHandler(async (req, res) => {
  const data = await calculateTournamentStatistics({ tournamentId: req.params.tournamentId, user: req.user });
  res.json({ success: true, data });
});

export const adminTournamentReport = asyncHandler(async (req, res) => {
  const { html } = await buildTournamentReportHtml({
    tournamentId: req.params.tournamentId,
    user: req.user,
    publicUrl: process.env.PUBLIC_APP_URL,
  });
  res.type('html').send(html);
});

export const publicTournamentFixtures = asyncHandler(async (req, res) => {
  const data = await listTournamentFixtures({ publicSlug: req.params.slug, query: req.query });
  res.json({ success: true, data });
});

export const publicTournamentResults = asyncHandler(async (req, res) => {
  const data = await listTournamentFixtures({ publicSlug: req.params.slug, query: { ...req.query, status: 'completed' } });
  res.json({ success: true, data: { ...data, results: data.fixtures.filter((fixture) => fixture.type === 'match' && fixture.status === 'completed') } });
});

export const publicTournamentStandings = asyncHandler(async (req, res) => {
  const data = await calculateTournamentStandings({ publicSlug: req.params.slug });
  res.json({ success: true, data });
});

export const publicTournamentBracket = asyncHandler(async (req, res) => {
  const data = await listTournamentFixtures({ publicSlug: req.params.slug, query: req.query });
  res.json({
    success: true,
    data: {
      tournament: data.tournament,
      bracket: data.fixtures.filter((fixture) => String(fixture.stage || '').toLowerCase().includes('knockout') || String(fixture.stage || '').toLowerCase().includes('final')),
    },
  });
});

export const publicTournamentAwards = asyncHandler(async (req, res) => {
  const data = await calculateTournamentAwards({ publicSlug: req.params.slug });
  res.json({ success: true, data });
});

export const publicTournamentStatistics = asyncHandler(async (req, res) => {
  const data = await calculateTournamentStatistics({ publicSlug: req.params.slug });
  res.json({ success: true, data });
});

export const publicTournamentReport = asyncHandler(async (req, res) => {
  const { html } = await buildTournamentReportHtml({
    publicSlug: req.params.slug,
    publicUrl: process.env.PUBLIC_APP_URL,
  });
  res.type('html').send(html);
});
