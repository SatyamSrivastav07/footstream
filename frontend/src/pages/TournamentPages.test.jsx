/* @vitest-environment jsdom */
import assert from 'node:assert/strict';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, test, vi } from 'vitest';
import TeamTournamentsPage from './TeamTournamentsPage.jsx';
import TournamentEditorPage from './TournamentEditorPage.jsx';
import TeamTournamentDetailsPage from './TeamTournamentDetailsPage.jsx';
import TournamentHistoryPage from './TournamentHistoryPage.jsx';
import AdminTournamentsPage from './AdminTournamentsPage.jsx';
import PublicTournamentsPage from './PublicTournamentsPage.jsx';
import PublicTournamentDetailPage from './PublicTournamentDetailPage.jsx';
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
  history: vi.fn(),
  participants: vi.fn(),
  availableTeams: vi.fn(),
  listAdmin: vi.fn(),
  getAdmin: vi.fn(),
  adminHistory: vi.fn(),
  listPublic: vi.fn(),
  getPublic: vi.fn(),
}));

vi.mock('../features/tournaments/api.js', () => ({
  tournamentApi: apiMocks,
  unwrapData: (response) => response.data.data,
}));

afterEach(() => {
  cleanup();
  Object.values(apiMocks).forEach((mock) => mock.mockReset());
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

test('Participant UI renders registered search, participants, and review timeline', async () => {
  apiMocks.getHosted.mockReturnValue(response({ tournament }));
  apiMocks.participants.mockReturnValue(response({ participants: [{ id: 'p1', displayName: 'IMS FC', participantType: 'registered_team', status: 'pending' }] }));
  apiMocks.history.mockReturnValue(response({ history: [{ action: 'created', actorRole: 'teamAdmin', safeMessage: 'Created', createdAt: '2027-01-01T00:00:00Z' }] }));
  renderRoute('/team/tournaments/:tournamentId', <TeamTournamentDetailsPage />, '/team/tournaments/t1');
  await waitFor(() => assert.ok(screen.getByText('Participants')));
  assert.ok(screen.getByText('IMS FC'));
  assert.ok(screen.getByPlaceholderText(/Search public registered teams/i));
  assert.ok(screen.getAllByText('Created').length >= 1);
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

test('Public directory and detail render only tournament overview and participants', async () => {
  apiMocks.listPublic.mockReturnValue(response({ tournaments: [tournament] }));
  renderRoute('/tournaments', <PublicTournamentsPage />);
  await waitFor(() => assert.ok(screen.getByText('RANN Football')));
  apiMocks.getPublic.mockReturnValue(response({ tournament: { ...tournament, participants: [{ id: 'p1', displayName: 'IMS FC', participantType: 'registered_team' }] } }));
  renderRoute('/tournaments/:slug', <PublicTournamentDetailPage />, '/tournaments/rann-football');
  await waitFor(() => assert.ok(screen.getByText('IMS FC')));
  assert.ok(screen.getByText(/Groups, fixtures, standings/i));
});

test('Tournament reusable card and timeline support action links and empty content', () => {
  render(<MemoryRouter><TournamentCard tournament={tournament} basePath="/team/tournaments" /><ReviewTimeline history={[]} /></MemoryRouter>);
  assert.ok(screen.getByText('View'));
  assert.ok(screen.getByText('No review history'));
});
