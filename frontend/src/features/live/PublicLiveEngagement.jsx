import { Megaphone, Send, UserRound } from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { io } from 'socket.io-client';
import api from '../../api/client.js';

const socketUrl = (import.meta.env.VITE_API_URL || 'http://localhost:5000/api').replace(/\/api\/?$/, '');
const storageKey = 'footstream_guest_identity';

const createGuestId = () => crypto.randomUUID();
const cleanName = (value) => value.trim().replace(/[<>&"']/g, '').slice(0, 30);
const loadIdentity = () => {
  try {
    const parsed = JSON.parse(localStorage.getItem(storageKey) || '{}');
    if (parsed.guestSessionId && parsed.displayName) return parsed;
  } catch {
    return null;
  }
  return null;
};

export default function PublicLiveEngagement({ matchId, viewerCount = 0 }) {
  const [identity, setIdentity] = useState(() => loadIdentity());
  const [displayName, setDisplayName] = useState(identity?.displayName || '');
  const [messages, setMessages] = useState([]);
  const [announcement, setAnnouncement] = useState(null);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [loading, setLoading] = useState(true);
  const [newCount, setNewCount] = useState(0);
  const scrollRef = useRef(null);
  const bottomRef = useRef(null);
  const ready = Boolean(identity?.guestSessionId && identity?.displayName);

  const saveIdentity = (event) => {
    event.preventDefault();
    const name = cleanName(displayName);
    if (name.length < 2) {
      setError('Display name must be 2 to 30 characters.');
      return;
    }
    const next = { displayName: name, guestSessionId: identity?.guestSessionId || createGuestId() };
    localStorage.setItem(storageKey, JSON.stringify(next));
    setIdentity(next);
    setError('');
  };

  const nearBottom = () => {
    const node = scrollRef.current;
    if (!node) return true;
    return node.scrollHeight - node.scrollTop - node.clientHeight < 80;
  };

  const load = useCallback(async () => {
    try {
      const [chatResponse, announcementResponse] = await Promise.all([
        api.get(`/public/matches/${matchId}/chat`),
        api.get(`/public/matches/${matchId}/announcement`),
      ]);
      setMessages(chatResponse.data.data.messages);
      setAnnouncement(announcementResponse.data.data.announcement);
      setError('');
    } catch (requestError) {
      setError(requestError.userMessage);
    } finally {
      setLoading(false);
    }
  }, [matchId]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    const socket = io(socketUrl, { withCredentials: true, reconnection: true });
    socket.on('connect', () => socket.emit('join-match', { matchId, mode: 'engagement' }));
    socket.on('match:chat-message', (payload) => {
      const shouldScroll = nearBottom();
      setMessages((current) => current.some((item) => item._id === payload?.message?._id) ? current : [...current, payload.message]);
      if (shouldScroll) setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 0);
      else setNewCount((count) => count + 1);
    });
    socket.on('match:chat-deleted', (payload) => {
      setMessages((current) => current.filter((item) => item._id !== payload?.messageId));
    });
    socket.on('match:announcement-updated', (payload) => setAnnouncement(payload?.announcement || null));
    socket.on('match:announcement-removed', () => setAnnouncement(null));
    return () => { socket.emit('leave-match', matchId); socket.disconnect(); };
  }, [matchId]);

  useEffect(() => { if (!loading) bottomRef.current?.scrollIntoView(); }, [loading]);

  const send = async (event) => {
    event.preventDefault();
    if (!ready || !message.trim()) return;
    try {
      const response = await api.post(`/public/matches/${matchId}/chat`, {
        displayName: identity.displayName,
        guestSessionId: identity.guestSessionId,
        message,
      });
      setMessages((current) => current.some((item) => item._id === response.data.data.message._id) ? current : [...current, response.data.data.message]);
      setMessage('');
      setError('');
      setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 0);
    } catch (requestError) {
      setError(requestError.userMessage);
    }
  };

  const olderCursor = useMemo(() => messages[0]?.createdAt, [messages]);
  const loadOlder = async () => {
    if (!olderCursor) return;
    try {
      const response = await api.get(`/public/matches/${matchId}/chat`, { params: { before: olderCursor } });
      setMessages((current) => [...response.data.data.messages, ...current]);
    } catch (requestError) {
      setNotice(requestError.userMessage);
    }
  };

  return (
    <section className="grid gap-6 xl:grid-cols-[1fr_380px]">
      <div className="rounded-3xl border border-lime-300/15 bg-lime-300/[0.055] p-5">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <Megaphone size={20} className="text-lime-200" />
            <div>
              <p className="eyebrow">Team announcement</p>
              <p className="mt-1 text-sm text-white/70">{announcement?.message || 'No active announcement from the team.'}</p>
            </div>
          </div>
          <span className="status-badge status-active">{viewerCount} watching</span>
        </div>
      </div>

      <aside className="rounded-3xl border border-white/[0.08] bg-white/[0.025] p-4">
        <div className="mb-4 flex items-center justify-between gap-3">
          <div><p className="eyebrow">Public live chat</p><h2 className="font-display text-2xl font-bold text-white">Match chat</h2></div>
          {newCount > 0 && <button type="button" className="count-pill" onClick={() => { setNewCount(0); bottomRef.current?.scrollIntoView({ behavior: 'smooth' }); }}>{newCount} new</button>}
        </div>
        {(error || notice) && <div className="mb-3 rounded-xl border border-amber-300/20 bg-amber-300/10 p-3 text-sm text-amber-100">{error || notice}</div>}
        {!ready ? (
          <form className="space-y-3" onSubmit={saveIdentity}>
            <label className="field-label">Display name<input className="field-input mt-2" value={displayName} maxLength="30" placeholder="Your match name" onChange={(event) => setDisplayName(event.target.value)} /></label>
            <button type="submit" className="primary-button w-full"><UserRound size={16} /> Join chat</button>
          </form>
        ) : (
          <>
            <div ref={scrollRef} className="max-h-[440px] space-y-3 overflow-y-auto pr-1">
              <button type="button" className="secondary-button w-full justify-center text-xs" onClick={loadOlder}>Load older</button>
              {loading ? <div className="skeleton h-32" /> : messages.length === 0 ? <p className="rounded-2xl border border-dashed border-white/10 p-5 text-center text-sm text-white/40">No chat messages yet.</p> : messages.map((item) => (
                <article key={item._id} className="rounded-2xl bg-black/15 p-3">
                  <div className="flex items-center justify-between gap-2"><p className="truncate text-sm font-bold text-white">{item.displayName}</p><time className="text-[10px] text-white/30">{new Date(item.createdAt).toLocaleTimeString()}</time></div>
                  <p className="mt-1 break-words text-sm text-white/65">{item.message}</p>
                </article>
              ))}
              <div ref={bottomRef} />
            </div>
            <form className="mt-4 flex gap-2" onSubmit={send}>
              <input className="field-input" maxLength="300" value={message} placeholder={`Message as ${identity.displayName}`} onChange={(event) => setMessage(event.target.value)} />
              <button type="submit" className="primary-button px-4" aria-label="Send chat message"><Send size={17} /></button>
            </form>
          </>
        )}
      </aside>
    </section>
  );
}
