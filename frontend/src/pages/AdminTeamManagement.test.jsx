/* @vitest-environment jsdom */
import assert from 'node:assert/strict';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, test, vi } from 'vitest';
import AdminPendingTeamsPage from './AdminPendingTeamsPage.jsx';
import AdminTeamDetailPage from './AdminTeamDetailPage.jsx';
import AdminTeamsPage from './AdminTeamsPage.jsx';

const api = vi.hoisted(() => ({
  get: vi.fn(),
  patch: vi.fn(),
  post: vi.fn(),
}));

vi.mock('../api/client.js', () => ({ default: api }));

afterEach(() => {
  cleanup();
  api.get.mockReset();
  api.patch.mockReset();
  api.post.mockReset();
});

const response = (data) => Promise.resolve({ data: { data } });
const renderRoute = (path, element, initialPath = path) => render(<MemoryRouter initialEntries={[initialPath]}><Routes><Route path={path} element={element} /></Routes></MemoryRouter>);

const team = {
  id: 'team1',
  _id: 'team1',
  name: 'FC KIET',
  slug: 'fc-kiet',
  status: 'approved',
  logoUrl: '',
  organization: 'KIET',
  teamType: 'College',
  city: 'Ghaziabad',
  location: 'Ghaziabad',
  isPublished: true,
  acceptingJoinRequests: true,
  playerCount: 12,
  activePlayerCount: 11,
  teamAdmin: { id: 'admin1', name: 'Satyam', email: 'satyam@example.com' },
  createdAt: '2030-01-01T00:00:00Z',
  updatedAt: '2030-01-02T00:00:00Z',
};

test('admin all teams page loads filters and team rows', async () => {
  api.get.mockResolvedValue(response({ teams: [team], pagination: { page: 1, pages: 1, total: 1 } }));
  renderRoute('/admin/teams', <AdminTeamsPage />);
  await waitFor(() => assert.ok(screen.getByText('FC KIET')));
  assert.ok(screen.getByText('All Teams'));
  assert.ok(screen.getByRole('link', { name: /View FC KIET/i }));
  fireEvent.change(screen.getByLabelText(/Filter by status/i), { target: { value: 'approved' } });
  await waitFor(() => assert.equal(api.get.mock.calls.at(-1)[1].params.status, 'approved'));
});

test('pending teams page renders review queue cards', async () => {
  api.get.mockResolvedValue(response({
    requests: [{
      id: 'req1',
      requestCode: 'FSTR-1',
      status: 'changesRequested',
      teamName: 'IMS FC',
      city: 'Ghaziabad',
      country: 'India',
      representativeName: 'Aman',
      email: 'aman@example.com',
      phone: '+91999',
      submittedAt: '2030-01-01T00:00:00Z',
      changeRequestMessage: 'Need clearer logo.',
    }],
    pagination: { page: 1, pages: 1, total: 1 },
  }));
  renderRoute('/admin/teams/pending', <AdminPendingTeamsPage />);
  await waitFor(() => assert.ok(screen.getByText('IMS FC')));
  assert.ok(screen.getByText('Need clearer logo.'));
  assert.ok(screen.getByRole('link', { name: /Review/i }).getAttribute('href').includes('/admin/team-requests/req1'));
});

test('admin team detail supports safe edit, status action, and team-admin assignment', async () => {
  api.get
    .mockResolvedValueOnce(response({
      team,
      squadSummary: { totalPlayers: 12, activePlayers: 11, pendingJoinRequests: 1, captain: { name: 'Aman' }, viceCaptain: null, goalkeepersCount: 2 },
      matchSummary: { totalMatches: 3, wins: 2, draws: 1, losses: 0, upcomingMatches: 1, liveMatches: 0 },
      recentActivity: [],
    }))
    .mockResolvedValueOnce(response({ users: [{ id: 'admin2', name: 'New Admin', email: 'new@example.com', isActive: true, teamName: '' }] }))
    .mockResolvedValue(response({
      team,
      squadSummary: { totalPlayers: 12, activePlayers: 11, pendingJoinRequests: 1, captain: { name: 'Aman' }, viceCaptain: null, goalkeepersCount: 2 },
      matchSummary: { totalMatches: 3, wins: 2, draws: 1, losses: 0, upcomingMatches: 1, liveMatches: 0 },
      recentActivity: [],
    }));
  api.patch.mockResolvedValue(response({ team }));
  api.post.mockResolvedValue(response({ team: { ...team, status: 'suspended' } }));
  renderRoute('/admin/teams/:teamId', <AdminTeamDetailPage />, '/admin/teams/team1');
  await waitFor(() => assert.ok(screen.getByText('Safe team information')));

  fireEvent.change(screen.getByLabelText(/Assign \/ replace team admin/i), { target: { value: 'admin2' } });
  fireEvent.click(screen.getByRole('button', { name: /Update admin/i }));
  await waitFor(() => assert.ok(api.patch.mock.calls.some(([url]) => url === '/admin/teams/team1/team-admin')));

  fireEvent.change(screen.getByLabelText(/City/i), { target: { value: 'Noida' } });
  fireEvent.click(screen.getByRole('button', { name: /Save information/i }));
  await waitFor(() => assert.ok(api.patch.mock.calls.some(([url, payload]) => url === '/admin/teams/team1' && payload.city === 'Noida')));

  fireEvent.click(screen.getByRole('button', { name: /Suspend/i }));
  fireEvent.change(screen.getByLabelText(/Reason \/ message/i), { target: { value: 'Policy review.' } });
  fireEvent.click(screen.getByRole('button', { name: /Confirm/i }));
  await waitFor(() => assert.equal(api.post.mock.calls[0][0], '/admin/teams/team1/suspend'));
});
