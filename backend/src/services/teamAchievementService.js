import crypto from 'node:crypto';
import { URL } from 'node:url';
import env from '../config/env.js';
import { cloudinaryClient } from '../config/cloudinary.js';
import Player from '../models/Player.js';
import PlayerTrophy from '../models/PlayerTrophy.js';
import Team from '../models/Team.js';
import TeamAchievement from '../models/TeamAchievement.js';
import AppError from '../utils/AppError.js';
import { metadataFromUpload, publicImage } from './imageAssetService.js';
import { playerPhotoUrl } from './playerPhotoService.js';
import { publicImage as publicTeamImage } from './teamBrandingService.js';
import { logTeamActivity } from './teamActivityService.js';

const idString = (value) => String(value?._id || value || '');
const asArray = (value) => (Array.isArray(value) ? value : []);
const parseArray = (value) => {
  if (Array.isArray(value)) return value;
  if (!value) return [];
  if (typeof value !== 'string') return [];
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return value.split('\n').map((item) => item.trim()).filter(Boolean);
  }
};
const safeUrl = (value) => {
  const text = String(value || '').trim();
  if (!text) return '';
  try {
    const url = new URL(text);
    return ['http:', 'https:'].includes(url.protocol) ? url.toString() : '';
  } catch {
    return '';
  }
};
const imageList = (value) => parseArray(value).map((item) => {
  if (typeof item === 'string') return { imageUrl: safeUrl(item), caption: '' };
  return { imageUrl: safeUrl(item.imageUrl || item.url), caption: String(item.caption || '').trim().slice(0, 200) };
}).filter((item) => item.imageUrl).slice(0, 12);
const manualPlayers = (value) => parseArray(value).map((item) => {
  if (typeof item === 'string') return { name: item.trim(), position: '', jerseyNumber: null };
  return {
    name: String(item.name || '').trim(),
    position: String(item.position || '').trim(),
    jerseyNumber: item.jerseyNumber === '' || item.jerseyNumber === undefined || item.jerseyNumber === null ? null : Number(item.jerseyNumber),
  };
}).filter((item) => item.name.length >= 2).slice(0, 80);
const registeredPlayerIds = (value) => [...new Set(parseArray(value).map(idString).filter(Boolean))].slice(0, 80);
const publicUploadImage = (image, caption = '') => ({ ...image, caption });

const uploadImageFile = async ({ storage, file, folder }) => {
  const uploaded = await storage.upload({
    buffer: file.buffer,
    folder,
    publicId: `${Date.now()}-${crypto.randomUUID()}`,
  });
  return metadataFromUpload(uploaded, file.size);
};

const uploadImageFiles = async ({ storage, files = [], folder }) => Promise.all(
  files.map(async (file) => publicUploadImage(await uploadImageFile({ storage, file, folder }))),
);

const cleanupUploaded = async ({ storage, images = [] }) => {
  await Promise.all(images
    .map((image) => image?.publicId)
    .filter(Boolean)
    .map((publicId) => storage.destroy(publicId).catch(() => {})));
};

export const safeAchievement = (achievement) => ({
  id: idString(achievement._id || achievement.id),
  team: idString(achievement.team),
  teamName: achievement.team?.name || achievement.teamName || '',
  teamSlug: achievement.team?.slug || achievement.teamSlug || '',
  teamLogo: publicTeamImage(achievement.team?.logo || achievement.teamLogo).imageUrl,
  tournamentName: achievement.tournamentName,
  position: achievement.position,
  year: achievement.year,
  category: achievement.category || 'inter_college',
  description: achievement.description || '',
  trophyImage: publicImage(achievement.trophyImage).imageUrl,
  trophyImages: [
    ...(publicImage(achievement.trophyImage).imageUrl ? [{ imageUrl: publicImage(achievement.trophyImage).imageUrl, caption: '' }] : []),
    ...asArray(achievement.trophyImages).map((image) => ({ imageUrl: image.imageUrl, caption: image.caption || '' })).filter((image) => image.imageUrl),
  ],
  celebrationPhotos: asArray(achievement.celebrationPhotos).map((image) => ({ imageUrl: image.imageUrl, caption: image.caption || '' })).filter((image) => image.imageUrl),
  certificateUrl: achievement.certificateUrl || '',
  matchReportLink: achievement.matchReportLink || '',
  winningSquad: {
    registeredPlayers: asArray(achievement.winningSquad?.registeredPlayers).map((player) => ({
      playerId: idString(player.player),
      name: player.name,
      position: player.position || '',
      jerseyNumber: player.jerseyNumber ?? null,
      photoUrl: player.photoUrl || '',
    })),
    manualPlayers: asArray(achievement.winningSquad?.manualPlayers).map((player) => ({
      name: player.name,
      position: player.position || '',
      jerseyNumber: player.jerseyNumber ?? null,
    })),
  },
  createdAt: achievement.createdAt,
  updatedAt: achievement.updatedAt,
});

