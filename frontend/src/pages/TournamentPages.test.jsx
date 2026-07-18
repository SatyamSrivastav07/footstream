/* @vitest-environment jsdom */
import assert from 'node:assert/strict';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, test, vi } from 'vitest';
import DashboardLayout from '../layouts/DashboardLayout.jsx';
import TeamTournamentsPage from './TeamTournamentsPage.jsx';
import TournamentEditorPage from './TournamentEditorPage.jsx';
import TeamTournamentDetailsPage from './TeamTournamentDetailsPage.jsx';
import TournamentHistoryPage from './TournamentHistoryPage.jsx';
import AdminTournamentsPage from './AdminTournamentsPage.jsx';
import PublicTournamentsPage from './PublicTournamentsPage.jsx';
import PublicTournamentDetailPage from './PublicTournamentDetailPage.jsx';
import PublicTournamentSquadPage from './PublicTournamentSquadPage.jsx';
import TeamTournamentSquadPage from './TeamTournamentSquadPage.jsx';
import TeamTournamentLineupsPage from './TeamTournamentLineupsPage.jsx';
import TeamTournamentLineupEditorPage from './TeamTournamentLineupEditorPage.jsx';
import AdminTournamentLineupPage from './AdminTournamentLineupPage.jsx';
import { TournamentCard, ReviewTimeline } from '../features/tournaments/TournamentUi.jsx';

const tournament = {
  id: 't1',
  name: 'RANN Football',
  shortName: 'RANN',
  slug: 'rann-football',
  seasonLabel: '2027',
  scope: 'inter_college',
  competitionFormat: 'league',
  matchFormat: '11v11',
  approvalStatus: 'draft',
  lifecycleStatus: 'draft',
  visibility: 'public',
  isPublished: false,
  city: 'Ghaziabad',
  country: 'India',
  primaryVenue: 'Main Ground',
  startDate: '2027-01-10T00:00:00Z',
  endDate: '2027-01-20T00:00:00Z',
  playersOnField: 11,
  minimumSquad: 11,
  maximumSquad: 25,
  winPoints: 3,
  drawPoints: 1,
  lossPoints: 0,
};

const apiMocks = vi.hoisted(() => ({
  listHosted: vi.fn(),
  createHosted: vi.fn(),
  getHosted: vi.fn(),
  updateHosted: vi.fn(),
  deleteHosted: vi.fn(),
  submit: vi.fn(),
  resubmit: vi.fn(),
  history: vi.fn(),
  squads: vi.fn(),
  createSquad: vi.fn(),
  squadHistory: vi.fn(),
  eligiblePlayers: vi.fn(),
  participants: vi.fn(),
  availableTeams: vi.fn(),
  listAdmin: vi.fn(),
  getAdmin: vi.fn(),
  adminHistory: vi.fn(),
  listPublic: vi.fn(),
  getPublic: vi.fn(),
  getPublicSquad: vi.fn(),
  lineups: vi.fn(),
  createLineup: vi.fn(),
  getLineup: vi.fn(),
  updateLineupSide: vi.fn(),
  submitLineup: vi.fn(),
  lockLineup: vi.fn(),
  unlockLineup: vi.fn(),
  lineupHistory: vi.fn(),
  lineupEligiblePlayers: vi.fn(),
  adminLineups: vi.fn(),
  adminLineup: vi.fn(),
  adminLineupHistory: vi.fn(),
}));
const apiClientMocks = vi.hoisted(() => ({
  get: vi.fn(),
  put: vi.fn(),
  delete: vi.fn(),
}));
const authMock = vi.hoisted(() => ({
  value: {
    user: { name: 'Super Admin', email: 'admin@footstream.test', role: 'superAdmin' },
    logout: vi.fn(),
  },
}));

