import asyncHandler from '../utils/asyncHandler.js';
import {
  addExternalParticipant,
  addIntraParticipant,
  addRegisteredParticipant,
  listAvailableRegisteredTeams,
  listParticipants,
  removeParticipant,
  updateParticipant,
  updateParticipantStatus,
} from '../services/tournamentParticipantService.js';

export const getTournamentParticipants = asyncHandler(async (req, res) => {
  const data = await listParticipants({ tournamentId: req.params.tournamentId, user: req.user, query: req.query });
  res.json({ success: true, data });
});

export const postRegisteredParticipant = asyncHandler(async (req, res) => {
  const participant = await addRegisteredParticipant({ tournamentId: req.params.tournamentId, user: req.user, input: req.body });
  res.status(201).json({ success: true, data: { participant } });
});

export const postExternalParticipant = asyncHandler(async (req, res) => {
  const participant = await addExternalParticipant({ tournamentId: req.params.tournamentId, user: req.user, input: req.body });
  res.status(201).json({ success: true, data: { participant } });
});

export const postIntraParticipant = asyncHandler(async (req, res) => {
  const participant = await addIntraParticipant({ tournamentId: req.params.tournamentId, user: req.user, input: req.body });
  res.status(201).json({ success: true, data: { participant } });
});

export const patchParticipant = asyncHandler(async (req, res) => {
  const participant = await updateParticipant({ tournamentId: req.params.tournamentId, participantId: req.params.participantId, user: req.user, input: req.body });
  res.json({ success: true, data: { participant } });
});

export const patchParticipantStatus = asyncHandler(async (req, res) => {
  const participant = await updateParticipantStatus({ tournamentId: req.params.tournamentId, participantId: req.params.participantId, user: req.user, status: req.body.status });
  res.json({ success: true, data: { participant } });
});

export const deleteParticipant = asyncHandler(async (req, res) => {
  const data = await removeParticipant({ tournamentId: req.params.tournamentId, participantId: req.params.participantId, user: req.user });
  res.json({ success: true, data });
});

export const availableRegisteredTeams = asyncHandler(async (req, res) => {
  const data = await listAvailableRegisteredTeams({ tournamentId: req.params.tournamentId, user: req.user, query: req.query });
  res.json({ success: true, data });
});
