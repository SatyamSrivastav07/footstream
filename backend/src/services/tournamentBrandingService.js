import crypto from 'node:crypto';
import { cloudinaryClient } from '../config/cloudinary.js';
import {
  TOURNAMENT_APPROVAL_STATUS,
} from '../constants/tournamentConstants.js';
import Tournament from '../models/Tournament.js';
import TournamentParticipant from '../models/TournamentParticipant.js';
import { USER_ROLES } from '../models/User.js';
import AppError from '../utils/AppError.js';
import { removeImageAsset, replaceImageAsset } from './imageAssetService.js';
import { createReviewHistory } from './tournamentReviewService.js';
import { serializeTournamentHost, serializeTournamentParticipantPublic } from '../serializers/tournamentSerializers.js';

const idString = (value) => String(value?._id || value || '');
const editableApprovalStatuses = new Set([
  TOURNAMENT_APPROVAL_STATUS.DRAFT,
  TOURNAMENT_APPROVAL_STATUS.CHANGES_REQUESTED,
]);

const imageConfig = {
  logo: {
    field: 'logo',
    label: 'Tournament logo',
    maxBytes: 2 * 1024 * 1024,
    folder: (tournamentId) => `footstream/tournaments/${tournamentId}/branding/logo`,
  },
  cover: {
    field: 'coverImage',
    label: 'Tournament cover',
    maxBytes: 5 * 1024 * 1024,
    folder: (tournamentId) => `footstream/tournaments/${tournamentId}/branding/cover`,
  },
  participantLogo: {
    field: 'logo',
    label: 'Participant logo',
    maxBytes: 2 * 1024 * 1024,
    folder: (tournamentId, participantId) => `footstream/tournaments/${tournamentId}/participants/${participantId}`,
  },
};

const requireHostTeam = (user) => {
  if (!user?.team) throw new AppError('A team-admin account must be assigned to a team.', 403, 'TOURNAMENT_ACCESS_DENIED');
  return idString(user.team);
};

const assertFile = (file, config) => {
  if (!file) throw new AppError('Select an image to upload.', 400, 'TOURNAMENT_IMAGE_REQUIRED');
  if (file.size > config.maxBytes) throw new AppError(`${config.label} is too large.`, 400, 'TOURNAMENT_IMAGE_TOO_LARGE');
};

const findOwnedEditableTournament = async ({ tournamentModel = Tournament, tournamentId, user }) => {
  const tournament = await tournamentModel.findOne({ _id: tournamentId, hostTeam: requireHostTeam(user) });
  if (!tournament) throw new AppError('Tournament not found.', 404, 'TOURNAMENT_NOT_FOUND');
  if (tournament.isArchived) throw new AppError('Archived tournaments are read-only.', 409, 'TOURNAMENT_ARCHIVED');
  if (!editableApprovalStatuses.has(tournament.approvalStatus)) {
    throw new AppError('Tournament branding is editable only while draft or changes are requested.', 409, 'TOURNAMENT_NOT_EDITABLE');
  }
  return tournament;
};

const history = ({ createHistory = createReviewHistory, tournament, user, action, message, metadata = {} }) => createHistory({
  tournament,
  action,
  actor: user._id,
  actorRole: USER_ROLES.TEAM_ADMIN,
  message,
  metadata,
});

const uploadTournamentImage = async ({ tournamentModel = Tournament, storage = cloudinaryClient, createHistory = createReviewHistory, user, tournamentId, kind, file }) => {
  const config = imageConfig[kind];
  if (!config) throw new AppError('Unsupported tournament branding image.', 400, 'INVALID_TOURNAMENT_BRANDING_KIND');
  assertFile(file, config);
  const tournament = await findOwnedEditableTournament({ tournamentModel, tournamentId, user });
  await replaceImageAsset({
    document: tournament,
    field: config.field,
    file,
    storage,
    folder: config.folder(tournamentId),
    publicId: `${Date.now()}-${crypto.randomUUID()}`,
  });
  await history({
    tournament,
    user,
    createHistory,
    action: 'branding_updated',
    message: `${config.label} updated.`,
    metadata: { field: config.field },
  });
  return { tournament: serializeTournamentHost(tournament.toObject()) };
};