vi.mock('../features/tournaments/api.js', () => ({
  tournamentApi: apiMocks,
  unwrapData: (response) => response.data.data,
}));
vi.mock('../api/client.js', () => ({ default: apiClientMocks }));
vi.mock('../context/AuthContext.jsx', () => ({ useAuth: () => authMock.value }));
vi.mock('../config/features.js', () => ({
  TOURNAMENTS_ENABLED: true,
  WHATSAPP_COMMUNITY_URL: '',
}));

afterEach(() => {
  cleanup();
  Object.values(apiMocks).forEach((mock) => mock.mockReset());
  Object.values(apiClientMocks).forEach((mock) => mock.mockReset());
  authMock.value = {
    user: { name: 'Super Admin', email: 'admin@footstream.test', role: 'superAdmin' },
    logout: vi.fn(),
  };
});

const response = (data) => Promise.resolve({ data: { data } });
const renderRoute = (path, element, initialPath = path) => render(<MemoryRouter initialEntries={[initialPath]}><Routes><Route path={path} element={element} /></Routes></MemoryRouter>);

test('Tournament dashboard renders cards and empty/loading states', async () => {
  apiMocks.listHosted.mockReturnValue(response({ tournaments: [tournament] }));
  renderRoute('/team/tournaments', <TeamTournamentsPage />);
  assert.ok(screen.getByRole('heading', { name: 'Tournament' }));
  await waitFor(() => assert.ok(screen.getByText('RANN Football')));
  assert.ok(screen.getAllByText('Draft').length >= 1);
});

test('Create wizard exposes required tournament steps and fields', () => {
  renderRoute('/team/tournaments/new', <TournamentEditorPage />);
  assert.ok(screen.getByText('Create Tournament'));
  assert.ok(screen.getByText('Basic Information'));
  assert.ok(screen.getByLabelText(/Tournament Name/i));
});

test('Tournament editor derives preset player counts and only custom shows total-player input', () => {
  renderRoute('/team/tournaments/new', <TournamentEditorPage />);
  fireEvent.click(screen.getByRole('button', { name: /Competition/i }));
  assert.equal(screen.queryByLabelText(/Players on field/i), null);
  assert.ok(screen.getByText(/11 total starters/i));
  fireEvent.change(screen.getByLabelText(/Match Format/i), { target: { value: '6v6' } });
  assert.ok(screen.getByText(/6 total starters/i));
  assert.ok(screen.getByText(/1 goalkeeper \+ 5 outfield players/i));
  fireEvent.change(screen.getByLabelText(/Match Format/i), { target: { value: 'custom' } });
  assert.ok(screen.getByLabelText(/Total players per team including goalkeeper/i));
});

test('Edit wizard exposes tournament logo and cover upload controls', async () => {
  apiMocks.getHosted.mockReturnValue(response({ tournament: { ...tournament, logo: { imageUrl: 'https://cdn.test/logo.png' }, coverImage: { imageUrl: 'https://cdn.test/cover.png' } } }));
  apiMocks.participants.mockReturnValue(response({ participants: [] }));
  renderRoute('/team/tournaments/:tournamentId/edit', <TournamentEditorPage />, '/team/tournaments/t1/edit');
  await waitFor(() => assert.ok(screen.getByText('Edit Tournament')));
  assert.ok(screen.getByLabelText('Tournament branding uploads'));
  assert.ok(screen.getByAltText('Logo preview'));
  assert.ok(screen.getByAltText('Cover preview'));
});

