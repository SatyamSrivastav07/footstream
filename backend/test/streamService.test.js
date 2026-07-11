import test from 'node:test';
import assert from 'node:assert/strict';
import { validationResult } from 'express-validator';
import { parseYouTubeUrl } from '../src/utils/youtube.js';
import { configureStream, getAdminStream, getPublicStream, removeStream, serializePublicStream, setStreamStatus } from '../src/services/streamService.js';
import { configureStreamValidator } from '../src/validators/streamValidators.js';
import teamRoutes from '../src/routes/teamRoutes.js';
import adminRoutes from '../src/routes/adminRoutes.js';
import { protect } from '../src/middleware/auth.js';
import Match from '../src/models/Match.js';

const id = 'dQw4w9WgXcQ';
const accepted = [
  [`https://www.youtube.com/watch?v=${id}`, 'watch'],
  [`https://youtu.be/${id}`, 'short'],
  [`https://www.youtube.com/live/${id}`, 'live'],
  [`https://www.youtube.com/embed/${id}`, 'embed'],
];

for (const [url, name] of accepted) test(`${name} YouTube URL is normalized`, () => {
  const value = parseYouTubeUrl(url);
  assert.equal(value.videoId, id); assert.equal(value.embedUrl, `https://www.youtube.com/embed/${id}`);
});

test('malformed YouTube URL is rejected', () => assert.throws(() => parseYouTubeUrl('not-a-url'), (error) => error.code === 'INVALID_YOUTUBE_URL'));
test('non-YouTube URL is rejected', () => assert.throws(() => parseYouTubeUrl(`https://example.com/watch?v=${id}`), (error) => error.code === 'INVALID_YOUTUBE_HOST'));
test('raw iframe markup is rejected', () => assert.throws(() => parseYouTubeUrl(`<iframe src="https://youtu.be/${id}"></iframe>`), (error) => error.code === 'INVALID_YOUTUBE_URL'));
test('invalid video ID is rejected', () => assert.throws(() => parseYouTubeUrl('https://youtu.be/short'), (error) => error.code === 'INVALID_YOUTUBE_VIDEO_ID'));
test('lookalike YouTube host is rejected', () => assert.throws(() => parseYouTubeUrl(`https://youtube.com.evil.test/watch?v=${id}`), (error) => error.code === 'INVALID_YOUTUBE_HOST'));

const makeMatch = (overrides = {}) => ({
  _id: 'm1', team: 't1', status: 'scheduled', isActive: true, stream: null, updatedBy: null,
  save: async function save() { this.saved = true; }, ...overrides,
});
const ownedModel = (match) => ({ findOne: async (filter) => String(filter.team) === 't1' ? match : null });

test('team admin creates and updates an owned match stream', async () => {
  const match = makeMatch(); const matchModel = ownedModel(match);
  const created = await configureStream({ matchModel, matchId: 'm1', teamId: 't1', userId: 'u1', input: { sourceUrl: `https://youtu.be/${id}`, title: 'Matchday', isEnabled: true } });
  assert.equal(created.videoId, id); assert.equal(created.isEnabled, true); assert.equal(created.addedBy, undefined); assert.equal(match.saved, true);
  const addedAt = match.stream.addedAt;
  const updated = await configureStream({ matchModel, matchId: 'm1', teamId: 't1', userId: 'u1', input: { sourceUrl: `https://youtube.com/watch?v=${id}`, title: 'Updated' } });
  assert.equal(updated.title, 'Updated'); assert.equal(match.stream.addedAt, addedAt);
});

test('cross-team stream configuration returns not found', async () => {
  await assert.rejects(configureStream({ matchModel: ownedModel(makeMatch()), matchId: 'm1', teamId: 'other', userId: 'u2', input: { sourceUrl: `https://youtu.be/${id}` } }), (error) => error.statusCode === 404);
});

test('configured stream can be disabled, enabled, and removed', async () => {
  const match = makeMatch({ stream: { provider: 'youtube', sourceUrl: `https://youtu.be/${id}`, videoId: id, embedUrl: `https://www.youtube.com/embed/${id}`, isEnabled: true, addedBy: 'u1', addedAt: new Date(), updatedAt: new Date() } });
  const matchModel = ownedModel(match);
  assert.equal((await setStreamStatus({ matchModel, matchId: 'm1', teamId: 't1', userId: 'u1', isEnabled: false })).isEnabled, false);
  assert.equal((await setStreamStatus({ matchModel, matchId: 'm1', teamId: 't1', userId: 'u1', isEnabled: true })).isEnabled, true);
  await removeStream({ matchModel, matchId: 'm1', teamId: 't1', userId: 'u1' }); assert.equal(match.stream, null);
});

