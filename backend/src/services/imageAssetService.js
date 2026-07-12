export const publicImage = (value) => {
  if (!value) return { imageUrl: '', width: 0, height: 0 };
  if (typeof value === 'string') return { imageUrl: value, width: 0, height: 0 };
  return {
    imageUrl: value.imageUrl || value.secure_url || '',
    width: Number(value.width) || 0,
    height: Number(value.height) || 0,
  };
};

export const privateImage = (value) => {
  if (!value || typeof value === 'string') return null;
  return value.publicId ? value : null;
};

export const metadataFromUpload = (result, fallbackBytes) => ({
  imageUrl: result.secure_url,
  publicId: result.public_id,
  width: result.width || 0,
  height: result.height || 0,
  format: result.format || '',
  bytes: result.bytes || fallbackBytes || 0,
});

export const replaceImageAsset = async ({
  document,
  field,
  file,
  storage,
  folder,
  publicId,
}) => {
  const oldImage = privateImage(document[field]);
  const result = await storage.upload({ buffer: file.buffer, folder, publicId });
  const nextImage = metadataFromUpload(result, file.size);
  document[field] = nextImage;
  try {
    await document.save();
  } catch (error) {
    await storage.destroy(nextImage.publicId).catch(() => {});
    throw error;
  }
  if (oldImage?.publicId) await storage.destroy(oldImage.publicId).catch(() => {});
  return publicImage(nextImage);
};

export const removeImageAsset = async ({ document, field, storage, deleteFailureCode, deleteFailureMessage }) => {
  const current = privateImage(document[field]);
  if (current?.publicId) {
    const result = await storage.destroy(current.publicId);
    if (result?.result && !['ok', 'not found'].includes(result.result)) {
      throw new AppError(deleteFailureMessage, 502, deleteFailureCode);
    }
  }
  document[field] = '';
  await document.save();
  return publicImage(document[field]);
};
import AppError from '../utils/AppError.js';
