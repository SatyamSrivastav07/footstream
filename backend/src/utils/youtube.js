import AppError from './AppError.js';
import { URL } from 'node:url';

const VIDEO_ID_PATTERN = /^[A-Za-z0-9_-]{11}$/;
const YOUTUBE_HOSTS = new Set(['youtube.com', 'www.youtube.com', 'm.youtube.com']);

const assertVideoId = (videoId) => {
  if (!VIDEO_ID_PATTERN.test(videoId || '')) throw new AppError('The YouTube URL does not contain a valid video ID.', 400, 'INVALID_YOUTUBE_VIDEO_ID');
  return videoId;
};

export const parseYouTubeUrl = (sourceUrl) => {
  if (typeof sourceUrl !== 'string' || /<|>|iframe|script/i.test(sourceUrl)) {
    throw new AppError('Enter a supported YouTube URL, not embed markup.', 400, 'INVALID_YOUTUBE_URL');
  }
  let url;
  try { url = new URL(sourceUrl.trim()); } catch { throw new AppError('Enter a valid YouTube URL.', 400, 'INVALID_YOUTUBE_URL'); }
  if (url.protocol !== 'https:' || url.username || url.password || url.port) throw new AppError('YouTube URLs must use HTTPS.', 400, 'INVALID_YOUTUBE_URL');

  const host = url.hostname.toLowerCase();
  let videoId = '';
  if (host === 'youtu.be') {
    const segments = url.pathname.split('/').filter(Boolean);
    if (segments.length !== 1) throw new AppError('Use a supported YouTube short URL.', 400, 'INVALID_YOUTUBE_URL');
    [videoId] = segments;
  } else if (YOUTUBE_HOSTS.has(host)) {
    const segments = url.pathname.split('/').filter(Boolean);
    if (url.pathname === '/watch') videoId = url.searchParams.get('v') || '';
    else if (['live', 'embed'].includes(segments[0]) && segments.length === 2) videoId = segments[1];
    else throw new AppError('Use a supported YouTube watch, live, short, or embed URL.', 400, 'INVALID_YOUTUBE_URL');
  } else {
    throw new AppError('Only YouTube URLs are supported.', 400, 'INVALID_YOUTUBE_HOST');
  }

  assertVideoId(videoId);
  return { sourceUrl: url.toString(), videoId, embedUrl: `https://www.youtube.com/embed/${videoId}` };
};

export const isYouTubeVideoId = (value) => VIDEO_ID_PATTERN.test(value || '');
