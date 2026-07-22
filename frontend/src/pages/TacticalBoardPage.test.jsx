/* @vitest-environment jsdom */
import assert from 'node:assert/strict';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, test, vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import api from '../api/client.js';
import TacticalBoardPage from './TacticalBoardPage.jsx';

const players = [
  { _id: 'p1', name: 'Aman Keeper', position: 'GK', jerseyNumber: 1, availabilityStatus: 'available', isActive: true },
  { _id: 'p2', name: 'Dev Defender', position: 'CB', jerseyNumber: 4, availabilityStatus: 'available', isActive: true },
  { _id: 'p3', name: 'Mihir Mid', position: 'CM', jerseyNumber: 8, availabilityStatus: 'injured', isActive: true },
  { _id: 'p4', name: 'Rohit Nine', position: 'ST', jerseyNumber: 9, availabilityStatus: 'available', isActive: true },
  { _id: 'p5', name: 'Kabir Wing', position: 'LW', jerseyNumber: 11, availabilityStatus: 'available', isActive: true },
];

vi.mock('../api/client.js', () => ({
  default: { get: vi.fn() },
}));

vi.mock('../context/AuthContext.jsx', () => ({
  useAuth: () => ({
    user: {
      role: 'teamAdmin',
      name: 'Satyam',
      team: { _id: 'team-tactical', name: 'FC KIET' },
    },
  }),
}));

beforeEach(() => {
  window.confirm = vi.fn(() => true);
  window.localStorage.clear();
});

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

test('tactical board loads squad, auto-arranges, assigns roles, and saves locally', async () => {
  api.get.mockResolvedValueOnce({ data: { data: { players } } });

  render(<MemoryRouter><TacticalBoardPage /></MemoryRouter>);

  assert.ok(await screen.findByText('Tactical Board'));
  assert.ok(screen.getByText('Aman Keeper'));
  fireEvent.change(screen.getByLabelText('Formation'), { target: { value: '5-a-side' } });
  fireEvent.click(screen.getByRole('button', { name: /auto arrange/i }));

  await waitFor(() => assert.ok(screen.getByText(/5\/5 on pitch/i)));
  fireEvent.click(screen.getByRole('button', { name: /select aman keeper/i }));
  fireEvent.click(screen.getByRole('button', { name: /^Captain$/i }));
  fireEvent.click(screen.getByRole('button', { name: /^Goalkeeper$/i }));
  fireEvent.click(screen.getByRole('button', { name: /save tactical plan/i }));

  assert.ok(screen.getByText('Tactical plan saved on this browser.'));
  assert.match(window.localStorage.getItem('footstream:tactical-board:team-tactical'), /"formation":"5-a-side"/);
}, 15_000);

test('tactical board shows empty squad state', async () => {
  api.get.mockResolvedValueOnce({ data: { data: { players: [] } } });

  render(<MemoryRouter><TacticalBoardPage /></MemoryRouter>);

  assert.ok(await screen.findByText('No active squad players yet'));
});
