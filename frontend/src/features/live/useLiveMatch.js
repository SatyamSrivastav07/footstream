import { useCallback, useEffect, useMemo, useState } from 'react';
import { io } from 'socket.io-client';
import api from '../../api/client.js';
import useEventNotificationQueue from './useEventNotificationQueue.js';

const socketUrl = (import.meta.env.VITE_API_URL || 'http://localhost:5000/api').replace(/\/api\/?$/, '');

export default function useLiveMatch(matchId, mode = 'public') {
  const [state, setState] = useState(null);
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [connection, setConnection] = useState('connecting');
  const [viewerCount, setViewerCount] = useState(0);
  const notifications = useEventNotificationQueue();
  const { enqueue } = notifications;

  const endpoints = useMemo(() => {
    if (mode === 'team') return { state: `/team/matches/${matchId}/live-state`, events: `/team/matches/${matchId}/events` };
    if (mode === 'admin') return { state: `/admin/matches/${matchId}/live-state`, events: `/admin/matches/${matchId}/events` };
    return { state: `/public/matches/${matchId}/live`, events: `/public/matches/${matchId}/events` };
  }, [matchId, mode]);

  const refresh = useCallback(async () => {
    try {
      const [stateResponse, eventResponse] = await Promise.all([api.get(endpoints.state), api.get(endpoints.events)]);
      setState(stateResponse.data.data.state);
      setEvents(eventResponse.data.data.events);
      setError('');
    } catch (requestError) { setError(requestError.userMessage); }
    finally { setLoading(false); }
  }, [endpoints]);

  useEffect(() => { refresh(); }, [refresh]);

  useEffect(() => {
    const socket = io(socketUrl, { withCredentials: true, reconnection: true });
    socket.on('connect', () => {
      setConnection('connected');
      socket.emit('join-match', { matchId, mode }, (response) => {
        if (!response?.ok) setError(response?.error?.message || 'Unable to join live match updates.');
      });
      refresh();
    });
    socket.on('disconnect', () => setConnection('reconnecting'));
    socket.io.on('reconnect_attempt', () => setConnection('reconnecting'));
    socket.on('match:state', setState);
    socket.on('match:viewer-count', (payload) => setViewerCount(Number(payload?.count) || 0));
    socket.on('match:event-created', (payload) => {
      if (mode === 'public') enqueue({ kind: 'event', event: payload?.event, state: payload?.state });
      refresh();
    });
    socket.on('match:event-undone', (payload) => {
      if (mode === 'public') enqueue({ kind: 'undo', event: payload?.event, state: payload?.state });
      refresh();
    });
    socket.on('match:transition', (payload) => {
      if (mode === 'public') enqueue({ kind: 'transition', state: payload?.state });
      refresh();
    });
    socket.on('match:error', (value) => setError(value.message));
    return () => { socket.emit('leave-match', matchId); socket.disconnect(); };
  }, [enqueue, matchId, mode, refresh]);

  return { state, events, loading, error, connection, viewerCount, refresh, setError, notifications };
}
