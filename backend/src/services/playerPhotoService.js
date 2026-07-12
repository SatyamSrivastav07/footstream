import crypto from 'node:crypto';
import { cloudinaryClient } from '../config/cloudinary.js';
import Match from '../models/Match.js';
import Player from '../models/Player.js';
import AppError from '../utils/AppError.js';
import { publicImage, removeImageAsset, replaceImageAsset } from './imageAssetService.js';

const maxPlayerPhotoBytes = 3 * 1024 * 1024;

export const playerPhotoUrl = (player) => publicImage(player?.photo || player?.photoUrl).imageUrl;

const findPlayer = async ({ playerModel, teamId, playerId }) => {
  const player = await playerModel.findOne({ _id: playerId, team: teamId });
  if (!player) throw new AppError('Player not found.', 404, 'PLAYER_NOT_FOUND');
  return player;
};

export const syncPlayerPhotoSnapshots = async ({ matchModel = Match, teamId, playerId, photoUrl }) => {
  await Promise.all([
    matchModel.updateMany(
      { team: teamId, isActive: true, 'startingXI.player': playerId },
      { $set: { 'startingXI.$[player].photoUrl': photoUrl } },
      { arrayFilters: [{ 'player.player': playerId }] },
    ),
    matchModel.updateMany(
      { team: teamId, isActive: true, 'substitutes.player': playerId },
      { $set: { 'substitutes.$[player].photoUrl': photoUrl } },
      { arrayFilters: [{ 'player.player': playerId }] },
    ),
    matchModel.updateMany(
      { team: teamId, isActive: true, 'manOfTheMatch.player': playerId },
      { $set: { 'manOfTheMatch.photoUrl': photoUrl } },
    ),
  ]);
};

export const uploadPlayerPhoto = async ({
  playerModel = Player,
  matchModel = Match,
  storage = cloudinaryClient,
  teamId,
  playerId,
  file,
}) => {
  if (!file) throw new AppError('Select a player photo to upload.', 400, 'PLAYER_PHOTO_REQUIRED');
  if (file.size > maxPlayerPhotoBytes) throw new AppError('Player photo is too large.', 400, 'PLAYER_PHOTO_TOO_LARGE');
  const player = await findPlayer({ playerModel, teamId, playerId });
  player.photoUrl = '';
  const photo = await replaceImageAsset({
    document: player,
    field: 'photo',
    file,
    storage,
    folder: `footstream/teams/${teamId}/players/${playerId}`,
    publicId: `${Date.now()}-${crypto.randomUUID()}`,
  });
  await syncPlayerPhotoSnapshots({ matchModel, teamId, playerId, photoUrl: photo.imageUrl });
  return { player, photo, photoUrl: photo.imageUrl };
};

export const removePlayerPhoto = async ({
  playerModel = Player,
  matchModel = Match,
  storage = cloudinaryClient,
  teamId,
  playerId,
}) => {
  const player = await findPlayer({ playerModel, teamId, playerId });
  const photo = await removeImageAsset({
    document: player,
    field: 'photo',
    storage,
    deleteFailureCode: 'PLAYER_PHOTO_DELETE_FAILED',
    deleteFailureMessage: 'Player photo deletion failed.',
  });
  await syncPlayerPhotoSnapshots({ matchModel, teamId, playerId, photoUrl: '' });
  return { player, photo, photoUrl: photo.imageUrl };
};
