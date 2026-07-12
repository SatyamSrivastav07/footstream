import AppError from '../utils/AppError.js';

export const notFound = (req, _res, next) => {
  next(new AppError(`Route ${req.method} ${req.originalUrl} was not found.`, 404, 'NOT_FOUND'));
};

export const errorHandler = (error, req, res, _next) => {
  let normalized = error;

  if (error.name === 'CastError') {
    normalized = new AppError('The requested resource identifier is invalid.', 400, 'INVALID_ID');
  } else if (error.name === 'MulterError') {
    const messages = { LIMIT_FILE_SIZE: 'Each photo must be 5 MB or smaller.', LIMIT_FILE_COUNT: 'Upload at most 10 photos per request.', LIMIT_UNEXPECTED_FILE: 'Upload at most 10 files using the photos field.' };
    normalized = new AppError(messages[error.code] || 'The photo upload is invalid.', 400, 'INVALID_PHOTO_UPLOAD');
  } else if (error.code === 11000) {
    if (error.keyValue?.jerseyNumber !== undefined) {
      normalized = new AppError('That jersey number is already assigned to an active player.', 409, 'JERSEY_IN_USE');
    } else if (error.keyValue?.isCaptain) {
      normalized = new AppError('This team already has an active captain.', 409, 'CAPTAIN_EXISTS');
    } else if (error.keyValue?.isViceCaptain) {
      normalized = new AppError('This team already has an active vice-captain.', 409, 'VICE_CAPTAIN_EXISTS');
    } else {
      const field = Object.keys(error.keyPattern || error.keyValue || {})[0] || 'field';
      normalized = new AppError(`A record with that ${field} already exists.`, 409, 'DUPLICATE_VALUE');
    }
  } else if (error.name === 'ValidationError') {
    const details = Object.values(error.errors).map((item) => ({
      field: item.path,
      message: item.message,
    }));
    normalized = new AppError('The submitted data is invalid.', 422, 'VALIDATION_ERROR', details);
  }

  const statusCode = normalized.statusCode || 500;
  const payload = {
    success: false,
    error: {
      code: normalized.code || 'INTERNAL_ERROR',
      message: statusCode >= 500 ? 'Something went wrong on the server.' : normalized.message,
      ...(normalized.details ? { details: normalized.details } : {}),
    },
    requestId: req.id,
  };

  if (process.env.NODE_ENV !== 'production' && statusCode >= 500) {
    payload.error.debug = normalized.message;
  }

  if (statusCode >= 500) console.error(normalized);
  res.status(statusCode).json(payload);
};
