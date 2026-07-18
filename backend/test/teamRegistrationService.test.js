import test from 'node:test';
import assert from 'node:assert/strict';
import { Buffer } from 'node:buffer';
import { validationResult } from 'express-validator';
import {
  approveTeamRegistrationRequest,
  getPublicTeamRegistrationStatus,
  rejectTeamRegistrationRequest,
  requestTeamRegistrationChanges,
  submitTeamRegistrationRequest,
} from '../src/services/teamRegistrationService.js';
import { validateTeamRegistrationMediaSignatures } from '../src/middleware/photoUpload.js';
import {
  approveTeamRegistrationValidator,
  rejectTeamRegistrationValidator,
  requestChangesTeamRegistrationValidator,
  submitTeamRegistrationValidator,
} from '../src/validators/teamRegistrationValidators.js';

const reviewerId = '650000000000000000000001';
const requestId = '650000000000000000000010';
const jpeg = Buffer.from([0xff, 0xd8, 0xff, 0x00]);
const png = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
const webp = Buffer.from('RIFFxxxxWEBP');
const input = {
  teamName: 'FC KIET',
  shortName: 'KIET',
  city: 'Ghaziabad',
  state: 'UP',
  country: 'India',
  foundedYear: 2020,
  primaryColor: '#00ff88',
  secondaryColor: '#101010',
  description: 'Campus football club',
  instagramUrl: 'https://instagram.com/fckiet',
  websiteUrl: 'https://fckiet.example',
  representativeName: 'Satyam',
  roleInTeam: 'Manager',
  email: 'SATYAM@EXAMPLE.COM',
  phone: '+91 98765 43210',
  message: 'Please review our club.',
};

const file = (overrides = {}) => ({ buffer: jpeg, size: jpeg.length, mimetype: 'image/jpeg', ...overrides });
const storage = (calls = []) => ({
  upload: async ({ folder }) => {
    calls.push(['upload', folder]);
    return { secure_url: 'https://res.cloudinary.com/demo/team.jpg', public_id: `public-${calls.length}`, width: 640, height: 480, format: 'jpg', bytes: 1234 };
  },
  destroy: async (publicId) => {
    calls.push(['destroy', publicId]);
    return { result: 'ok' };
  },
});
const teamModel = ({ exists = null, created = null } = {}) => ({
  exists: async () => exists,
  create: async (data) => created || { ...data, _id: 'team1' },
  deleteOne: async () => ({ deletedCount: 1 }),
});
const userModel = ({ exists = null, created = null, failCreate = false } = {}) => ({
  exists: async () => exists,
  create: async (data) => {
    if (failCreate) throw new Error('user create failed');
    return created || { ...data, _id: 'admin1' };
  },
  deleteOne: async () => ({ deletedCount: 1 }),
});
const requestDocument = (overrides = {}) => ({
  _id: requestId,
  requestCode: 'FSTR-ABC123',
  status: 'pending',
  teamName: 'FC KIET',
  normalizedTeamName: 'fc kiet',
  shortName: 'KIET',
  city: 'Ghaziabad',
  state: 'UP',
  country: 'India',
  foundedYear: 2020,
  primaryColor: '#00ff88',
  secondaryColor: '#101010',
  description: 'Campus football club',
  instagramUrl: 'https://instagram.com/fckiet',
  websiteUrl: 'https://fckiet.example',
  representativeName: 'Satyam',
  roleInTeam: 'Manager',
  email: 'satyam@example.com',
  phone: '+919876543210',
  message: 'Please review our club.',
  logo: { imageUrl: 'https://res.cloudinary.com/demo/logo.jpg', publicId: 'logo-secret' },
  cover: { imageUrl: 'https://res.cloudinary.com/demo/cover.jpg', publicId: 'cover-secret' },
  submittedAt: new Date('2030-01-01T10:00:00Z'),
  reviewedAt: null,
  rejectionReason: '',
  save: async function save() { return this; },
  toObject: function toObject() { return { ...this }; },
  ...overrides,
});
const requestModel = ({
  exists = null,
  found = requestDocument(),
  created = requestDocument(),
  createError = null,
  requests = null,
} = {}) => ({
  exists: async () => exists,
  create: async (data) => {
    if (createError) throw createError;
    return { ...created, ...data, _id: requestId, submittedAt: new Date('2030-01-01T10:00:00Z') };
  },
  findOne: () => ({ lean: async () => found }),
  findById: async () => found,
  find: () => ({
    sort: () => ({
      skip: () => ({
        limit: () => ({ lean: async () => requests || [found] }),
      }),
    }),
  }),
  countDocuments: async () => (requests || [found]).length,
});

