import { v2 as cloudinary } from 'cloudinary';
import env from './env.js';
import AppError from '../utils/AppError.js';

const assertConfigured = () => {
  if (!env.cloudinary.cloudName || !env.cloudinary.apiKey || !env.cloudinary.apiSecret) {
    throw new AppError('Match photo storage is not configured.', 503, 'PHOTO_STORAGE_UNAVAILABLE');
  }
  cloudinary.config({ cloud_name: env.cloudinary.cloudName, api_key: env.cloudinary.apiKey, api_secret: env.cloudinary.apiSecret, secure: true });
};

export const cloudinaryStatus = () => (
  env.cloudinary.cloudName && env.cloudinary.apiKey && env.cloudinary.apiSecret ? 'configured' : 'not_configured'
);

export const cloudinaryClient = {
  upload: ({ buffer, folder, publicId }) => {
    assertConfigured();
    return new Promise((resolve, reject) => {
      const stream = cloudinary.uploader.upload_stream({ folder, public_id: publicId, resource_type: 'image' }, (error, result) => error ? reject(error) : resolve(result));
      stream.end(buffer);
    });
  },
  destroy: async (publicId) => { assertConfigured(); return cloudinary.uploader.destroy(publicId, { resource_type: 'image', invalidate: true }); },
};
