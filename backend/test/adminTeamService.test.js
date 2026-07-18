import test from 'node:test';
import assert from 'node:assert/strict';
import { TEAM_STATUSES } from '../src/models/Team.js';
import { assignTeamAdmin, changeAdminTeamStatus, listPendingAdminTeams } from '../src/services/adminTeamService.js';
import { assertTeamOperational, assertTeamTransition, normalizeTeamStatus } from '../src/services/teamStatusTransitions.js';

const teamId = '650000000000000000000010';
const userId = '650000000000000000000011';
const adminId = '650000000000000000000012';

const teamDocument = (overrides = {}) => ({
  _id: teamId,
  name: 'FC KIET',
  slug: 'fc-kiet',
  status: TEAM_STATUSES.APPROVED,
  isArchived: false,
  isPublished: true,
  statusHistory: [],
  save: async function save() { return this; },
  toObject: function toObject() { return { ...this }; },
  ...overrides,
});

const teamModel = (team = teamDocument()) => ({
  findById: async () => team,
});

const userDocument = (overrides = {}) => ({
  _id: adminId,
  name: 'Team Admin',
  email: 'admin@example.com',
  role: 'teamAdmin',
  team: null,
  isActive: true,
  save: async function save() { return this; },
  toObject: function toObject() { return { ...this }; },
  ...overrides,
});

const userModel = (user = userDocument(), calls = []) => ({
  findOne: async () => user,
  updateMany: async (filter, update) => {
    calls.push({ filter, update });
    return { modifiedCount: 1 };
  },
});

const requestModel = (requests) => ({
  find: () => ({
    sort: () => ({
      skip: () => ({
        limit: () => ({ lean: async () => requests }),
      }),
    }),
  }),
  countDocuments: async () => requests.length,
});

test('team status normalization and transition rules are centralized', () => {
  assert.equal(normalizeTeamStatus({}), TEAM_STATUSES.APPROVED);
  assert.equal(normalizeTeamStatus({ isArchived: true, status: TEAM_STATUSES.APPROVED }), TEAM_STATUSES.ARCHIVED);
  assert.equal(assertTeamTransition({ status: TEAM_STATUSES.APPROVED }, TEAM_STATUSES.SUSPENDED), TEAM_STATUSES.APPROVED);
  assert.throws(() => assertTeamTransition({ status: TEAM_STATUSES.ARCHIVED, isArchived: true }, TEAM_STATUSES.APPROVED), /cannot move/);
  assert.doesNotThrow(() => assertTeamOperational({ status: TEAM_STATUSES.APPROVED }));
  assert.throws(() => assertTeamOperational({ status: TEAM_STATUSES.SUSPENDED }), /not approved/);
});

test('super admin can suspend reactivate and archive teams without deleting history', async () => {
  const team = teamDocument();
  const suspended = await changeAdminTeamStatus({ teamModel: teamModel(team), teamId, userId, nextStatus: TEAM_STATUSES.SUSPENDED, reason: 'Discipline review.' });
  assert.equal(suspended.status, TEAM_STATUSES.SUSPENDED);
  assert.equal(suspended.isPublished, false);
  assert.equal(team.statusHistory.length, 1);

  const reactivated = await changeAdminTeamStatus({ teamModel: teamModel(team), teamId, userId, nextStatus: TEAM_STATUSES.APPROVED, reason: 'Resolved.' });
  assert.equal(reactivated.status, TEAM_STATUSES.APPROVED);
  assert.equal(reactivated.isPublished, true);

  const archived = await changeAdminTeamStatus({ teamModel: teamModel(team), teamId, userId, nextStatus: TEAM_STATUSES.ARCHIVED, reason: 'No longer active.' });
  assert.equal(archived.status, TEAM_STATUSES.ARCHIVED);
  assert.equal(archived.isArchived, true);
});

test('team admin assignment disables previous admins and assigns selected active admin', async () => {
  const calls = [];
  const team = teamDocument();
  const user = userDocument();
  const data = await assignTeamAdmin({ teamModel: teamModel(team), userModel: userModel(user, calls), teamId, userId, adminUserId: adminId });
  assert.equal(String(user.team), teamId);
  assert.equal(data.user.email, 'admin@example.com');
  assert.equal(calls.length, 1);
  assert.equal(calls[0].update.$set.isActive, false);
});

test('pending team queue returns pending and changes-requested registrations safely', async () => {
  const requests = [{
    _id: '650000000000000000000020',
    requestCode: 'FSTR-ABC',
    status: 'changesRequested',
    teamName: 'IMS FC',
    city: 'Ghaziabad',
    country: 'India',
    representativeName: 'Aman',
    roleInTeam: 'Manager',
    email: 'aman@example.com',
    phone: '+919999999999',
    message: 'Please add us.',
    changeRequestMessage: 'Need clearer logo.',
    submittedAt: new Date('2030-01-01T00:00:00Z'),
  }];
  const data = await listPendingAdminTeams({ requestModel: requestModel(requests), query: {} });
  assert.equal(data.requests[0].status, 'changesRequested');
  assert.equal(data.requests[0].changeRequestMessage, 'Need clearer logo.');
  assert.equal(data.requests[0].publicId, undefined);
});
