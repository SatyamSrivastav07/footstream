/* @vitest-environment jsdom */
import assert from 'node:assert/strict';
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, test, vi } from 'vitest';
import TeamChatPage from './TeamChatPage.jsx';

const api = vi.hoisted(() => ({
  get: vi.fn(),
  post: vi.fn(),
}));

const socketState = vi.hoisted(() => ({
  handlers: {},
  ioHandlers: {},
  emit: vi.fn(),
  disconnect: vi.fn(),
}));

vi.mock('../api/client.js', () => ({ default: api, socketUrl: 'http://localhost:5000' }));
vi.mock('../context/AuthContext.jsx', () => ({
  useAuth: () => ({
    user: {
      _id: 'user-1',
      id: 'user-1',
      name: 'Satyam Admin',
      role: 'teamAdmin',
      team: { _id: 'team-1', name: 'FC KIET' },
    },
  }),
}));
vi.mock('socket.io-client', () => ({
  io: vi.fn(() => ({
    on: (event, handler) => { socketState.handlers[event] = handler; },
    emit: socketState.emit,
    disconnect: socketState.disconnect,
    io: { on: (event, handler) => { socketState.ioHandlers[event] = handler; } },
  })),
}));

afterEach(() => {
  cleanup();
  api.get.mockReset();
  api.post.mockReset();
  socketState.handlers = {};
  socketState.ioHandlers = {};
  socketState.emit.mockReset();
  socketState.disconnect.mockReset();
});

const communityResponse = (overrides = {}) => Promise.resolve({
  data: {
    data: {
      room: { id: 'community', name: 'Team Admin Community' },
      messages: [
        {
          id: 'msg-1',
          scope: 'community',
          sender: { id: 'user-2', name: 'Aman', role: 'teamAdmin' },
          senderName: 'Aman',
          senderTeamName: 'IMS FC',
          senderTeam: { id: 'team-2', name: 'IMS FC' },
          message: 'Anyone free for friendly?',
          createdAt: '2030-01-01T10:00:00Z',
        },
      ],
      pagination: { before: '2030-01-01T10:00:00Z', hasMore: false },
      ...overrides,
    },
  },
});

const conversationsResponse = (overrides = {}) => Promise.resolve({
  data: {
    data: {
      conversations: [
        {
          id: 'conv-1',
          opponent: { id: 'team-2', name: 'IMS FC', shortName: 'IMS' },
          participantTeams: [{ id: 'team-1', name: 'FC KIET' }, { id: 'team-2', name: 'IMS FC' }],
          lastMessageAt: '2030-01-01T09:00:00Z',
        },
      ],
      ...overrides,
    },
  },
});

const teamsResponse = (overrides = {}) => Promise.resolve({
  data: {
    data: {
      teams: [{ id: 'team-2', name: 'IMS FC', shortName: 'IMS' }],
      ...overrides,
    },
  },
});

const directResponse = (overrides = {}) => Promise.resolve({
  data: {
    data: {
      conversation: {
        id: 'conv-1',
        opponent: { id: 'team-2', name: 'IMS FC', shortName: 'IMS' },
        participantTeams: [{ id: 'team-1', name: 'FC KIET' }, { id: 'team-2', name: 'IMS FC' }],
      },
      messages: [],
      pagination: { before: null, hasMore: false },
      ...overrides,
    },
  },
});

const setupApi = () => {
  api.get.mockImplementation((url) => {
    if (url === '/team/admin-chat/community/messages') return communityResponse();
    if (url === '/team/admin-chat/conversations') return conversationsResponse();
    if (url === '/team/admin-chat/teams') return teamsResponse();
    if (url === '/team/admin-chat/conversations/conv-1/messages') return directResponse();
    return Promise.reject(new Error(`Unexpected GET ${url}`));
  });
  api.post.mockResolvedValue({ data: { data: { lastReadAt: '2030-01-01T12:00:00Z' } } });
};

test('team admin chat loads community pool and joins socket room', async () => {
  setupApi();
  render(<TeamChatPage />);
  await waitFor(() => assert.ok(screen.getByText('Anyone free for friendly?')));
  assert.ok(screen.getAllByText(/Team admins only/i).length >= 1);
  act(() => socketState.handlers.connect());
  assert.equal(socketState.emit.mock.calls[0][0], 'join-team-admin-chat');
  await waitFor(() => assert.ok(api.post.mock.calls.some(([url]) => url === '/team/admin-chat/community/read')));
});