test('Edit wizard submits only editable tournament fields', async () => {
  apiMocks.getHosted.mockReturnValue(response({
    tournament: {
      ...tournament,
      lifecycleStatus: 'draft',
      approvalStatus: 'draft',
      isPublished: false,
      publishedAt: null,
      isArchived: false,
      archivedAt: null,
      createdBy: 'private-user',
    },
  }));
  apiMocks.participants.mockReturnValue(response({ participants: [] }));
  apiMocks.updateHosted.mockReturnValue(response({ tournament }));
  renderRoute('/team/tournaments/:tournamentId/edit', <TournamentEditorPage />, '/team/tournaments/t1/edit');
  await waitFor(() => assert.ok(screen.getByText('Edit Tournament')));
  fireEvent.click(screen.getByRole('button', { name: /Next/i }));
  fireEvent.click(screen.getByRole('button', { name: /Next/i }));
  fireEvent.click(screen.getByRole('button', { name: /Next/i }));
  fireEvent.click(screen.getByRole('button', { name: /Next/i }));
  fireEvent.click(screen.getByRole('button', { name: /Save Draft/i }));
  await waitFor(() => assert.equal(apiMocks.updateHosted.mock.calls.length, 1));
  const payload = apiMocks.updateHosted.mock.calls[0][1];
  ['lifecycleStatus', 'approvalStatus', 'isPublished', 'publishedAt', 'isArchived', 'archivedAt', 'createdBy'].forEach((field) => {
    assert.equal(Object.hasOwn(payload, field), false);
  });
  assert.equal(payload.name, 'RANN Football');
});

test('Edit wizard shows draft delete and submits inter-college without teams', async () => {
  const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(true);
  apiMocks.getHosted.mockReturnValue(response({ tournament }));
  apiMocks.participants.mockReturnValue(response({ participants: [] }));
  apiMocks.submit.mockReturnValue(response({ tournament: { ...tournament, approvalStatus: 'approval_pending' } }));
  apiMocks.deleteHosted.mockReturnValue(response({ deleted: true }));
  renderRoute('/team/tournaments/:tournamentId/edit', <TournamentEditorPage />, '/team/tournaments/t1/edit');
  await waitFor(() => assert.ok(screen.getByText('Edit Tournament')));
  assert.ok(screen.getByText('Teams can be added after Super Admin approval.'));
  fireEvent.click(screen.getByRole('button', { name: /Submit for Approval/i }));
  await waitFor(() => assert.equal(apiMocks.submit.mock.calls.length, 1));
  fireEvent.click(screen.getByRole('button', { name: /Delete Draft/i }));
  await waitFor(() => assert.equal(apiMocks.deleteHosted.mock.calls.length, 1));
  assert.equal(confirmSpy.mock.calls[0][0], 'Delete this tournament draft permanently? This cannot be undone.');
  confirmSpy.mockRestore();
});

test('Intra-college editor blocks submission until minimum teams are added', async () => {
  apiMocks.getHosted.mockReturnValue(response({ tournament: { ...tournament, scope: 'intra_college', minimumTeams: 2 } }));
  apiMocks.participants.mockReturnValue(response({ participants: [{ id: 'p1', participantType: 'intra_team', displayName: 'CSE' }] }));
  renderRoute('/team/tournaments/:tournamentId/edit', <TournamentEditorPage />, '/team/tournaments/t1/edit');
  await waitFor(() => assert.ok(screen.getByText('Edit Tournament')));
  assert.ok(screen.getByText(/Add at least 2 intra-college teams/));
  assert.equal(screen.getByRole('button', { name: /Submit for Approval/i }).disabled, true);
});

test('Participant UI renders registered search, participants, and review timeline', async () => {
  apiMocks.getHosted.mockReturnValue(response({ tournament }));
  apiMocks.participants.mockReturnValue(response({ participants: [{ id: 'p1', displayName: 'IMS FC', participantType: 'registered_team', status: 'pending', logo: { imageUrl: 'https://cdn.test/ims.png' } }] }));
  apiMocks.squads.mockReturnValue(response({ squads: [{ participant: { id: 'p1', displayName: 'IMS FC' }, squad: { id: 's1', status: 'draft', playerCount: 3 } }] }));
  apiMocks.history.mockReturnValue(response({ history: [{ action: 'created', actorRole: 'teamAdmin', safeMessage: 'Created', createdAt: '2027-01-01T00:00:00Z' }] }));
  renderRoute('/team/tournaments/:tournamentId', <TeamTournamentDetailsPage />, '/team/tournaments/t1');
  await waitFor(() => assert.ok(screen.getByText('Participants')));
  assert.ok(screen.getByText('IMS FC'));
  assert.ok(screen.getByPlaceholderText(/Search public registered teams/i));
  assert.ok(screen.getByAltText('Logo preview'));
  assert.ok(screen.getByText('Manage Squad'));
  assert.ok(screen.getByText('Matchday Lineups'));
  assert.ok(screen.getAllByText('Created').length >= 1);
});

