import Match from '../models/Match.js';
import AppError from '../utils/AppError.js';
import { parseYouTubeUrl } from '../utils/youtube.js';

const plain = (value) => typeof value?.toObject === 'function' ? value.toObject() : value ? { ...value } : null;

export const serializeManagedStream = (stream) => {
  const value = plain(stream);
  if (!value) return null;
  delete value.addedBy;
  return value;
};

export const serializePublicStream = (match) => {
  const stream = plain(match?.stream);
  const isPlayable = Boolean(match?.isActive && match?.status !== 'cancelled' && stream?.isEnabled && stream?.videoId && stream?.embedUrl);
  if (!stream) return { provider: null, videoId: '', embedUrl: '', title: '', scheduledLiveAt: null, isEnabled: false, isPlayable: false };
  return { provider: stream.provider, videoId: isPlayable ? stream.videoId : '', embedUrl: isPlayable ? stream.embedUrl : '', title: stream.title || '', scheduledLiveAt: stream.scheduledLiveAt || null, isEnabled: Boolean(stream.isEnabled), isPlayable };
};

export const findOwnedStreamMatch = async ({ matchModel = Match, matchId, teamId }) => {
  const match = await matchModel.findOne({ _id: matchId, team: teamId, isActive: true });
  if (!match) throw new AppError('Match not found.', 404, 'MATCH_NOT_FOUND');
  return match;
};

const assertConfigurable = (match) => {
  if (match.status === 'cancelled') throw new AppError('Cancelled matches cannot have stream configuration.', 409, 'MATCH_CANCELLED');
};

export const getOwnedStream = async (options) => serializeManagedStream((await findOwnedStreamMatch(options)).stream);

export const configureStream = async ({ matchModel = Match, matchId, teamId, userId, input, now = new Date() }) => {
  const match = await findOwnedStreamMatch({ matchModel, matchId, teamId });
  assertConfigurable(match);
  const normalized = parseYouTubeUrl(input.sourceUrl);
  const previous = plain(match.stream);
  match.stream = { provider: 'youtube', ...normalized, title: input.title || '', scheduledLiveAt: input.scheduledLiveAt || null, isEnabled: input.isEnabled ?? previous?.isEnabled ?? false, addedBy: previous?.addedBy || userId, addedAt: previous?.addedAt || now, updatedAt: now };
  match.updatedBy = userId;
  await match.save();
  return serializeManagedStream(match.stream);
};

export const setStreamStatus = async ({ matchModel = Match, matchId, teamId, userId, isEnabled, now = new Date() }) => {
  const match = await findOwnedStreamMatch({ matchModel, matchId, teamId });
  assertConfigurable(match);
  if (!match.stream) throw new AppError('Configure a YouTube stream first.', 409, 'STREAM_NOT_CONFIGURED');
  match.stream.isEnabled = isEnabled; match.stream.updatedAt = now; match.updatedBy = userId;
  await match.save(); return serializeManagedStream(match.stream);
};

export const removeStream = async ({ matchModel = Match, matchId, teamId, userId }) => {
  const match = await findOwnedStreamMatch({ matchModel, matchId, teamId });
  match.stream = null; match.updatedBy = userId; await match.save();
};

export const getPublicStream = async ({ matchModel = Match, matchId }) => {
  const match = await matchModel.findById(matchId).select('stream status isActive');
  if (!match) throw new AppError('Match not found.', 404, 'MATCH_NOT_FOUND');
  return serializePublicStream(match);
};

export const getAdminStream = async ({ matchModel = Match, matchId }) => {
  const match = await matchModel.findById(matchId).select('stream status isActive team');
  if (!match) throw new AppError('Match not found.', 404, 'MATCH_NOT_FOUND');
  return { stream: serializeManagedStream(match.stream), status: match.status, isActive: match.isActive, team: match.team };
};
