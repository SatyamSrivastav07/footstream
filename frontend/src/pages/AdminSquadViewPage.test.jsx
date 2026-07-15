// @vitest-environment jsdom
import assert from 'node:assert/strict';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, test, vi } from 'vitest';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import TeamIdentity, { teamLogoUrl } from '../components/TeamIdentity.jsx';
import api from '../api/client.js';
import AdminSquadViewPage from './AdminSquadViewPage.jsx';

vi.mock('../api/client.js', () => ({
  default: {
    get: vi.fn(),
  },
}));

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

beforeEach(() => {
  api.get.mockResolvedValue({
    data: {
      data: {
        team: { _id: 'team-1', name: 'FC KIET' },
        players: [],
      },
    },
  });
});

const renderSquadPage = () => render(
  <MemoryRouter initialEntries={['/admin/teams/team-1/squad']}>
    <Routes>
      <Route path="/admin/teams/:teamId/squad" element={<AdminSquadViewPage />} />
    </Routes>
  </MemoryRouter>,
);

test('teamLogoUrl is null-safe and supports missing logo', () => {
  assert.equal(teamLogoUrl(null), '');
  assert.equal(teamLogoUrl(undefined), '');
  assert.equal(teamLogoUrl({ name: 'No Logo FC' }), '');
});

test('teamLogoUrl supports string, object url, object imageUrl, and legacy logoUrl', () => {
  assert.equal(teamLogoUrl({ logo: 'https://cdn.example/logo.png' }), 'https://cdn.example/logo.png');
  assert.equal(teamLogoUrl({ logo: { url: 'https://cdn.example/url.png' } }), 'https://cdn.example/url.png');
  assert.equal(teamLogoUrl({ logo: { imageUrl: 'https://cdn.example/image-url.png' } }), 'https://cdn.example/image-url.png');
  assert.equal(teamLogoUrl({ logoUrl: 'https://cdn.example/legacy.png' }), 'https://cdn.example/legacy.png');
});

test('TeamIdentity renders text-only fallback for null team and missing logo', () => {
  const { rerender, container } = render(<TeamIdentity team={null} name="Team squad" />);
  assert.match(container.textContent, /Team squad/);
  assert.equal(container.querySelector('img'), null);

  rerender(<TeamIdentity team={{ name: 'No Logo FC' }} />);
  assert.match(container.textContent, /No Logo FC/);
  assert.equal(container.querySelector('img'), null);
});

test('TeamIdentity renders logo and hides it after image error', () => {
  const { container } = render(<TeamIdentity team={{ name: 'Logo FC', logo: 'https://cdn.example/logo.png' }} />);
  const image = container.querySelector('img');
  assert.ok(image);
  assert.equal(image.getAttribute('src'), 'https://cdn.example/logo.png');

  fireEvent.error(image);
  assert.equal(container.querySelector('img'), null);
  assert.match(container.textContent, /Logo FC/);
});

test('admin squad page shows loading then empty squad', async () => {
  renderSquadPage();
  assert.ok(screen.getByLabelText('Loading squad'));
  await screen.findByText('No players recorded');
  assert.match(screen.getByText('FC KIET').textContent, /FC KIET/);
});

test('admin squad page shows API error and retry state instead of blank page', async () => {
  api.get.mockRejectedValueOnce({ userMessage: 'Team not found.', response: { status: 404 } });
  renderSquadPage();

  await screen.findByRole('alert');
  assert.match(screen.getByRole('alert').textContent, /Team not found/);
  assert.ok(screen.getByRole('button', { name: /retry/i }));
  assert.ok(screen.getByText('This team may have been archived or removed.'));
});

test('admin squad page treats malformed players response as empty squad', async () => {
  api.get.mockResolvedValueOnce({
    data: {
      data: {
        team: { _id: 'team-1', name: 'FC KIET' },
        players: null,
      },
    },
  });
  renderSquadPage();
  await screen.findByText('No players recorded');
});

test('admin squad page renders a valid read-only squad', async () => {
  api.get.mockResolvedValueOnce({
    data: {
      data: {
        team: { _id: 'team-1', name: 'FC KIET', logo: { url: 'https://cdn.example/kiet.png' } },
        players: [
          {
            _id: 'player-1',
            name: 'Legacy Player',
            position: 'CM',
            jerseyNumber: 8,
            isActive: true,
          },
        ],
      },
    },
  });
  renderSquadPage();

  await waitFor(() => assert.equal(api.get.mock.calls[0][0], '/admin/teams/team-1/players'));
  await screen.findByText('Legacy Player');
  assert.ok(screen.getByText('Available'));
  assert.ok(screen.getByText('Career statistics'));
});
