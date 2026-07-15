import { useCallback, useEffect, useMemo, useState } from 'react';
import { io } from 'socket.io-client';
import api, { socketUrl } from '../../api/client.js';
import useEventNotificationQueue from './useEventNotificationQueue.js';

const timestamp = (value) => {
  if (!value) return 0;
  const date = value instanceof Date ? value : new Date(value);
  const time = date.getTime();
  return Number.isNaN(time) ? 0 : time;
};

const numberValue = (value) => Number.isFinite(Number(value)) ? Number(value) : 0;

export const isFreshLiveState = (current, candidate) => {
  if (!candidate) return false;
  if (!current) return true;
  const currentSequence = numberValue(current.latestEventSequence);
  const candidateSequence = numberValue(candidate.latestEventSequence);
  if (candidateSequence !== currentSequence) return candidateSequence > currentSequence;
  const currentUpdatedAt = timestamp(current.updatedAt);
  const candidateUpdatedAt = timestamp(candidate.updatedAt);
  if (candidateUpdatedAt !== currentUpdatedAt) return candidateUpdatedAt > currentUpdatedAt;
  const currentEventCount = numberValue(current.activeEventCount);
  const candidateEventCount = numberValue(candidate.activeEventCount);
  if (candidateEventCount !== currentEventCount) return candidateEventCount > currentEventCount;
  return true;
};

const mergeSocketState = (current, candidate) => ({
  ...candidate,
  permissions: current?.permissions || candidate.permissions,
});

const eventSequence = (event) => numberValue(event?.sequence);

export const mergeLiveEvents = (currentEvents, nextEvent) => {
  if (!nextEvent?._id) return currentEvents;
  const existingIndex = currentEvents.findIndex((event) => String(event._id) === String(nextEvent._id));
  if (existingIndex >= 0) {
    const copy = [...currentEvents];
    copy[existingIndex] = nextEvent;
    return copy.sort((left, right) => eventSequence(left) - eventSequence(right));
  }
  return [...currentEvents, nextEvent].sort((left, right) => eventSequence(left) - eventSequence(right));
};

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

  const applyState = useCallback((nextState, { preservePermissions = false } = {}) => {
    setState((current) => {
      if (!isFreshLiveState(current, nextState)) return current;
      const merged = preservePermissions ? mergeSocketState(current, nextState) : nextState;
      return merged;
    });
  }, []);

  const refresh = useCallback(async () => {
    try {
      const [stateResponse, eventResponse] = await Promise.all([api.get(endpoints.state), api.get(endpoints.events)]);
      applyState(stateResponse.data.data.state);
      setEvents(eventResponse.data.data.events);
      setError('');
    } catch (requestError) { setError(requestError.userMessage); }
    finally { setLoading(false); }
  }, [applyState, endpoints]);

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
    socket.on('match:state', (nextState) => applyState(nextState, { preservePermissions: true }));
    socket.on('match:live-state', (nextState) => applyState(nextState, { preservePermissions: true }));
    socket.on('match:viewer-count', (payload) => setViewerCount(Number(payload?.count) || 0));
    socket.on('match:event-created', (payload) => {
      if (mode === 'public') enqueue({ kind: 'event', event: payload?.event, state: payload?.state });
      if (payload?.state) applyState(payload.state, { preservePermissions: true });
      if (payload?.event) setEvents((current) => mergeLiveEvents(current, payload.event));
    });
    socket.on('match:event-undone', (payload) => {
      if (mode === 'public') enqueue({ kind: 'undo', event: payload?.event, state: payload?.state });
      if (payload?.state) applyState(payload.state, { preservePermissions: true });
      if (payload?.event) setEvents((current) => mergeLiveEvents(current, payload.event));
    });
    socket.on('match:transition', (payload) => {
      if (mode === 'public') enqueue({ kind: 'transition', state: payload?.state });
      if (payload?.state) applyState(payload.state, { preservePermissions: true });
    });
    socket.on('match:error', (value) => setError(value.message));
    return () => { socket.emit('leave-match', matchId); socket.disconnect(); };
  }, [applyState, enqueue, matchId, mode, refresh]);

  return { state, events, loading, error, connection, viewerCount, refresh, setError, notifications };
}
