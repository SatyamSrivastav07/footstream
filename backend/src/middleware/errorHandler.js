import AppError from '../utils/AppError.js';

const duplicateCollectionName = (error) => {
  const explicitName = error.collection?.collectionName || error.collectionName || '';
  if (explicitName) return explicitName.toLowerCase();

  const match = String(error.message || '').match(/collection:\s+[^.\s]+\.([^\s]+)/i);
  return (match?.[1] || '').toLowerCase();
};

const duplicateKeyNames = (error) => Object.keys(error.keyPattern || error.keyValue || {});

const tournamentDuplicateError = (error) => {
  const collection = duplicateCollectionName(error);
  const keys = duplicateKeyNames(error);

  if (collection.includes('tournaments') && keys.includes('slug')) {
    return new AppError('Tournament slug already exists. Choose a different tournament slug.', 409, 'TOURNAMENT_SLUG_EXISTS');
  }

  if (collection.includes('tournamentparticipants')) {
    if (keys.includes('registeredTeam')) {
      return new AppError('That registered team is already added to this tournament.', 409, 'TOURNAMENT_PARTICIPANT_EXISTS');
    }
    if (keys.includes('normalizedName')) {
      return new AppError('A participant with this name already exists in this tournament.', 409, 'TOURNAMENT_PARTICIPANT_EXISTS');
    }
    if (keys.includes('slug')) {
      return new AppError('A participant with this slug already exists in this tournament.', 409, 'TOURNAMENT_PARTICIPANT_SLUG_EXISTS');
    }
  }

  if (collection.includes('tournamentsquadplayers')) {
    if (keys.includes('registeredPlayer')) {
      return new AppError('This player is already selected in this tournament squad.', 409, 'TOURNAMENT_SQUAD_PLAYER_EXISTS');
    }
    if (keys.includes('normalizedName')) {
      return new AppError('A squad player with this name already exists in this tournament squad.', 409, 'TOURNAMENT_SQUAD_PLAYER_EXISTS');
    }
    if (keys.includes('jersey')) {
      return new AppError('That jersey number is already used in this tournament squad.', 409, 'TOURNAMENT_SQUAD_JERSEY_EXISTS');
    }
  }

  return null;
};

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
    const tournamentDuplicate = tournamentDuplicateError(error);
    if (tournamentDuplicate) {
      normalized = tournamentDuplicate;
    } else if (error.keyValue?.jerseyNumber !== undefined) {
      normalized = new AppError('That jersey number is already assigned to an active player.', 409, 'JERSEY_IN_USE');
    } else if (error.keyPattern?.sourceChallenge && error.keyValue?.sourceChallenge) {
      normalized = new AppError('This generated fixture already exists. Open the existing fixture from Matches.', 409, 'GENERATED_FIXTURE_EXISTS');
    } else if (error.keyPattern?.sourceChallenge) {
      normalized = new AppError('The match could not be created because of a stale challenge index. Remove the old sourceChallenge_1 index and try again.', 409, 'STALE_MATCH_INDEX');
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
