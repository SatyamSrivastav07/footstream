import asyncHandler from '../utils/asyncHandler.js';
import {
  addManualSquadPlayer,
  addRegisteredSquadPlayer,
  approveSquad,
  getAdminTournamentSquad,
  getAdminTournamentSquadHistory,
  getHostedSquad,
  getHostedSquadHistory,
  getOrCreateSquad,
  getParticipantTeamMySquad,
  getPublicTournamentParticipantSquad,
  listAdminTournamentSquads,
  listEligiblePlayers,
  listHostedSquads,
  lockSquad,
  removeSquadPlayer,
  removeSquadPlayerPhoto,
  setCaptain,
  setViceCaptain,
  submitSquad,
  unlockSquad,
  updateSquadPlayer,
  uploadSquadPlayerPhoto,
} from '../services/tournamentSquadService.js';

export const hostedSquads = asyncHandler(async (req, res) => {
  const data = await listHostedSquads({ user: req.user, tournamentId: req.params.tournamentId });
  res.json({ success: true, data });
});

export const createParticipantSquad = asyncHandler(async (req, res) => {
  const data = await getOrCreateSquad({ user: req.user, tournamentId: req.params.tournamentId, participantId: req.params.participantId });
  res.status(201).json({ success: true, data });
});

export const readParticipantSquad = asyncHandler(async (req, res) => {
  const data = await getHostedSquad({ user: req.user, tournamentId: req.params.tournamentId, participantId: req.params.participantId });
  res.json({ success: true, data });
});

export const patchParticipantSquad = asyncHandler(async (req, res) => {
  const data = await getHostedSquad({ user: req.user, tournamentId: req.params.tournamentId, participantId: req.params.participantId });
  res.json({ success: true, data });
});

export const submitParticipantSquad = asyncHandler(async (req, res) => {
  const data = await submitSquad({ user: req.user, tournamentId: req.params.tournamentId, participantId: req.params.participantId });
  res.json({ success: true, data });
});

export const approveParticipantSquad = asyncHandler(async (req, res) => {
  const data = await approveSquad({ user: req.user, tournamentId: req.params.tournamentId, participantId: req.params.participantId });
  res.json({ success: true, data });
});

export const lockParticipantSquad = asyncHandler(async (req, res) => {
  const data = await lockSquad({ user: req.user, tournamentId: req.params.tournamentId, participantId: req.params.participantId });
  res.json({ success: true, data });
});

export const unlockParticipantSquad = asyncHandler(async (req, res) => {
  const data = await unlockSquad({ user: req.user, tournamentId: req.params.tournamentId, participantId: req.params.participantId });
  res.json({ success: true, data });
});

export const participantSquadHistory = asyncHandler(async (req, res) => {
  const data = await getHostedSquadHistory({ user: req.user, tournamentId: req.params.tournamentId, participantId: req.params.participantId, query: req.query });
  res.json({ success: true, data });
});

export const eligiblePlayers = asyncHandler(async (req, res) => {
  const data = await listEligiblePlayers({ user: req.user, tournamentId: req.params.tournamentId, participantId: req.params.participantId, query: req.query });
  res.json({ success: true, data });
});

export const postRegisteredSquadPlayer = asyncHandler(async (req, res) => {
  const data = await addRegisteredSquadPlayer({ user: req.user, tournamentId: req.params.tournamentId, participantId: req.params.participantId, input: req.body });
  res.status(201).json({ success: true, data });
});

export const postManualSquadPlayer = asyncHandler(async (req, res) => {
  const data = await addManualSquadPlayer({ user: req.user, tournamentId: req.params.tournamentId, participantId: req.params.participantId, input: req.body });
  res.status(201).json({ success: true, data });
});

export const patchSquadPlayer = asyncHandler(async (req, res) => {
  const data = await updateSquadPlayer({ user: req.user, tournamentId: req.params.tournamentId, participantId: req.params.participantId, squadPlayerId: req.params.squadPlayerId, input: req.body });
  res.json({ success: true, data });
});

export const deleteSquadPlayer = asyncHandler(async (req, res) => {
  const data = await removeSquadPlayer({ user: req.user, tournamentId: req.params.tournamentId, participantId: req.params.participantId, squadPlayerId: req.params.squadPlayerId });
  res.json({ success: true, data });
});

export const patchSquadCaptain = asyncHandler(async (req, res) => {
  const data = await setCaptain({ user: req.user, tournamentId: req.params.tournamentId, participantId: req.params.participantId, squadPlayerId: req.body.squadPlayerId });
  res.json({ success: true, data });
});

export const patchSquadViceCaptain = asyncHandler(async (req, res) => {
  const data = await setViceCaptain({ user: req.user, tournamentId: req.params.tournamentId, participantId: req.params.participantId, squadPlayerId: req.body.squadPlayerId });
  res.json({ success: true, data });
});

export const putSquadPlayerPhoto = asyncHandler(async (req, res) => {
  const data = await uploadSquadPlayerPhoto({ user: req.user, tournamentId: req.params.tournamentId, participantId: req.params.participantId, squadPlayerId: req.params.squadPlayerId, file: req.file });
  res.json({ success: true, data });
});

export const deleteSquadPlayerPhoto = asyncHandler(async (req, res) => {
  const data = await removeSquadPlayerPhoto({ user: req.user, tournamentId: req.params.tournamentId, participantId: req.params.participantId, squadPlayerId: req.params.squadPlayerId });
  res.json({ success: true, data });
});

export const myTournamentSquad = asyncHandler(async (req, res) => {
  const data = await getParticipantTeamMySquad({ user: req.user, tournamentId: req.params.tournamentId });
  res.json({ success: true, data });
});

export const adminTournamentSquads = asyncHandler(async (req, res) => {
  const data = await listAdminTournamentSquads({ tournamentId: req.params.tournamentId });
  res.json({ success: true, data });
});

export const adminParticipantSquad = asyncHandler(async (req, res) => {
  const data = await getAdminTournamentSquad({ tournamentId: req.params.tournamentId, participantId: req.params.participantId });
  res.json({ success: true, data });
});

export const adminParticipantSquadHistory = asyncHandler(async (req, res) => {
  const data = await getAdminTournamentSquadHistory({ tournamentId: req.params.tournamentId, participantId: req.params.participantId, query: req.query });
  res.json({ success: true, data });
});

export const publicParticipantSquad = asyncHandler(async (req, res) => {
  const data = await getPublicTournamentParticipantSquad({ slug: req.params.slug, participantSlug: req.params.participantSlug });
  res.json({ success: true, data });
});
