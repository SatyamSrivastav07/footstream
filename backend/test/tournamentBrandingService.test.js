import test from 'node:test';
import assert from 'node:assert/strict';
import { Buffer } from 'node:buffer';
import { validateTournamentBrandingSignature } from '../src/middleware/photoUpload.js';
import {
  removeParticipantLogo,
  removeTournamentCover,
  removeTournamentLogo,
  uploadParticipantLogo,
  uploadTournamentCover,
  uploadTournamentLogo,
} from '../src/services/tournamentBrandingService.js';

const ids = {
  user: '660000000000000000000001',
  team: '660000000000000000000002',
  otherTeam: '660000000000000000000003',
  tournament: '660000000000000000000004',
  participant: '660000000000000000000005',
};
const jpeg = Buffer.from([0xff, 0xd8, 0xff, 0x00]);
const png = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
const webp = Buffer.from('RIFFxxxxWEBP');

const file = (overrides = {}) => ({
  buffer: jpeg,
  size: jpeg.length,
  mimetype: 'image/jpeg',
  originalname: 'logo.jpg',
  ...overrides,
});

const user = { _id: ids.user, team: ids.team };
const asDoc = (value) => ({
  ...value,
  save: async function save() { return this; },
  toObject() { return { ...this }; },
});
const tournamentDoc = (overrides = {}) => asDoc({
  _id: ids.tournament,
  hostTeam: ids.team,
  name: 'RANN',
  slug: 'rann',
  scope: 'inter_college',
  approvalStatus: 'draft',
  lifecycleStatus: 'draft',
  isArchived: false,
  logo: {},
  coverImage: {},
  ...overrides,
});
const participantDoc = (overrides = {}) => asDoc({
  _id: ids.participant,
  tournament: ids.tournament,
  participantType: 'external_team',
  displayName: 'IMS FC',
  slug: 'ims-fc',
  status: 'pending',
  logo: {},
  ...overrides,
});
const tournamentModelFor = (tournament, capture = () => {}) => ({
  findOne: async (filter) => {
    capture(filter);
    return tournament;
  },
});
const participantModelFor = (participant, capture = () => {}) => ({
  findOne: async (filter) => {
    capture(filter);
    return participant;
  },
});
const storage = (calls = []) => ({
  upload: async ({ folder }) => {
    calls.push(['upload', folder]);
    return { secure_url: 'https://res.cloudinary.com/tournament/logo.jpg', public_id: 'new-public-id', width: 500, height: 500, format: 'jpg', bytes: 1234 };
  },
  destroy: async (publicId) => {
    calls.push(['destroy', publicId]);
    return { result: 'ok' };
  },
});
const history = (calls = []) => async (entry) => {
  calls.push(entry);
  return entry;
};
const validateFile = async (value) =>
  new Promise((resolve) => {
    validateTournamentBrandingSignature({ file: value }, {}, (error) => resolve(error || null));
  });

test('tournament branding signature validation accepts JPEG PNG and WebP', async () => {
  assert.equal(await validateFile(file({ buffer: jpeg, mimetype: 'image/jpeg' })), null);
  assert.equal(await validateFile(file({ buffer: png, mimetype: 'image/png' })), null);
  assert.equal(await validateFile(file({ buffer: webp, mimetype: 'image/webp' })), null);
});

test('tournament branding signature validation rejects missing and malformed content', async () => {
  assert.equal((await validateFile(null)).code, 'TOURNAMENT_IMAGE_REQUIRED');
  assert.equal((await validateFile(file({ buffer: Buffer.from('nope') }))).code, 'INVALID_TOURNAMENT_IMAGE_CONTENT');
});

test('host can upload tournament logo and cover while draft', async () => {
  const calls = [];
  const historyCalls = [];
  const tournament = tournamentDoc();
  const logo = await uploadTournamentLogo({ tournamentModel: tournamentModelFor(tournament), storage: storage(calls), createHistory: history(historyCalls), user, tournamentId: ids.tournament, file: file() });
  assert.equal(logo.tournament.logo.imageUrl, 'https://res.cloudinary.com/tournament/logo.jpg');
  assert.equal('publicId' in logo.tournament.logo, false);
  await uploadTournamentCover({ tournamentModel: tournamentModelFor(tournament), storage: storage(calls), createHistory: history(historyCalls), user, tournamentId: ids.tournament, file: file() });
  assert.ok(calls.some((call) => call[1] === `footstream/tournaments/${ids.tournament}/branding/logo`));
  assert.ok(calls.some((call) => call[1] === `footstream/tournaments/${ids.tournament}/branding/cover`));
  assert.equal(historyCalls.filter((entry) => entry.action === 'branding_updated').length, 2);
});

