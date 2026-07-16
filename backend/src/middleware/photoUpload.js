import multer from 'multer';
import { Buffer } from 'node:buffer';
import AppError from '../utils/AppError.js';

const allowed = new Set(['image/jpeg', 'image/png', 'image/webp']);
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024, files: 10 },
  fileFilter: (_req, file, callback) => allowed.has(file.mimetype)
    ? callback(null, true)
    : callback(new AppError('Only JPEG, PNG, and WebP photos are accepted.', 400, 'INVALID_PHOTO_TYPE')),
});

export const uploadMatchPhotos = upload.array('photos', 10);

const singleImageUpload = (maxBytes, code, fieldName = 'image') => multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: maxBytes, files: 1 },
  fileFilter: (_req, file, callback) => allowed.has(file.mimetype)
    ? callback(null, true)
    : callback(new AppError('Only JPEG, PNG, and WebP images are accepted.', 400, code)),
}).single(fieldName);

export const uploadTeamLogo = singleImageUpload(2 * 1024 * 1024, 'INVALID_TEAM_LOGO_TYPE');
export const uploadTeamCover = singleImageUpload(5 * 1024 * 1024, 'INVALID_TEAM_COVER_TYPE');
export const uploadPlayerPhoto = singleImageUpload(3 * 1024 * 1024, 'INVALID_PLAYER_PHOTO_TYPE');
export const uploadJoinRequestPhoto = singleImageUpload(3 * 1024 * 1024, 'INVALID_JOIN_REQUEST_PHOTO_TYPE');
export const uploadTournamentLogo = singleImageUpload(2 * 1024 * 1024, 'INVALID_TOURNAMENT_LOGO_TYPE', 'logo');
export const uploadTournamentCover = singleImageUpload(5 * 1024 * 1024, 'INVALID_TOURNAMENT_COVER_TYPE', 'cover');
export const uploadTournamentParticipantLogo = singleImageUpload(2 * 1024 * 1024, 'INVALID_TOURNAMENT_PARTICIPANT_LOGO_TYPE', 'logo');
export const uploadTournamentSquadPlayerPhoto = singleImageUpload(3 * 1024 * 1024, 'INVALID_TOURNAMENT_SQUAD_PLAYER_PHOTO_TYPE', 'image');
export const uploadTeamRegistrationMedia = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024, files: 2 },
  fileFilter: (_req, file, callback) => allowed.has(file.mimetype)
    ? callback(null, true)
    : callback(new AppError('Only JPEG, PNG, and WebP images are accepted.', 400, 'INVALID_TEAM_REGISTRATION_IMAGE_TYPE')),
}).fields([{ name: 'logo', maxCount: 1 }, { name: 'cover', maxCount: 1 }]);

const validSignature = (file) => {
  const bytes = file.buffer;
  if (file.mimetype === 'image/jpeg') return bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
  if (file.mimetype === 'image/png') return bytes.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]));
  if (file.mimetype === 'image/webp') return bytes.subarray(0, 4).toString() === 'RIFF' && bytes.subarray(8, 12).toString() === 'WEBP';
  return false;
};

export const validatePhotoSignatures = (req, _res, next) => {
  if (req.files?.some((file) => !validSignature(file))) return next(new AppError('A selected file is not a valid JPEG, PNG, or WebP image.', 400, 'INVALID_PHOTO_CONTENT'));
  return next();
};

export const validateTeamImageSignature = (req, _res, next) => {
  if (!req.file) return next(new AppError('Select an image to upload.', 400, 'TEAM_IMAGE_REQUIRED'));
  if (!validSignature(req.file)) return next(new AppError('The selected file is not a valid JPEG, PNG, or WebP image.', 400, 'INVALID_TEAM_IMAGE_CONTENT'));
  return next();
};

export const validatePlayerImageSignature = (req, _res, next) => {
  if (!req.file) return next(new AppError('Select a player photo to upload.', 400, 'PLAYER_PHOTO_REQUIRED'));
  if (!validSignature(req.file)) return next(new AppError('The selected file is not a valid JPEG, PNG, or WebP image.', 400, 'INVALID_PLAYER_PHOTO_CONTENT'));
  return next();
};

export const validateTournamentBrandingSignature = (req, _res, next) => {
  if (!req.file) return next(new AppError('Select an image to upload.', 400, 'TOURNAMENT_IMAGE_REQUIRED'));
  if (!validSignature(req.file)) return next(new AppError('The selected file is not a valid JPEG, PNG, or WebP image.', 400, 'INVALID_TOURNAMENT_IMAGE_CONTENT'));
  return next();
};

export const validateOptionalJoinRequestImageSignature = (req, _res, next) => {
  if (!req.file) return next();
  if (!validSignature(req.file)) return next(new AppError('The selected file is not a valid JPEG, PNG, or WebP image.', 400, 'INVALID_JOIN_REQUEST_PHOTO_CONTENT'));
  return next();
};

export const validateTeamRegistrationMediaSignatures = (req, _res, next) => {
  const logo = req.files?.logo?.[0];
  const cover = req.files?.cover?.[0];
  if (logo && logo.size > 2 * 1024 * 1024) return next(new AppError('Team logo must be 2 MB or smaller.', 400, 'TEAM_REGISTRATION_LOGO_TOO_LARGE'));
  if (cover && cover.size > 5 * 1024 * 1024) return next(new AppError('Team cover must be 5 MB or smaller.', 400, 'TEAM_REGISTRATION_COVER_TOO_LARGE'));
  if ([logo, cover].filter(Boolean).some((file) => !validSignature(file))) return next(new AppError('A selected file is not a valid JPEG, PNG, or WebP image.', 400, 'INVALID_TEAM_REGISTRATION_IMAGE_CONTENT'));
  return next();
};
