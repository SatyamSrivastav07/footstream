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
