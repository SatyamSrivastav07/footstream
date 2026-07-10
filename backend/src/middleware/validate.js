import { validationResult } from 'express-validator';
import AppError from '../utils/AppError.js';

const validate = (req, _res, next) => {
  const result = validationResult(req);
  if (result.isEmpty()) return next();

  const details = result.array().map(({ path, msg }) => ({ field: path, message: msg }));
  return next(new AppError('Please correct the highlighted fields.', 422, 'VALIDATION_ERROR', details));
};

export default validate;