test('community message sends to the admin pool and avoids duplicate socket rendering', async () => {
  setupApi();
  api.post.mockImplementation((url) => {
    if (url === '/team/admin-chat/community/messages') {
      return Promise.resolve({
        data: {
          data: {
            message: {
              id: 'own-community',
              scope: 'community',
              sender: { id: 'user-1', name: 'Satyam Admin', role: 'teamAdmin' },
              senderName: 'Satyam Admin',
              senderTeamName: 'FC KIET',
              message: 'We can play Sunday',
              createdAt: '2030-01-01T12:00:00Z',
            },
          },
        },
      });
    }
    return Promise.resolve({ data: { data: { lastReadAt: '2030-01-01T12:00:00Z' } } });
  });

  render(<TeamChatPage />);
  await waitFor(() => assert.ok(screen.getByText('Anyone free for friendly?')));
  fireEvent.change(screen.getByLabelText(/Message all team admins/i), { target: { value: 'We can play Sunday' } });
  fireEvent.click(screen.getByRole('button', { name: /Send/i }));
  await waitFor(() => assert.ok(api.post.mock.calls.some(([url]) => url === '/team/admin-chat/community/messages')));
  assert.ok(screen.getByText('We can play Sunday'));
  act(() => {
    socketState.handlers['team-admin-chat:community-message']({
      message: {
        id: 'own-community',
        scope: 'community',
        sender: { id: 'user-1', name: 'Satyam Admin', role: 'teamAdmin' },
        senderName: 'Satyam Admin',
        senderTeamName: 'FC KIET',
        message: 'We can play Sunday',
        createdAt: '2030-01-01T12:00:00Z',
      },
    });
  });
  assert.equal(screen.getAllByText('We can play Sunday').length, 1);
});

test('direct team chat can be opened from registered team list and receives socket messages', async () => {
  setupApi();
  api.post.mockImplementation((url) => {
    if (url === '/team/admin-chat/conversations') {
      return conversationsResponse().then((response) => ({ data: { data: { conversation: response.data.data.conversations[0] } } }));
    }
    return Promise.resolve({ data: { data: { lastReadAt: '2030-01-01T12:00:00Z' } } });
  });

  render(<TeamChatPage />);
  await waitFor(() => assert.ok(screen.getAllByText('IMS').length >= 1));
  fireEvent.click(screen.getByRole('button', { name: /Start chat with IMS FC/i }));
  await waitFor(() => assert.ok(api.get.mock.calls.some(([url]) => url === '/team/admin-chat/conversations/conv-1/messages')));
  await waitFor(() => assert.ok(screen.getByRole('heading', { name: 'IMS FC' })));

  act(() => {
    socketState.handlers['team-admin-chat:direct-message']({
      conversationId: 'conv-1',
      message: {
        id: 'direct-1',
        scope: 'direct',
        sender: { id: 'user-2', name: 'Aman', role: 'teamAdmin' },
        senderName: 'Aman',
        senderTeamName: 'IMS FC',
        message: 'Let us confirm venue.',
        createdAt: '2030-01-01T12:10:00Z',
      },
    });
  });
  await waitFor(() => assert.ok(screen.getByText('Let us confirm venue.')));
  await waitFor(() => assert.ok(api.post.mock.calls.some(([url]) => url === '/team/admin-chat/conversations/conv-1/read')));
});

test('incoming direct message marks the source conversation row unread until opened', async () => {
  setupApi();
  render(<TeamChatPage />);
  await waitFor(() => assert.ok(screen.getAllByText('IMS').length >= 1));

  act(() => {
    socketState.handlers['team-admin-chat:direct-message']({
      conversationId: 'conv-1',
      conversation: {
        id: 'conv-1',
        opponent: { id: 'team-2', name: 'IMS FC', shortName: 'IMS' },
        participantTeams: [{ id: 'team-1', name: 'FC KIET' }, { id: 'team-2', name: 'IMS FC' }],
      },
      message: {
        id: 'direct-unread',
        scope: 'direct',
        sender: { id: 'user-2', name: 'Aman', role: 'teamAdmin' },
        senderName: 'Aman',
        senderTeamName: 'IMS FC',
        message: 'Can KIET play tonight?',
        createdAt: '2030-01-01T12:10:00Z',
      },
    });
  });

  assert.ok(screen.getByLabelText('1 unread message from IMS FC'));
  fireEvent.click(screen.getByRole('button', { name: /Open chat with IMS FC, 1 unread message/i }));
  await waitFor(() => assert.ok(api.post.mock.calls.some(([url]) => url === '/team/admin-chat/conversations/conv-1/read')));
  await waitFor(() => assert.equal(screen.queryByLabelText('1 unread message from IMS FC'), null));
});