test('cancelled match cannot be configured', async () => {
  await assert.rejects(configureStream({ matchModel: ownedModel(makeMatch({ status: 'cancelled' })), matchId: 'm1', teamId: 't1', userId: 'u1', input: { sourceUrl: `https://youtu.be/${id}` } }), (error) => error.code === 'MATCH_CANCELLED');
});

test('cancelled match configuration can still be safely removed', async () => {
  const match = makeMatch({ status: 'cancelled', stream: { videoId: id } });
  await removeStream({ matchModel: ownedModel(match), matchId: 'm1', teamId: 't1', userId: 'u1' });
  assert.equal(match.stream, null);
});

test('disabled, cancelled, and soft-deleted streams are not publicly playable', () => {
  const stream = { provider: 'youtube', videoId: id, embedUrl: `https://www.youtube.com/embed/${id}`, isEnabled: true, sourceUrl: 'private', addedBy: 'u1' };
  assert.equal(serializePublicStream(makeMatch({ stream: { ...stream, isEnabled: false } })).isPlayable, false);
  assert.equal(serializePublicStream(makeMatch({ stream, status: 'cancelled' })).isPlayable, false);
  assert.equal(serializePublicStream(makeMatch({ stream, isActive: false })).isPlayable, false);
});

test('public stream hides source URL, user information, and disabled playback fields', async () => {
  const match = makeMatch({ stream: { provider: 'youtube', sourceUrl: `https://youtu.be/${id}`, videoId: id, embedUrl: `https://www.youtube.com/embed/${id}`, title: 'Live', isEnabled: true, addedBy: 'u1' } });
  const matchModel = { findById: () => ({ select: async () => match }) };
  const value = await getPublicStream({ matchModel, matchId: 'm1' });
  assert.equal(value.isPlayable, true); assert.equal(value.sourceUrl, undefined); assert.equal(value.addedBy, undefined);
  match.stream.isEnabled = false; const disabled = await getPublicStream({ matchModel, matchId: 'm1' });
  assert.equal(disabled.videoId, ''); assert.equal(disabled.embedUrl, '');
});

test('general Match JSON serialization also removes nested stream ownership and source URL', () => {
  const value = new Match({ stream: { provider: 'youtube', sourceUrl: `https://youtu.be/${id}`, videoId: id, embedUrl: `https://www.youtube.com/embed/${id}`, isEnabled: true, addedBy: '507f1f77bcf86cd799439011', addedAt: new Date(), updatedAt: new Date() } }).toJSON();
  assert.equal(value.stream.sourceUrl, undefined); assert.equal(value.stream.addedBy, undefined);
});

test('super admin read returns sanitized configuration', async () => {
  const match = makeMatch({ stream: { provider: 'youtube', sourceUrl: `https://youtu.be/${id}`, videoId: id, embedUrl: `https://www.youtube.com/embed/${id}`, isEnabled: true, addedBy: 'u1' } });
  const value = await getAdminStream({ matchModel: { findById: () => ({ select: async () => match }) }, matchId: 'm1' });
  assert.equal(value.stream.videoId, id); assert.equal(value.stream.addedBy, undefined);
});

test('protected stream fields are rejected by request validation', async () => {
  for (const field of ['videoId', 'embedUrl', 'addedBy', 'teamId']) {
    const req = { params: { matchId: '507f1f77bcf86cd799439011' }, body: { sourceUrl: `https://youtu.be/${id}`, [field]: 'blocked' } };
    await Promise.all(configureStreamValidator.map((validator) => validator.run(req)));
    assert.ok(validationResult(req).array().some((error) => error.msg.includes('Unsupported stream fields')));
  }
});

const routeMethods = (router, path) => router.stack.filter((layer) => layer.route?.path === path).flatMap((layer) => Object.keys(layer.route.methods));
test('team stream routes expose required mutations while super-admin remains read-only', () => {
  assert.deepEqual(new Set(routeMethods(teamRoutes, '/matches/:matchId/stream')), new Set(['get', 'put', 'delete']));
  assert.ok(routeMethods(teamRoutes, '/matches/:matchId/stream/status').includes('patch'));
  assert.deepEqual(routeMethods(adminRoutes, '/matches/:matchId/stream'), ['get']);
});

test('anonymous requests remain blocked by authentication middleware', async () => {
  await new Promise((resolve, reject) => protect({ cookies: {} }, {}, (error) => {
    try { assert.equal(error.code, 'AUTH_REQUIRED'); assert.equal(error.statusCode, 401); resolve(); } catch (assertionError) { reject(assertionError); }
  }));
});