const validateMedia = async (files) =>
  new Promise((resolve) => validateTeamRegistrationMediaSignatures({ files }, {}, (error) => resolve(error || null)));

const runValidators = async (validators, body) => {
  const req = { body, params: { requestId }, query: {} };
  await Promise.all(validators.map((validator) => validator.run(req)));
  return validationResult(req).array();
};

test('team registration media validation accepts JPEG PNG WebP and rejects invalid signatures and oversized logo', async () => {
  assert.equal(await validateMedia({ logo: [file({ buffer: jpeg, mimetype: 'image/jpeg' })] }), null);
  assert.equal(await validateMedia({ logo: [file({ buffer: png, mimetype: 'image/png' })] }), null);
  assert.equal(await validateMedia({ cover: [file({ buffer: webp, mimetype: 'image/webp' })] }), null);
  assert.equal((await validateMedia({ logo: [file({ buffer: Buffer.from('nope') })] })).code, 'INVALID_TEAM_REGISTRATION_IMAGE_CONTENT');
  assert.equal((await validateMedia({ logo: [file({ size: 2 * 1024 * 1024 + 1 })] })).code, 'TEAM_REGISTRATION_LOGO_TOO_LARGE');
});

test('public validator rejects protected fields and invalid URLs', async () => {
  const errors = await runValidators(submitTeamRegistrationValidator, { ...input, status: 'approved', createdAdmin: 'secret', instagramUrl: 'javascript:alert(1)' });
  assert.ok(errors.some((error) => error.msg.includes('Protected team registration fields')));
  assert.ok(errors.some((error) => error.path === 'instagramUrl'));
});

test('valid public submission returns safe request code, uploads optional images, and notifies super admins safely', async () => {
  const calls = [];
  const notifications = [];
  const data = await submitTeamRegistrationRequest({
    requestModel: requestModel(),
    teamModel: teamModel(),
    storage: storage(calls),
    input,
    files: { logo: [file()], cover: [file({ buffer: png, mimetype: 'image/png' })] },
    notifySuperAdmins: async (payload) => notifications.push(payload),
  });
  assert.equal(data.request.status, 'pending');
  assert.match(data.request.requestCode, /^FSTR-/);
  assert.equal(data.request.email, undefined);
  assert.equal(data.request.phone, undefined);
  assert.equal(data.request.logo?.publicId, undefined);
  assert.equal(calls.filter(([type]) => type === 'upload').length, 2);
  assert.equal(notifications[0].type, 'team_registration_received');
  assert.equal(notifications[0].entityType, 'teamRegistrationRequest');
  assert.equal(notifications[0].message.includes('satyam@example.com'), false);
});

test('duplicate pending email phone or team name and existing approved teams are rejected', async () => {
  await assert.rejects(submitTeamRegistrationRequest({
    requestModel: requestModel({ exists: { _id: 'duplicate' } }),
    teamModel: teamModel(),
    storage: storage(),
    input,
  }), (error) => error.code === 'TEAM_REGISTRATION_DUPLICATE');
  await assert.rejects(submitTeamRegistrationRequest({
    requestModel: requestModel(),
    teamModel: teamModel({ exists: { _id: 'team1' } }),
    storage: storage(),
    input,
  }), (error) => error.code === 'TEAM_ALREADY_EXISTS');
});

test('rejected old request does not block a new submission when no pending duplicate exists', async () => {
  const data = await submitTeamRegistrationRequest({
    requestModel: requestModel({ exists: null, found: requestDocument({ status: 'rejected' }) }),
    teamModel: teamModel(),
    storage: storage(),
    input,
  });
  assert.equal(data.request.status, 'pending');
});

test('database failure after registration media upload cleans uploaded assets', async () => {
  const calls = [];
  await assert.rejects(submitTeamRegistrationRequest({
    requestModel: requestModel({ createError: new Error('db failed') }),
    teamModel: teamModel(),
    storage: storage(calls),
    input,
    files: { logo: [file()] },
  }));
  assert.deepEqual(calls.map(([type]) => type), ['upload', 'destroy']);
});