test('Participant UI is scope-aware for intra-college tournaments', async () => {
  apiMocks.getHosted.mockReturnValue(response({ tournament: { ...tournament, scope: 'intra_college' } }));
  apiMocks.participants.mockReturnValue(response({ participants: [] }));
  apiMocks.squads.mockReturnValue(response({ squads: [] }));
  apiMocks.history.mockReturnValue(response({ history: [] }));
  renderRoute('/team/tournaments/:tournamentId', <TeamTournamentDetailsPage />, '/team/tournaments/t1');
  await waitFor(() => assert.ok(screen.getByText('Participants')));
  assert.ok(screen.getByText('Intra-college tournaments accept only intra-college teams.'));
  assert.ok(screen.getByPlaceholderText(/Department, house, or class team name/i));
  assert.equal(screen.queryByPlaceholderText(/Search public registered teams/i), null);
});

test('Team squad page renders registered selector and squad workflow actions', async () => {
  apiMocks.getHosted.mockReturnValue(response({ tournament }));
  apiMocks.createSquad.mockReturnValue(response({ squad: { id: 's1', status: 'draft', playerCount: 1, participant: { id: 'p1', displayName: 'IMS FC', participantType: 'registered_team' }, players: [{ id: 'sp1', name: 'Aman', position: 'GK', jersey: 1, goalkeeper: true, sourceType: 'registered_player' }] } }));
  apiMocks.squadHistory.mockReturnValue(response({ history: [{ id: 'h1', action: 'squad_created', safeMessage: 'Created' }] }));
  apiMocks.eligiblePlayers.mockReturnValue(response({ players: [{ id: 'pl1', name: 'Ravi', position: 'CM', jerseyNumber: 8 }] }));
  renderRoute('/team/tournaments/:tournamentId/participants/:participantId/squad', <TeamTournamentSquadPage />, '/team/tournaments/t1/participants/p1/squad');
  await waitFor(() => assert.ok(screen.getByText('IMS FC')));
  assert.ok(screen.getByText('Eligible registered players'));
  assert.ok(screen.getByText('Submit'));
  assert.ok(screen.getByText('Aman'));
});

test('Review timeline page renders audit events safely', async () => {
  apiMocks.history.mockReturnValue(response({ history: [{ action: 'approved', actorRole: 'superAdmin', safeMessage: 'Approved', createdAt: '2027-01-02T00:00:00Z' }] }));
  renderRoute('/team/tournaments/:tournamentId/history', <TournamentHistoryPage />, '/team/tournaments/t1/history');
  await waitFor(() => assert.ok(screen.getAllByText('Approved').length >= 1));
});

test('Super admin tournament review queue renders review cards', async () => {
  apiMocks.listAdmin.mockReturnValue(response({ tournaments: [{ ...tournament, approvalStatus: 'approval_pending', submittedAt: '2027-01-01T00:00:00Z' }] }));
  renderRoute('/admin/tournaments', <AdminTournamentsPage />);
  await waitFor(() => assert.ok(screen.getByText('RANN Football')));
  assert.ok(screen.getByText('Review'));
});

const lineup = {
  id: 'l1',
  provisionalFixtureKey: 'RANN-M1',
  status: 'draft',
  homeParticipant: { id: 'p1', displayName: 'IMS FC' },
  awayParticipant: { id: 'p2', displayName: 'KIET FC' },
  home: { formation: '4-3-3', startingPlayers: [{ id: 'sp1', name: 'Aman', position: 'GK', jersey: 1, slotId: 'GK' }], substitutes: [], captain: { id: 'sp1', name: 'Aman' }, goalkeeper: { id: 'sp1', name: 'Aman' } },
  away: { formation: '', startingPlayers: [], substitutes: [], captain: null, goalkeeper: null },
};