const removeTournamentImage = async ({ tournamentModel = Tournament, storage = cloudinaryClient, createHistory = createReviewHistory, user, tournamentId, kind }) => {
  const config = imageConfig[kind];
  if (!config) throw new AppError('Unsupported tournament branding image.', 400, 'INVALID_TOURNAMENT_BRANDING_KIND');
  const tournament = await findOwnedEditableTournament({ tournamentModel, tournamentId, user });
  await removeImageAsset({
    document: tournament,
    field: config.field,
    storage,
    emptyValue: {},
    deleteFailureCode: 'TOURNAMENT_IMAGE_DELETE_FAILED',
    deleteFailureMessage: 'Tournament image deletion failed.',
  });
  await history({
    tournament,
    user,
    createHistory,
    action: 'branding_removed',
    message: `${config.label} removed.`,
    metadata: { field: config.field },
  });
  return { tournament: serializeTournamentHost(tournament.toObject()) };
};

const findOwnedParticipant = async ({ tournamentModel = Tournament, participantModel = TournamentParticipant, tournamentId, participantId, user }) => {
  const tournament = await findOwnedEditableTournament({ tournamentModel, tournamentId, user });
  const participant = await participantModel.findOne({ _id: participantId, tournament: tournament._id });
  if (!participant) throw new AppError('Tournament participant not found.', 404, 'TOURNAMENT_PARTICIPANT_NOT_FOUND');
  return { tournament, participant };
};

export const uploadTournamentLogo = (args) => uploadTournamentImage({ ...args, kind: 'logo' });
export const removeTournamentLogo = (args) => removeTournamentImage({ ...args, kind: 'logo' });
export const uploadTournamentCover = (args) => uploadTournamentImage({ ...args, kind: 'cover' });
export const removeTournamentCover = (args) => removeTournamentImage({ ...args, kind: 'cover' });

export const uploadParticipantLogo = async ({ tournamentModel = Tournament, participantModel = TournamentParticipant, storage = cloudinaryClient, createHistory = createReviewHistory, user, tournamentId, participantId, file }) => {
  const config = imageConfig.participantLogo;
  assertFile(file, config);
  const { tournament, participant } = await findOwnedParticipant({ tournamentModel, participantModel, tournamentId, participantId, user });
  await replaceImageAsset({
    document: participant,
    field: config.field,
    file,
    storage,
    folder: config.folder(tournamentId, participantId),
    publicId: `${Date.now()}-${crypto.randomUUID()}`,
  });
  await history({
    tournament,
    user,
    createHistory,
    action: 'participant_branding_updated',
    message: `${participant.displayName} logo updated.`,
    metadata: { participant: participant._id },
  });
  return { participant: serializeTournamentParticipantPublic(participant.toObject()) };
};

export const removeParticipantLogo = async ({ tournamentModel = Tournament, participantModel = TournamentParticipant, storage = cloudinaryClient, createHistory = createReviewHistory, user, tournamentId, participantId }) => {
  const { tournament, participant } = await findOwnedParticipant({ tournamentModel, participantModel, tournamentId, participantId, user });
  await removeImageAsset({
    document: participant,
    field: 'logo',
    storage,
    emptyValue: {},
    deleteFailureCode: 'TOURNAMENT_PARTICIPANT_IMAGE_DELETE_FAILED',
    deleteFailureMessage: 'Participant image deletion failed.',
  });
  await history({
    tournament,
    user,
    createHistory,
    action: 'participant_branding_removed',
    message: `${participant.displayName} logo removed.`,
    metadata: { participant: participant._id },
  });
  return { participant: serializeTournamentParticipantPublic(participant.toObject()) };
};