test('public status lookup hides private representative and review fields', async () => {
  const data = await getPublicTeamRegistrationStatus({
    requestModel: requestModel({ found: requestDocument({ status: 'rejected', rejectionReason: 'Roster already full' }) }),
    requestCode: 'FSTR-ABC123',
  });
  assert.equal(data.email, undefined);
  assert.equal(data.phone, undefined);
  assert.equal(data.reviewedBy, undefined);
  assert.equal(data.createdAdmin, undefined);
  assert.equal(data.rejectionReason, 'Roster already full');
  assert.equal(data.logoUrl, 'https://res.cloudinary.com/demo/logo.jpg');
});

test('approval validator requires account finalization fields', async () => {
  const errors = await runValidators(approveTeamRegistrationValidator, { teamName: 'FC KIET', slug: 'fc-kiet', adminName: 'Satyam', adminEmail: 'bad', temporaryPassword: 'short' });
  assert.ok(errors.some((error) => error.path === 'adminEmail'));
  assert.ok(errors.some((error) => error.path === 'temporaryPassword'));
});

test('approval creates exactly one team and one team admin and blocks double approval', async () => {
  const request = requestDocument();
  const data = await approveTeamRegistrationRequest({
    requestModel: requestModel({ found: request }),
    teamModel: teamModel(),
    userModel: userModel(),
    requestId,
    reviewerId,
    input: { teamName: 'FC KIET', slug: 'fc-kiet', adminName: 'Satyam', adminEmail: 'admin@example.com', temporaryPassword: 'StrongPass123' },
  });
  assert.equal(data.team.name, 'FC KIET');
  assert.equal(data.admin.email, 'admin@example.com');
  assert.equal(data.admin.password, undefined);
  assert.equal(request.status, 'approved');
  assert.equal(String(request.createdTeam), 'team1');
  await assert.rejects(approveTeamRegistrationRequest({
    requestModel: requestModel({ found: requestDocument({ status: 'approved' }) }),
    teamModel: teamModel(),
    userModel: userModel(),
    requestId,
    reviewerId,
    input: { teamName: 'FC KIET', slug: 'fc-kiet-2', adminName: 'Satyam', adminEmail: 'admin2@example.com', temporaryPassword: 'StrongPass123' },
  }), (error) => error.code === 'TEAM_REGISTRATION_NOT_PENDING');
});

test('approval creation failure leaves request pending and rolls back created team', async () => {
  const request = requestDocument();
  await assert.rejects(approveTeamRegistrationRequest({
    requestModel: requestModel({ found: request }),
    teamModel: teamModel(),
    userModel: userModel({ failCreate: true }),
    requestId,
    reviewerId,
    input: { teamName: 'FC KIET', slug: 'fc-kiet', adminName: 'Satyam', adminEmail: 'admin@example.com', temporaryPassword: 'StrongPass123' },
  }));
  assert.equal(request.status, 'pending');
  assert.equal(request.createdTeam, undefined);
});

test('rejection requires safe reason and marks only pending requests', async () => {
  const validationErrors = await runValidators(rejectTeamRegistrationValidator, { rejectionReason: 'no' });
  assert.ok(validationErrors.some((error) => error.path === 'rejectionReason'));
  const request = requestDocument();
  const data = await rejectTeamRegistrationRequest({
    requestModel: requestModel({ found: request }),
    requestId,
    reviewerId,
    rejectionReason: 'We cannot verify this team yet.',
  });
  assert.equal(data.status, 'rejected');
  assert.equal(data.rejectionReason, 'We cannot verify this team yet.');
  await assert.rejects(rejectTeamRegistrationRequest({
    requestModel: requestModel({ found: requestDocument({ status: 'approved' }) }),
    requestId,
    reviewerId,
    rejectionReason: 'Already reviewed.',
  }), (error) => error.code === 'TEAM_REGISTRATION_NOT_PENDING');
});

test('request changes marks pending registration without creating team records', async () => {
  const validationErrors = await runValidators(requestChangesTeamRegistrationValidator, { message: 'no' });
  assert.ok(validationErrors.some((error) => error.path === 'message'));
  const request = requestDocument();
  const data = await requestTeamRegistrationChanges({
    requestModel: requestModel({ found: request }),
    requestId,
    reviewerId,
    message: 'Please upload a clearer team logo.',
  });
  assert.equal(data.status, 'changesRequested');
  assert.equal(data.changeRequestMessage, 'Please upload a clearer team logo.');
  assert.equal(request.createdTeam, undefined);
  await assert.rejects(requestTeamRegistrationChanges({
    requestModel: requestModel({ found: requestDocument({ status: 'approved' }) }),
    requestId,
    reviewerId,
    message: 'Already reviewed.',
  }), (error) => error.code === 'TEAM_REGISTRATION_NOT_PENDING');
});