export const safePlayerTrophy = (trophy) => ({
  id: idString(trophy._id || trophy.id),
  achievementId: idString(trophy.achievement),
  tournamentName: trophy.tournamentName,
  position: trophy.position,
  year: trophy.year,
  category: trophy.category || 'inter_college',
  teamName: trophy.teamName || trophy.team?.name || '',
  teamSlug: trophy.teamSlug || trophy.team?.slug || '',
  teamLogo: publicTeamImage(trophy.team?.logo || trophy.teamLogo).imageUrl || trophy.teamLogo || '',
  trophyImages: asArray(trophy.trophyImages).filter((image) => image.imageUrl).map((image) => ({ imageUrl: image.imageUrl, caption: image.caption || '' })),
  celebrationPhotos: asArray(trophy.celebrationPhotos).filter((image) => image.imageUrl).map((image) => ({ imageUrl: image.imageUrl, caption: image.caption || '' })),
  description: trophy.description || '',
  achievementUrl: trophy.teamSlug ? `/teams/${trophy.teamSlug}/achievements/${idString(trophy.achievement)}` : '',
});

const normalizeInput = async ({ input, teamId, playerModel = Player }) => {
  const ids = registeredPlayerIds(input.winningSquadRegisteredPlayers ?? input.registeredPlayerIds);
  const players = ids.length
    ? await playerModel.find({ _id: { $in: ids }, team: teamId, isActive: true }).select('name position jerseyNumber photo photoUrl').lean()
    : [];
  if (players.length !== ids.length) throw new AppError('Choose registered winning-squad players from your active squad only.', 400, 'INVALID_WINNING_SQUAD');
  return {
    tournamentName: input.tournamentName,
    position: input.position,
    year: input.year,
    category: input.category || 'inter_college',
    description: input.description || '',
    trophyImages: imageList(input.trophyImages),
    celebrationPhotos: imageList(input.celebrationPhotos),
    certificateUrl: safeUrl(input.certificateUrl),
    matchReportLink: safeUrl(input.matchReportLink),
    winningSquad: {
      registeredPlayers: players.map((player) => ({
        player: player._id,
        name: player.name,
        position: player.position || '',
        jerseyNumber: player.jerseyNumber ?? null,
        photoUrl: playerPhotoUrl(player),
      })),
      manualPlayers: manualPlayers(input.winningSquadManualPlayers ?? input.manualPlayers),
    },
  };
};

const currentAchievementInput = (achievement, input = {}) => {
  const current = typeof achievement.toObject === 'function' ? achievement.toObject() : achievement;
  const hasOwn = (field) => Object.hasOwn(input, field);
  return {
    tournamentName: hasOwn('tournamentName') ? input.tournamentName : current.tournamentName,
    position: hasOwn('position') ? input.position : current.position,
    year: hasOwn('year') ? input.year : current.year,
    category: hasOwn('category') ? input.category : current.category,
    description: hasOwn('description') ? input.description : current.description,
    trophyImages: hasOwn('trophyImages') ? input.trophyImages : asArray(current.trophyImages),
    celebrationPhotos: hasOwn('celebrationPhotos') ? input.celebrationPhotos : asArray(current.celebrationPhotos),
    certificateUrl: hasOwn('certificateUrl') ? input.certificateUrl : current.certificateUrl,
    matchReportLink: hasOwn('matchReportLink') ? input.matchReportLink : current.matchReportLink,
    winningSquadRegisteredPlayers: hasOwn('winningSquadRegisteredPlayers') || hasOwn('registeredPlayerIds')
      ? (input.winningSquadRegisteredPlayers ?? input.registeredPlayerIds)
      : asArray(current.winningSquad?.registeredPlayers).map((player) => player.player),
    winningSquadManualPlayers: hasOwn('winningSquadManualPlayers') || hasOwn('manualPlayers')
      ? (input.winningSquadManualPlayers ?? input.manualPlayers)
      : asArray(current.winningSquad?.manualPlayers),
  };
};

export const syncPlayerTrophies = async ({ trophyModel = PlayerTrophy, teamModel = Team, achievement }) => {
  const plain = typeof achievement.toJSON === 'function' ? achievement.toJSON() : achievement;
  const team = await teamModel.findById(plain.team).select('name slug logo').lean();
  const activePlayerIds = asArray(plain.winningSquad?.registeredPlayers).map((player) => idString(player.player)).filter(Boolean);
  const activeSet = new Set(activePlayerIds);
  await trophyModel.updateMany({ achievement: plain._id, player: { $nin: activePlayerIds } }, { $set: { isActive: false } });
  await Promise.all(asArray(plain.winningSquad?.registeredPlayers).map((player) => trophyModel.findOneAndUpdate(
    { achievement: plain._id, player: player.player },
    {
      $set: {
        player: player.player,
        team: plain.team,
        achievement: plain._id,
        tournamentName: plain.tournamentName,
        position: plain.position,
        year: plain.year,
        category: plain.category || 'inter_college',
        teamName: team?.name || '',
        teamSlug: team?.slug || '',
        teamLogo: publicTeamImage(team?.logo).imageUrl,
        trophyImages: safeAchievement(plain).trophyImages,
        celebrationPhotos: safeAchievement(plain).celebrationPhotos,
        description: plain.description || '',
        isActive: true,
      },
    },
    { upsert: true, new: true, setDefaultsOnInsert: true },
  )));
  return { synced: activeSet.size };
};

