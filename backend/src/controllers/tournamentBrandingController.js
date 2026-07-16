import asyncHandler from '../utils/asyncHandler.js';
import {
  removeParticipantLogo,
  removeTournamentCover,
  removeTournamentLogo,
  uploadParticipantLogo,
  uploadTournamentCover,
  uploadTournamentLogo,
} from '../services/tournamentBrandingService.js';

export const putTournamentLogo = asyncHandler(async (req, res) => {
  const data = await uploadTournamentLogo({ user: req.user, tournamentId: req.params.tournamentId, file: req.file });
  res.json({ success: true, data });
});

export const deleteTournamentLogo = asyncHandler(async (req, res) => {
  const data = await removeTournamentLogo({ user: req.user, tournamentId: req.params.tournamentId });
  res.json({ success: true, data });
});

export const putTournamentCover = asyncHandler(async (req, res) => {
  const data = await uploadTournamentCover({ user: req.user, tournamentId: req.params.tournamentId, file: req.file });
  res.json({ success: true, data });
});

export const deleteTournamentCover = asyncHandler(async (req, res) => {
  const data = await removeTournamentCover({ user: req.user, tournamentId: req.params.tournamentId });
  res.json({ success: true, data });
});

export const putParticipantLogo = asyncHandler(async (req, res) => {
  const data = await uploadParticipantLogo({
    user: req.user,
    tournamentId: req.params.tournamentId,
    participantId: req.params.participantId,
    file: req.file,
  });
  res.json({ success: true, data });
});

export const deleteParticipantLogo = asyncHandler(async (req, res) => {
  const data = await removeParticipantLogo({
    user: req.user,
    tournamentId: req.params.tournamentId,
    participantId: req.params.participantId,
  });
  res.json({ success: true, data });
});