test('Team matchday lineup list creates matchup references without start match controls', async () => {
  apiMocks.getHosted.mockReturnValue(response({ tournament }));
  apiMocks.participants.mockReturnValue(response({ participants: [{ id: 'p1', displayName: 'IMS FC' }, { id: 'p2', displayName: 'KIET FC' }] }));
  apiMocks.lineups.mockReturnValue(response({ lineups: [lineup] }));
  renderRoute('/team/tournaments/:tournamentId/lineups', <TeamTournamentLineupsPage />, '/team/tournaments/t1/lineups');
  await waitFor(() => assert.ok(screen.getByText('RANN-M1')));
  assert.ok(screen.getByText('Create matchup reference'));
  assert.equal(screen.queryByRole('button', { name: /Start Match/i }), null);
});

test('Lineup pitch renders 6v6 slots and assigns starter by click', async () => {
  const sixLineup = {
    ...lineup,
    home: {
      formation: '2-2-1',
      startingPlayers: [
        { id: 'sp1', name: 'Aman', position: 'GK', jersey: 1, slotId: 'GK' },
        { id: 'sp2', name: 'Ravi', position: 'CM', jersey: 8 },
      ],
      substitutes: [],
      captain: { id: 'sp2', name: 'Ravi' },
      goalkeeper: { id: 'sp1', name: 'Aman' },
    },
  };
  apiMocks.getHosted.mockReturnValue(response({ tournament: { ...tournament, matchFormat: '6v6', playersOnField: 6, maximumMatchdaySquad: 12 } }));
  apiMocks.getLineup.mockReturnValue(response({ lineup: sixLineup }));
  apiMocks.lineupHistory.mockReturnValue(response({ history: [] }));
  apiMocks.lineupEligiblePlayers
    .mockReturnValueOnce(response({ players: [{ id: 'sp1', name: 'Aman', position: 'GK', jersey: 1, selected: true }, { id: 'sp2', name: 'Ravi', position: 'CM', jersey: 8, selected: true }] }))
    .mockReturnValueOnce(response({ players: [] }));
  apiMocks.updateLineupSide.mockReturnValue(response({ lineup: { ...sixLineup, home: { ...sixLineup.home, startingPlayers: sixLineup.home.startingPlayers.map((player) => player.id === 'sp2' ? { ...player, slotId: 'L1-P1' } : player) } } }));
  renderRoute('/team/tournaments/:tournamentId/lineups/:lineupId', <TeamTournamentLineupEditorPage />, '/team/tournaments/t1/lineups/l1');
  await waitFor(() => assert.ok(screen.getByText('Unassigned starters: Ravi')));
  assert.ok(screen.getByRole('button', { name: /Empty Line 1 slot L1-P2/i }));
  fireEvent.click(screen.getAllByRole('button', { name: /Place on pitch/i })[1]);
  fireEvent.click(screen.getByRole('button', { name: /Empty Line 1 slot L1-P2/i }));
  await waitFor(() => assert.equal(apiMocks.updateLineupSide.mock.calls.at(-1)[3].action, 'assignSlot'));
  assert.equal(apiMocks.updateLineupSide.mock.calls.at(-1)[3].slotId, 'L1-P2');
});