export const listAchievements = async ({ achievementModel = TeamAchievement, teamId }) => {
  const achievements = await achievementModel.find({ team: teamId, isActive: true }).populate('team', 'name slug logo').sort({ year: -1, createdAt: -1 }).lean();
  return { achievements: achievements.map(safeAchievement) };
};

export const getAchievementDetail = async ({ achievementModel = TeamAchievement, teamId, achievementId }) => {
  const achievement = await achievementModel.findOne({ _id: achievementId, team: teamId, isActive: true }).populate('team', 'name slug logo').lean();
  if (!achievement) throw new AppError('Achievement not found.', 404, 'ACHIEVEMENT_NOT_FOUND');
  return { achievement: safeAchievement(achievement) };
};

export const createAchievement = async ({
  achievementModel = TeamAchievement,
  storage = cloudinaryClient,
  teamId,
  userId,
  input = {},
  file = null,
  files = {},
  playerModel = Player,
  trophyModel = PlayerTrophy,
  teamModel = Team,
}) => {
  let trophyImage = null;
  let uploadedTrophyImages = [];
  let uploadedCelebrationPhotos = [];
  try {
    const normalized = await normalizeInput({ input, teamId, playerModel });
    const folder = `${env.cloudinary.folder}/teams/${teamId}/achievements`;
    if (file) {
      trophyImage = await uploadImageFile({ storage, file, folder });
    }
    uploadedTrophyImages = await uploadImageFiles({ storage, files: files?.trophyImages || [], folder: `${folder}/trophies` });
    uploadedCelebrationPhotos = await uploadImageFiles({ storage, files: files?.celebrationPhotos || [], folder: `${folder}/celebrations` });
    const achievement = await achievementModel.create({
      team: teamId,
      ...normalized,
      trophyImage,
      trophyImages: [...uploadedTrophyImages, ...normalized.trophyImages],
      celebrationPhotos: [...uploadedCelebrationPhotos, ...normalized.celebrationPhotos],
      createdBy: userId,
    });
    await syncPlayerTrophies({ trophyModel, teamModel, achievement });
    await logTeamActivity({
      teamId,
      actor: userId,
      type: 'achievement_added',
      title: 'Achievement added',
      message: `${achievement.tournamentName} - ${achievement.position}`,
      metadata: { achievementId: achievement._id },
    });
    return { achievement: safeAchievement(achievement) };
  } catch (error) {
    if (trophyImage?.publicId) await storage.destroy(trophyImage.publicId).catch(() => {});
    await cleanupUploaded({ storage, images: [...uploadedTrophyImages, ...uploadedCelebrationPhotos] });
    throw error;
  }
};

export const updateAchievement = async ({
  achievementModel = TeamAchievement,
  teamId,
  achievementId,
  input = {},
  playerModel = Player,
  trophyModel = PlayerTrophy,
  teamModel = Team,
}) => {
  const current = await achievementModel.findOne({ _id: achievementId, team: teamId, isActive: true });
  if (!current) throw new AppError('Achievement not found.', 404, 'ACHIEVEMENT_NOT_FOUND');
  const normalized = await normalizeInput({ input: currentAchievementInput(current, input), teamId, playerModel });
  Object.assign(current, normalized);
  await current.save();
  await syncPlayerTrophies({ trophyModel, teamModel, achievement: current });
  const achievement = await achievementModel.findById(current._id).populate('team', 'name slug logo').lean();
  if (!achievement) throw new AppError('Achievement not found.', 404, 'ACHIEVEMENT_NOT_FOUND');
  return { achievement: safeAchievement(achievement) };
};

export const deleteAchievement = async ({ achievementModel = TeamAchievement, trophyModel = PlayerTrophy, storage = cloudinaryClient, teamId, achievementId }) => {
  const achievement = await achievementModel.findOne({ _id: achievementId, team: teamId, isActive: true });
  if (!achievement) throw new AppError('Achievement not found.', 404, 'ACHIEVEMENT_NOT_FOUND');
  await cleanupUploaded({
    storage,
    images: [
      achievement.trophyImage,
      ...asArray(achievement.trophyImages),
      ...asArray(achievement.celebrationPhotos),
    ],
  });
  achievement.isActive = false;
  await achievement.save();
  await trophyModel.updateMany({ achievement: achievement._id }, { $set: { isActive: false } });
  return { message: 'Achievement deleted.' };
};

export const listPlayerTrophies = async ({ trophyModel = PlayerTrophy, playerId }) => {
  const trophies = await trophyModel.find({ player: playerId, isActive: true }).sort({ year: -1, createdAt: -1 }).lean();
  return trophies.map(safePlayerTrophy);
};