test('branding upload rejects cross-team, locked, and oversized updates', async () => {
  await assert.rejects(
    uploadTournamentLogo({ tournamentModel: tournamentModelFor(null), storage: storage(), createHistory: history(), user, tournamentId: ids.tournament, file: file() }),
    (error) => error.code === 'TOURNAMENT_NOT_FOUND',
  );
  await assert.rejects(
    uploadTournamentLogo({ tournamentModel: tournamentModelFor(tournamentDoc({ approvalStatus: 'approved' })), storage: storage(), createHistory: history(), user, tournamentId: ids.tournament, file: file() }),
    (error) => error.code === 'TOURNAMENT_NOT_EDITABLE',
  );
  await assert.rejects(
    uploadTournamentLogo({ tournamentModel: tournamentModelFor(tournamentDoc()), storage: storage(), createHistory: history(), user, tournamentId: ids.tournament, file: file({ size: 2 * 1024 * 1024 + 1 }) }),
    (error) => error.code === 'TOURNAMENT_IMAGE_TOO_LARGE',
  );
});

test('tournament branding replacement cleans old asset and save failure cleans new asset', async () => {
  const calls = [];
  const tournament = tournamentDoc({ logo: { imageUrl: 'old', publicId: 'old-public-id' } });
  await uploadTournamentLogo({ tournamentModel: tournamentModelFor(tournament), storage: storage(calls), createHistory: history(), user, tournamentId: ids.tournament, file: file() });
  assert.deepEqual(calls, [['upload', `footstream/tournaments/${ids.tournament}/branding/logo`], ['destroy', 'old-public-id']]);

  const failureCalls = [];
  const failing = tournamentDoc();
  failing.save = async () => { throw new Error('db failed'); };
  await assert.rejects(uploadTournamentLogo({ tournamentModel: tournamentModelFor(failing), storage: storage(failureCalls), createHistory: history(), user, tournamentId: ids.tournament, file: file() }));
  assert.deepEqual(failureCalls, [['upload', `footstream/tournaments/${ids.tournament}/branding/logo`], ['destroy', 'new-public-id']]);
});

test('tournament branding delete is idempotent and records audit history', async () => {
  const calls = [];
  const historyCalls = [];
  const tournament = tournamentDoc({ logo: { imageUrl: 'old', publicId: 'old-public-id' }, coverImage: {} });
  await removeTournamentLogo({ tournamentModel: tournamentModelFor(tournament), storage: storage(calls), createHistory: history(historyCalls), user, tournamentId: ids.tournament });
  await removeTournamentCover({ tournamentModel: tournamentModelFor(tournament), storage: storage(calls), createHistory: history(historyCalls), user, tournamentId: ids.tournament });
  assert.deepEqual(calls, [['destroy', 'old-public-id']]);
  assert.equal(historyCalls.filter((entry) => entry.action === 'branding_removed').length, 2);
});

test('participant logo upload is tournament-scoped and never mutates permanent team branding', async () => {
  let participantFilter;
  const calls = [];
  const historyCalls = [];
  const participant = participantDoc({ participantType: 'registered_team', registeredTeam: ids.otherTeam, logo: { imageUrl: 'team snapshot', publicId: '' } });
  const result = await uploadParticipantLogo({
    tournamentModel: tournamentModelFor(tournamentDoc()),
    participantModel: participantModelFor(participant, (filter) => { participantFilter = filter; }),
    storage: storage(calls),
    createHistory: history(historyCalls),
    user,
    tournamentId: ids.tournament,
    participantId: ids.participant,
    file: file(),
  });
  assert.deepEqual(participantFilter, { _id: ids.participant, tournament: ids.tournament });
  assert.equal(result.participant.logo.imageUrl, 'https://res.cloudinary.com/tournament/logo.jpg');
  assert.deepEqual(calls, [['upload', `footstream/tournaments/${ids.tournament}/participants/${ids.participant}`]]);
  assert.equal(historyCalls[0].action, 'participant_branding_updated');
});

test('participant logo removal cleans only participant snapshot asset', async () => {
  const calls = [];
  const participant = participantDoc({ logo: { imageUrl: 'old', publicId: 'participant-old-id' } });
  await removeParticipantLogo({
    tournamentModel: tournamentModelFor(tournamentDoc()),
    participantModel: participantModelFor(participant),
    storage: storage(calls),
    createHistory: history(),
    user,
    tournamentId: ids.tournament,
    participantId: ids.participant,
  });
  assert.deepEqual(calls, [['destroy', 'participant-old-id']]);
});
