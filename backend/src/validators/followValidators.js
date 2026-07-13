import { body, param, query } from 'express-validator';

const followerBody = body('followerSessionId').isUUID().withMessage('Follower session is invalid.');
const teamSlug = param('teamSlug').isSlug().withMessage('Invalid team slug.');
const allowedPreferences = ['matchReminder', 'matchStarted', 'goal', 'halfTime', 'fullTime', 'resultPublished', 'challengeAccepted'];

export const followStatusValidator = [
  teamSlug,
  query('followerSessionId').optional().isUUID().withMessage('Follower session is invalid.'),
];

export const followActionValidator = [
  teamSlug,
  followerBody,
  body().custom((value) => {
    const unknown = Object.keys(value).filter((key) => key !== 'followerSessionId');
    if (unknown.length) throw new Error(`Unsupported follow fields: ${unknown.join(', ')}.`);
    return true;
  }),
];

export const followPreferencesValidator = [
  teamSlug,
  followerBody,
  body('preferences').isObject().withMessage('Preferences are required.'),
  body('preferences.*').isBoolean().withMessage('Preference values must be true or false.').toBoolean(),
  body('preferences').custom((value) => {
    const unknown = Object.keys(value || {}).filter((key) => !allowedPreferences.includes(key));
    if (unknown.length) throw new Error(`Unsupported preference fields: ${unknown.join(', ')}.`);
    return true;
  }),
  body().custom((value) => {
    const unknown = Object.keys(value).filter((key) => !['followerSessionId', 'preferences'].includes(key));
    if (unknown.length) throw new Error(`Unsupported preference request fields: ${unknown.join(', ')}.`);
    return true;
  }),
];

export const pushSubscribeValidator = [
  followerBody,
  body('subscription').isObject().withMessage('Push subscription is required.'),
  body('subscription.endpoint').isString().trim().isLength({ min: 10, max: 2048 }).withMessage('Push endpoint is invalid.'),
  body('subscription.keys').isObject().withMessage('Push keys are required.'),
  body('subscription.keys.p256dh').isString().trim().isLength({ min: 10, max: 512 }).withMessage('Push p256dh key is invalid.'),
  body('subscription.keys.auth').isString().trim().isLength({ min: 10, max: 256 }).withMessage('Push auth key is invalid.'),
  body().custom((value) => {
    const unknown = Object.keys(value).filter((key) => !['followerSessionId', 'subscription'].includes(key));
    if (unknown.length) throw new Error(`Unsupported push fields: ${unknown.join(', ')}.`);
    return true;
  }),
];

export const pushUnsubscribeValidator = [
  followerBody,
  body().custom((value) => {
    const unknown = Object.keys(value).filter((key) => key !== 'followerSessionId');
    if (unknown.length) throw new Error(`Unsupported unsubscribe fields: ${unknown.join(', ')}.`);
    return true;
  }),
];
