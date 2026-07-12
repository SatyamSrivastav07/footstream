import crypto from 'node:crypto';
import { cloudinaryClient } from '../config/cloudinary.js';
import Team from '../models/Team.js';
import AppError from '../utils/AppError.js';
import { privateImage, publicImage, removeImageAsset, replaceImageAsset } from './imageAssetService.js';

const imageField = {
  logo: { folder: 'logo', maxBytes: 2 * 1024 * 1024, label: 'Logo' },
  coverPhoto: { folder: 'cover', maxBytes: 5 * 1024 * 1024, label: 'Cover photo' },
};

const findTeam = async ({ teamModel, teamId }) => {
  const team = await teamModel.findOne({ _id: teamId, isArchived: false });
  if (!team) throw new AppError('Team not found.', 404, 'TEAM_NOT_FOUND');
  return team;
};

export const uploadTeamBranding = async ({
  teamModel = Team,
  storage = cloudinaryClient,
  teamId,
  kind,
  file,
}) => {
  const config = imageField[kind];
  if (!config) throw new AppError('Unsupported branding image.', 400, 'INVALID_BRANDING_KIND');
  if (!file) throw new AppError('Select an image to upload.', 400, 'TEAM_IMAGE_REQUIRED');
  if (file.size > config.maxBytes) throw new AppError(`${config.label} image is too large.`, 400, 'TEAM_IMAGE_TOO_LARGE');
  const team = await findTeam({ teamModel, teamId });
  const image = await replaceImageAsset({
    document: team,
    field: kind,
    file,
    storage,
    folder: `footstream/teams/${teamId}/${config.folder}`,
    publicId: `${Date.now()}-${crypto.randomUUID()}`,
  });
  return { team, image };
};

export const removeTeamBranding = async ({
  teamModel = Team,
  storage = cloudinaryClient,
  teamId,
  kind,
}) => {
  const config = imageField[kind];
  if (!config) throw new AppError('Unsupported branding image.', 400, 'INVALID_BRANDING_KIND');
  const team = await findTeam({ teamModel, teamId });
  const image = await removeImageAsset({
    document: team,
    field: kind,
    storage,
    deleteFailureCode: 'TEAM_IMAGE_DELETE_FAILED',
    deleteFailureMessage: 'Branding image deletion failed.',
  });
  return { team, image };
};

export { privateImage, publicImage };
