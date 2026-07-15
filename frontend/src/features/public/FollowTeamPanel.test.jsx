// @vitest-environment jsdom
import assert from 'node:assert/strict';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, test, vi } from 'vitest';
import api from '../../api/client.js';
import FollowTeamPanel, { getOrCreateFollowerSessionId } from './FollowTeamPanel.jsx';

vi.mock('../../api/client.js', () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
    delete: vi.fn(),
    patch: vi.fn(),
  },
}));

const team = { name: 'FC KIET', slug: 'fc-kiet' };

beforeEach(() => {
  localStorage.clear();
  Object.defineProperty(globalThis, 'crypto', {
    configurable: true,
    value: { randomUUID: vi.fn(() => 'b0fd2df5-a5b0-4835-9d45-0922af722111') },
  });
});

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

test('getOrCreateFollowerSessionId reuses valid stored id', () => {
  localStorage.setItem('footstream_follower_session', '11111111-1111-4111-8111-111111111111');
  assert.equal(getOrCreateFollowerSessionId(), '11111111-1111-4111-8111-111111111111');
  assert.equal(crypto.randomUUID.mock.calls.length, 0);
});

test('getOrCreateFollowerSessionId replaces malformed stored id', () => {
  localStorage.setItem('footstream_follower_session', 'bad-old-value');
  assert.equal(getOrCreateFollowerSessionId(), 'b0fd2df5-a5b0-4835-9d45-0922af722111');
  assert.equal(localStorage.getItem('footstream_follower_session'), 'b0fd2df5-a5b0-4835-9d45-0922af722111');
});

test('refresh status uses the same localStorage follower session and renders following', async () => {
  localStorage.setItem('footstream_follower_session', '11111111-1111-4111-8111-111111111111');
  api.get.mockResolvedValueOnce({
    data: {
      data: {
        follow: {
          following: true,
          isFollowing: true,
          preferences: {},
          followerCount: 7,
          notificationsEnabled: false,
        },
      },
    },
  });

  render(<FollowTeamPanel team={team} />);

  await screen.findByText('Following');
  assert.equal(api.get.mock.calls[0][0], '/public/teams/fc-kiet/follow-status');
  assert.deepEqual(api.get.mock.calls[0][1].params, { followerSessionId: '11111111-1111-4111-8111-111111111111' });
  assert.equal(api.get.mock.calls[0][1].headers['X-Follower-Session-Id'], '11111111-1111-4111-8111-111111111111');
  assert.equal(screen.queryByRole('button', { name: /^follow fc kiet/i }), null);
});

test('status error does not falsely render Follow before a valid status is known', async () => {
  api.get.mockRejectedValueOnce({ userMessage: 'Something went wrong on the server.' });
  render(<FollowTeamPanel team={team} />);

  await screen.findByRole('button', { name: /retry status/i });
  assert.equal(screen.queryByRole('button', { name: /^follow fc kiet/i }), null);
});

test('follow then refresh/status returns following true', async () => {
  api.get
    .mockResolvedValueOnce({ data: { data: { follow: { following: false, isFollowing: false, preferences: {}, followerCount: 0 } } } })
    .mockResolvedValueOnce({ data: { data: { follow: { following: true, isFollowing: true, preferences: {}, followerCount: 1 } } } });
  api.post.mockResolvedValueOnce({ data: { data: { follow: { following: true, isFollowing: true, preferences: {}, followerCount: 1 } } } });

  render(<FollowTeamPanel team={team} />);

  const followButton = await screen.findByRole('button', { name: /^follow fc kiet/i });
  fireEvent.click(followButton);
  await screen.findByText('Following');

  cleanup();
  render(<FollowTeamPanel team={team} />);
  await screen.findByText('Following');
  assert.equal(api.post.mock.calls[0][1].followerSessionId, localStorage.getItem('footstream_follower_session'));
  assert.equal(api.get.mock.calls[1][1].params.followerSessionId, localStorage.getItem('footstream_follower_session'));
});
