import { URL } from 'node:url';
import PlatformSetting from '../models/PlatformSetting.js';
import AppError from '../utils/AppError.js';

export const PLATFORM_SETTING_KEYS = Object.freeze({
  TEAM_ADMIN_WHATSAPP: 'teamAdminWhatsAppCommunity',
});

const safeUrl = (value = '') => {
  const trimmed = String(value || '').trim();
  if (!trimmed) return '';
  try {
    const url = new URL(trimmed);
    if (!['http:', 'https:'].includes(url.protocol)) throw new Error('protocol');
    return url.toString();
  } catch {
    throw new AppError('Enter a valid WhatsApp community link.', 400, 'INVALID_WHATSAPP_URL');
  }
};

const serialize = (setting) => ({
  url: setting?.value?.url || '',
  enabled: Boolean(setting?.value?.enabled && setting?.value?.url),
  updatedAt: setting?.updatedAt || null,
});

export const getTeamAdminWhatsAppSetting = async ({ settingModel = PlatformSetting } = {}) => {
  const setting = await settingModel.findOne({ key: PLATFORM_SETTING_KEYS.TEAM_ADMIN_WHATSAPP }).lean();
  return serialize(setting);
};

export const updateTeamAdminWhatsAppSetting = async ({
  settingModel = PlatformSetting,
  input = {},
  userId,
}) => {
  const url = safeUrl(input.url);
  const enabled = Boolean(input.enabled) && Boolean(url);
  const setting = await settingModel.findOneAndUpdate(
    { key: PLATFORM_SETTING_KEYS.TEAM_ADMIN_WHATSAPP },
    { $set: { value: { url, enabled }, updatedBy: userId } },
    { upsert: true, new: true, setDefaultsOnInsert: true },
  ).lean();
  return serialize(setting);
};
