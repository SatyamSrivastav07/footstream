// @vitest-environment jsdom
import assert from 'node:assert/strict';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, test, vi } from 'vitest';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import api from '../api/client.js';
import PublicHomePage from './PublicHomePage.jsx';
import TeamDirectoryPage from './TeamDirectoryPage.jsx';
import PublicTeamRegistrationPage from './PublicTeamRegistrationPage.jsx';
import PublicTeamRegistrationStatusPage from './PublicTeamRegistrationStatusPage.jsx';
import AdminTeamRegistrationRequestsPage from './AdminTeamRegistrationRequestsPage.jsx';
import AdminTeamRegistrationRequestDetailsPage from './AdminTeamRegistrationRequestDetailsPage.jsx';

vi.mock('../api/client.js', () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
    patch: vi.fn(),
  },
}));

beforeEach(() => {
  vi.stubGlobal('URL', {
    ...URL,
    createObjectURL: vi.fn(() => 'blob:preview'),
  });
});

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
  vi.unstubAllGlobals();
});

test('public Register Your Team CTA is visible on home and teams directory', async () => {
  api.get.mockResolvedValue({ data: { data: { live: [], upcoming: [], latestResults: [] } } });
  render(<MemoryRouter><PublicHomePage /></MemoryRouter>);
  assert.ok(await screen.findByRole('link', { name: /register your team/i }));
  cleanup();

  api.get.mockResolvedValueOnce({ data: { data: { teams: [], pagination: { page: 1, pages: 1, total: 0 } } } });
  render(<MemoryRouter><TeamDirectoryPage /></MemoryRouter>);
  assert.ok(await screen.findByRole('link', { name: /register your team/i }));
});

test('public team registration form validates server errors and shows private request code after success', async () => {
  api.post.mockRejectedValueOnce({
    userMessage: 'Validation failed.',
    fieldErrors: [{ field: 'teamName', message: 'Team name is required.' }],
  });
  const { rerender } = render(<MemoryRouter><PublicTeamRegistrationPage /></MemoryRouter>);
  fireEvent.submit(screen.getByRole('button', { name: /submit team request/i }).closest('form'));
  assert.ok(await screen.findByText('Validation failed.'));
  assert.ok(screen.getByText('Team name is required.'));

  api.post.mockResolvedValueOnce({ data: { data: { request: { requestCode: 'FSTR-ABC123', status: 'pending' } } } });
  rerender(<MemoryRouter><PublicTeamRegistrationPage /></MemoryRouter>);
  fireEvent.change(screen.getByLabelText(/team name/i), { target: { value: 'FC KIET' } });
  fireEvent.change(screen.getByLabelText(/^city$/i), { target: { value: 'Ghaziabad' } });
  fireEvent.change(screen.getByLabelText(/^country$/i), { target: { value: 'India' } });
  fireEvent.change(screen.getByLabelText(/representative name/i), { target: { value: 'Satyam' } });
  fireEvent.change(screen.getByLabelText(/role in team/i), { target: { value: 'Manager' } });
  fireEvent.change(screen.getByLabelText(/^email$/i), { target: { value: 'satyam@example.com' } });
  fireEvent.change(screen.getByLabelText(/^phone$/i), { target: { value: '+919876543210' } });
  fireEvent.change(screen.getByLabelText(/logo/i), { target: { files: [new File(['x'], 'logo.png', { type: 'image/png' })] } });
  fireEvent.submit(screen.getByRole('button', { name: /submit team request/i }).closest('form'));
  await screen.findByText('FSTR-ABC123');
  assert.equal(api.post.mock.calls[0][0], '/public/team-registration-requests');
  assert.equal(api.post.mock.calls[0][1] instanceof FormData, true);
});

test('team registration status page loads safe status and never renders contact fields', async () => {
  api.get.mockResolvedValueOnce({
    data: {
      data: {
        request: {
          requestCode: 'FSTR-ABC123',
          teamName: 'FC KIET',
          city: 'Ghaziabad',
          country: 'India',
          status: 'pending',
          submittedAt: '2030-01-01T10:00:00Z',
        },
      },
    },
  });
  render(
    <MemoryRouter initialEntries={['/team-registration-status/FSTR-ABC123']}>
      <Routes><Route path="/team-registration-status/:requestCode" element={<PublicTeamRegistrationStatusPage />} /></Routes>
    </MemoryRouter>,
  );
  await screen.findByText('FC KIET');
  assert.equal(api.get.mock.calls[0][0], '/public/team-registration-requests/FSTR-ABC123/status');
  assert.equal(screen.queryByText(/satyam@example.com/i), null);
  assert.equal(screen.queryByText(/\+919876543210/), null);
});

test('super admin team request list renders loading empty and populated states', async () => {
  api.get.mockResolvedValueOnce({ data: { data: { requests: [], pagination: { page: 1, pages: 1, total: 0 } } } });
  render(<MemoryRouter><AdminTeamRegistrationRequestsPage /></MemoryRouter>);
  await screen.findByText('No team requests');
  cleanup();

  api.get.mockResolvedValueOnce({
    data: {
      data: {
        requests: [{
          _id: 'req1',
          teamName: 'FC KIET',
          city: 'Ghaziabad',
          country: 'India',
          representativeName: 'Satyam',
          status: 'pending',
          submittedAt: '2030-01-01T10:00:00Z',
        }],
        pagination: { page: 1, pages: 1, total: 1 },
      },
    },
  });
  render(<MemoryRouter><AdminTeamRegistrationRequestsPage /></MemoryRouter>);
  await screen.findByText('FC KIET');
  assert.ok(screen.getByRole('link', { name: /view fc kiet/i }));
});

test('super admin request detail supports approve and reject flows without exposing password after success', async () => {
  const pendingRequest = {
    _id: 'req1',
    requestCode: 'FSTR-ABC123',
    teamName: 'FC KIET',
    shortName: 'KIET',
    city: 'Ghaziabad',
    country: 'India',
    representativeName: 'Satyam',
    roleInTeam: 'Manager',
    email: 'satyam@example.com',
    phone: '+919876543210',
    status: 'pending',
    submittedAt: '2030-01-01T10:00:00Z',
  };
  const approvedRequest = { ...pendingRequest, status: 'approved', createdTeam: 'team1', createdAdmin: 'admin1' };
  api.get
    .mockResolvedValueOnce({ data: { data: { request: pendingRequest } } })
    .mockResolvedValueOnce({ data: { data: { request: approvedRequest } } })
    .mockResolvedValueOnce({ data: { data: { request: pendingRequest } } })
    .mockResolvedValueOnce({ data: { data: { request: { ...pendingRequest, status: 'rejected', rejectionReason: 'Could not verify ownership.' } } } });
  api.patch.mockResolvedValue({ data: { data: { request: approvedRequest } } });

  render(
    <MemoryRouter initialEntries={['/admin/team-requests/req1']}>
      <Routes><Route path="/admin/team-requests/:requestId" element={<AdminTeamRegistrationRequestDetailsPage />} /></Routes>
    </MemoryRouter>,
  );
  await screen.findByDisplayValue('satyam@example.com');
  fireEvent.change(screen.getByLabelText(/temporary password/i), { target: { value: 'StrongPass123' } });
  fireEvent.click(screen.getByRole('button', { name: /^approve/i }));
  await screen.findByText('Team and admin account created.');
  assert.equal(api.patch.mock.calls[0][0], '/admin/team-registration-requests/req1/approve');
  assert.equal(screen.queryByDisplayValue('StrongPass123'), null);
});
