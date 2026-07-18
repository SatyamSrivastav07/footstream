import { validationResult } from 'express-validator';
import AppError from '../utils/AppError.js';

const labelForField = (field = 'field') =>
  String(field)
    .replace(/\.\d+\./g, ' ')
    .replace(/[.[\]]+/g, ' ')
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/\b\w/g, (letter) => letter.toUpperCase()) || 'Field';

const readableValidationMessage = (details = []) => {
  if (!details.length) return 'Some submitted values are invalid.';
  if (details.length === 1) return details[0].message;

  const fields = details.slice(0, 3).map((item) => labelForField(item.field)).join(', ');
  const suffix = details.length > 3 ? ` and ${details.length - 3} more` : '';
  return `Please fix ${fields}${suffix}. First issue: ${details[0].message}`;
};

export const validateWithStatus = (statusCode = 422) => (req, _res, next) => {
  const result = validationResult(req);
  if (result.isEmpty()) return next();

  const details = result.array().map(({ path, msg }) => ({ field: path, message: msg }));
  return next(new AppError(readableValidationMessage(details), statusCode, 'VALIDATION_ERROR', details));
};

const validate = validateWithStatus();

export default validate;