test('Team lineup editor renders squad loading controls and locked-free workflow actions', async () => {
  apiMocks.getHosted.mockReturnValue(response({ tournament: { ...tournament, maximumMatchdaySquad: 18 } }));
  apiMocks.getLineup.mockReturnValue(response({ lineup }));
  apiMocks.lineupHistory.mockReturnValue(response({ history: [{ id: 'h1', action: 'lineup_created', safeMessage: 'Created' }] }));
  apiMocks.lineupEligiblePlayers
    .mockReturnValueOnce(response({ players: [{ id: 'sp1', name: 'Aman', position: 'GK', jersey: 1, selected: true }, { id: 'sp2', name: 'Ravi', position: 'CM', jersey: 8 }] }))
    .mockReturnValueOnce(response({ players: [{ id: 'sp3', name: 'Bilal', position: 'GK', jersey: 12 }] }));
  renderRoute('/team/tournaments/:tournamentId/lineups/:lineupId', <TeamTournamentLineupEditorPage />, '/team/tournaments/t1/lineups/l1');
  await waitFor(() => assert.ok(screen.getByText('Tournament matchday lineup')));
  assert.ok(screen.getByText('Ravi'));
  assert.equal(screen.getAllByText('Select exactly 11 starters · max 18 matchday players').length, 2);
  assert.equal(screen.queryByRole('button', { name: /Start Match/i }), null);
});

test('Super admin lineup page is read-only', async () => {
  apiMocks.adminLineup.mockReturnValue(response({ lineup: { ...lineup, status: 'locked' } }));
  apiMocks.adminLineupHistory.mockReturnValue(response({ history: [{ id: 'h1', action: 'lineup_locked', safeMessage: 'Locked' }] }));
  renderRoute('/admin/tournaments/:tournamentId/lineups/:lineupId', <AdminTournamentLineupPage />, '/admin/tournaments/t1/lineups/l1');
  await waitFor(() => assert.ok(screen.getByText('Super admin read-only')));
  assert.ok(screen.getByText('Locked'));
  assert.equal(screen.queryByText('Submit'), null);
});

test('Public directory and detail render only tournament overview and participants', async () => {
  apiMocks.listPublic.mockReturnValue(response({ tournaments: [tournament] }));
  renderRoute('/tournaments', <PublicTournamentsPage />);
  await waitFor(() => assert.ok(screen.getByText('RANN Football')));
  apiMocks.getPublic.mockReturnValue(response({ tournament: { ...tournament, participants: [{ id: 'p1', slug: 'ims-fc', displayName: 'IMS FC', participantType: 'registered_team' }] } }));
  renderRoute('/tournaments/:slug', <PublicTournamentDetailPage />, '/tournaments/rann-football');
  await waitFor(() => assert.ok(screen.getByText('IMS FC')));
  assert.ok(screen.getByText(/Groups, fixtures, standings/i));
  assert.ok(screen.getByText('View Squad'));
  apiMocks.getPublicSquad.mockReturnValue(response({ participant: { id: 'p1', displayName: 'IMS FC' }, squad: { id: 's1', playerCount: 1, captain: { name: 'Aman' }, players: [{ id: 'sp1', name: 'Aman', position: 'GK', jersey: 1, goalkeeper: true, captain: true }] } }));
  renderRoute('/tournaments/:slug/participants/:participantSlug/squad', <PublicTournamentSquadPage />, '/tournaments/rann-football/participants/ims-fc/squad');
  await waitFor(() => assert.ok(screen.getAllByText('Aman').length >= 1));
  assert.ok(screen.getByText('Goalkeeper'));
});

test('Tournament reusable card and timeline support action links and empty content', () => {
  render(<MemoryRouter><TournamentCard tournament={tournament} basePath="/team/tournaments" /><ReviewTimeline history={[]} /></MemoryRouter>);
  assert.ok(screen.getByText('View'));
  assert.ok(screen.getByText('No review history'));
});

test('Dashboard tournament red dot uses notification category counts', async () => {
  apiClientMocks.get.mockResolvedValue({ data: { data: { count: 3, categories: { tournamentReview: 1, teamRequests: 0, joinRequests: 0 } } } });
  render(<MemoryRouter initialEntries={['/admin/tournaments']}><Routes><Route element={<DashboardLayout />}><Route path="/admin/tournaments" element={<div>Queue</div>} /></Route></Routes></MemoryRouter>);
  await waitFor(() => assert.ok(screen.getByLabelText('1 unread notifications')));
  assert.ok(screen.getByText('Tournament Review'));
});
