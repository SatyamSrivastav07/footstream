import crypto from 'node:crypto';
import path from 'node:path';
import env from '../config/env.js';
import { cloudinaryClient } from '../config/cloudinary.js';
import Match from '../models/Match.js';
import MatchPhoto from '../models/MatchPhoto.js';
import AppError from '../utils/AppError.js';
import { findCompletedMatch } from './resultService.js';

const safeName = (name) => path.basename(name).replace(/[^a-zA-Z0-9._-]/g, '_').slice(0, 255);

export const uploadPhotos = async ({ matchModel = Match, photoModel = MatchPhoto, storage = cloudinaryClient, matchId, teamId, userId, files, caption = '', category = 'other' }) => {
  if (!files?.length) throw new AppError('Select at least one photo.', 400, 'PHOTOS_REQUIRED');
  await findCompletedMatch({ matchModel, matchId, teamId });
  const activeCount = await photoModel.countDocuments({ match: matchId, isActive: true });
  if (activeCount + files.length > 20) throw new AppError('A match can have at most 20 active photos.', 409, 'PHOTO_LIMIT_REACHED');
  const uploaded = [];
  try {
    for (const file of files) {
      const result = await storage.upload({ buffer: file.buffer, folder: `${env.cloudinary.folder}/${matchId}`, publicId: `${Date.now()}-${crypto.randomUUID()}` });
      uploaded.push({ match: matchId, team: teamId, imageUrl: result.secure_url, publicId: result.public_id, originalName: safeName(file.originalname), width: result.width || 0, height: result.height || 0, bytes: result.bytes || file.size || 0, format: result.format || '', caption, category, uploadedBy: userId });
    }
    return await photoModel.insertMany(uploaded);
  } catch (error) {
    if (uploaded.length) await photoModel.deleteMany({ publicId: { $in: uploaded.map((photo) => photo.publicId) } }).catch(() => {});
    await Promise.allSettled(uploaded.map((photo) => storage.destroy(photo.publicId)));
    throw error;
  }
};

export const removePhoto = async ({ photoModel = MatchPhoto, storage = cloudinaryClient, matchId, photoId, teamId }) => {
  const photo = await photoModel.findOne({ _id: photoId, match: matchId, team: teamId, isActive: true });
  if (!photo) throw new AppError('Photo not found.', 404, 'PHOTO_NOT_FOUND');
  const result = await storage.destroy(photo.publicId);
  if (result?.result && !['ok', 'not found'].includes(result.result)) throw new AppError('Photo storage deletion failed.', 502, 'PHOTO_DELETE_FAILED');
  photo.isActive = false; await photo.save(); return photo;
};
