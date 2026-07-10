import { validationResult } from 'express-validator';
import AppError from '../utils/AppError.js';

export const validateWithStatus = (statusCode = 422) => (req, _res, next) => {
  const result = validationResult(req);
  if (result.isEmpty()) return next();

  const details = result.array().map(({ path, msg }) => ({ field: path, message: msg }));
  return next(new AppError('Please correct the highlighted fields.', statusCode, 'VALIDATION_ERROR', details));
};

const validate = validateWithStatus();

export default validate;
