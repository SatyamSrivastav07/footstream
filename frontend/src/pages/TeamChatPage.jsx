import { MessageCircle, Search, Send, UsersRound, Wifi, WifiOff } from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { io } from 'socket.io-client';
import api, { socketUrl } from '../api/client.js';
import { useAuth } from '../context/AuthContext.jsx';

const initials = (value = '') => value
  .split(' ')
  .filter(Boolean)
  .slice(0, 2)
  .map((part) => part[0]?.toUpperCase())
  .join('') || 'FS';

const formatTime = (value) => {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
};

const uniqueMessages = (messages = []) => {
  const seen = new Set();
  return messages.filter((message) => {
    const key = message.id || message._id;
    if (!key) return true;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
};

const sameId = (left, right) => String(left || '') === String(right || '');

const messageSenderId = (message) => message?.sender?.id || message?.sender?._id || message?.sender || '';

const teamLogoUrl = (team) => {
  const logo = team?.logo || team?.logoUrl;
  if (!logo) return '';
  if (typeof logo === 'string') return logo;
  return logo.imageUrl || logo.url || logo.secure_url || '';
};

function TeamPill({ team }) {
  const logo = teamLogoUrl(team);
  return (
    <span className="inline-flex min-w-0 items-center gap-2">
      {logo ? (
        <img
          src={logo}
          alt=""
          className="size-7 shrink-0 rounded-full border border-white/10 bg-black/20 object-contain"
          onError={(event) => { event.currentTarget.style.display = 'none'; }}
        />
      ) : (
        <span className="grid size-7 shrink-0 place-items-center rounded-full bg-lime-300/15 text-[0.65rem] font-black text-lime-100">
          {initials(team?.name)}
        </span>
      )}
      <span className="truncate">{team?.shortName || team?.name || 'Team'}</span>
    </span>
  );
}

function MessageBubble({ item, own, user }) {
  return (
    <article className={`flex items-end gap-3 ${own ? 'justify-end' : 'justify-start'}`}>
      {!own && <div className="grid size-9 shrink-0 place-items-center rounded-full bg-lime-300/15 text-xs font-black text-lime-100">{initials(item.senderTeamName || item.senderName)}</div>}
      <div className={`max-w-[88%] rounded-3xl px-4 py-3 shadow-lg sm:max-w-[70%] ${own ? 'rounded-br-md bg-lime-300 text-[#07110d]' : 'rounded-bl-md bg-white/[0.07] text-white'}`}>
        <div className="mb-1 flex flex-wrap items-center gap-2 text-[0.7rem] font-bold uppercase tracking-[0.14em] opacity-75">
          <span>{own ? 'You' : item.senderName}</span>
          <span className="rounded-full bg-black/15 px-2 py-0.5">{own ? user?.team?.name || 'Your team' : item.senderTeamName}</span>
          <time dateTime={item.createdAt}>{formatTime(item.createdAt)}</time>
        </div>
        <p className="whitespace-pre-wrap break-words text-sm font-medium">{item.message}</p>
      </div>
      {own && <div className="grid size-9 shrink-0 place-items-center rounded-full bg-lime-300 text-xs font-black text-[#07110d]">{initials(user?.name)}</div>}
    </article>
  );
}

function ChatComposer({ id, draft, setDraft, sending, disabled = false, onSubmit, placeholder }) {
  return (
    <form className="border-t border-white/[0.07] p-3 sm:p-4" onSubmit={onSubmit}>
      <label htmlFor={id} className="sr-only">{placeholder}</label>
      <div className="flex flex-col gap-3 sm:flex-row">
        <textarea
          id={id}
          className="field-input min-h-16 flex-1 resize-none"
          maxLength={1000}
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Enter' && !event.shiftKey) {
              event.preventDefault();
              event.currentTarget.form?.requestSubmit();
            }
          }}
          placeholder={`${placeholder} Shift+Enter for a new line.`}
        />
        <button type="submit" className="primary-button sm:self-end" disabled={disabled || sending || !draft.trim()}>
          <Send size={16} /> {sending ? 'Sending...' : 'Send'}
        </button>
      </div>
      <p className="mt-2 text-xs text-white/40">Team admins only. Public viewers, players, and guests cannot access this chat.</p>
    </form>
  );
}

export default function TeamChatPage() {
  const { user } = useAuth();
  const [activeMode, setActiveMode] = useState('community');
  const [communityMessages, setCommunityMessages] = useState([]);
  const [communityPagination, setCommunityPagination] = useState({ before: null, hasMore: false });
  const [directMessages, setDirectMessages] = useState([]);
  const [directPagination, setDirectPagination] = useState({ before: null, hasMore: false });
  const [conversations, setConversations] = useState([]);
  const [selectedConversation, setSelectedConversation] = useState(null);
  const [teams, setTeams] = useState([]);
  const [search, setSearch] = useState('');
  const [communityDraft, setCommunityDraft] = useState('');
  const [directDraft, setDirectDraft] = useState('');
  const [loading, setLoading] = useState(true);
  const [loadingOlder, setLoadingOlder] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [connection, setConnection] = useState('offline');
  const communityListRef = useRef(null);
  const directListRef = useRef(null);

  const dispatchRead = useCallback(() => window.dispatchEvent(new Event('footstream:team-admin-chat-read')), []);

  const clearConversationUnread = useCallback((conversationId) => {
    setConversations((current) => current.map((conversation) => (
      conversation.id === conversationId ? { ...conversation, unreadCount: 0 } : conversation
    )));
  }, []);

  const markCommunityRead = useCallback(async () => {
    try {
      await api.post('/team/admin-chat/community/read');
      dispatchRead();
    } catch {
      // Read receipts are non-blocking.
    }
  }, [dispatchRead]);

  const markDirectRead = useCallback(async (conversationId) => {
    if (!conversationId) return;
    try {
      await api.post(`/team/admin-chat/conversations/${conversationId}/read`);
      clearConversationUnread(conversationId);
      dispatchRead();
    } catch {
      // Read receipts are non-blocking.
    }
  }, [clearConversationUnread, dispatchRead]);

  const loadCommunity = useCallback(async ({ before } = {}) => {
    const response = await api.get('/team/admin-chat/community/messages', { params: { limit: 50, ...(before ? { before } : {}) } });
    return response.data.data;
  }, []);

  const loadConversations = useCallback(async () => {
    const response = await api.get('/team/admin-chat/conversations');
    return response.data.data.conversations || [];
  }, []);

  const loadTeams = useCallback(async (value = '') => {
    const response = await api.get('/team/admin-chat/teams', { params: { search: value, limit: 30 } });
    return response.data.data.teams || [];
  }, []);

  const loadDirect = useCallback(async (conversationId, { before } = {}) => {
    const response = await api.get(`/team/admin-chat/conversations/${conversationId}/messages`, { params: { limit: 50, ...(before ? { before } : {}) } });
    return response.data.data;
  }, []);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError('');
    Promise.all([loadCommunity(), loadConversations(), loadTeams()])
      .then(([community, conversationList, teamList]) => {
        if (!active) return;
        setCommunityMessages(community.messages || []);
        setCommunityPagination(community.pagination || { before: null, hasMore: false });
        setConversations(conversationList);
        setTeams(teamList);
        markCommunityRead();
      })
      .catch((requestError) => active && setError(requestError.userMessage || 'Unable to load team admin chat.'))
      .finally(() => active && setLoading(false));
    return () => { active = false; };
  }, [loadCommunity, loadConversations, loadTeams, markCommunityRead]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      loadTeams(search)
        .then(setTeams)
        .catch(() => setTeams([]));
    }, 250);
    return () => window.clearTimeout(timer);
  }, [loadTeams, search]);

  useEffect(() => {
    const socket = io(socketUrl, { withCredentials: true, reconnection: true });
    socket.on('connect', () => {
      setConnection('connected');
      socket.emit('join-team-admin-chat', {}, (response) => {
        if (!response?.ok) setConnection('offline');
      });
    });
    socket.on('disconnect', () => setConnection('reconnecting'));
    socket.io.on('reconnect_attempt', () => setConnection('reconnecting'));
    socket.on('team-admin-chat:connected', () => setConnection('connected'));
    socket.on('team-admin-chat:error', (payload) => setError(payload?.message || 'Team admin chat connection failed.'));
    socket.on('team-admin-chat:community-message', (payload) => {
      if (!payload?.message) return;
      setCommunityMessages((current) => uniqueMessages([...current, payload.message]));
      if (activeMode === 'community') markCommunityRead();
    });
    socket.on('team-admin-chat:direct-message', (payload) => {
      if (!payload?.message) return;
      const ownMessage = sameId(messageSenderId(payload.message), user?._id || user?.id);
      const conversationOpen = selectedConversation?.id === payload.conversationId && activeMode === 'direct';
      setConversations((current) => {
        let matched = false;
        const updated = current.map((conversation) => {
          if (conversation.id !== payload.conversationId) return conversation;
          matched = true;
          return {
            ...conversation,
            lastMessageAt: payload.message.createdAt || new Date().toISOString(),
            unreadCount: conversationOpen || ownMessage ? 0 : (Number(conversation.unreadCount) || 0) + 1,
          };
        });
        if (!matched && payload.conversation) {
          updated.unshift({
            ...payload.conversation,
            unreadCount: conversationOpen || ownMessage ? 0 : 1,
            lastMessageAt: payload.message.createdAt || payload.conversation.lastMessageAt || new Date().toISOString(),
          });
        }
        return updated.sort((left, right) => new Date(right.lastMessageAt || 0) - new Date(left.lastMessageAt || 0));
      });
      if (conversationOpen) {
        setDirectMessages((current) => uniqueMessages([...current, payload.message]));
        markDirectRead(payload.conversationId);
      }
    });
    return () => socket.disconnect();
  }, [activeMode, markCommunityRead, markDirectRead, selectedConversation?.id, user?._id, user?.id]);

  useEffect(() => {
    const node = activeMode === 'community' ? communityListRef.current : directListRef.current;
    if (!node) return;
    node.scrollTop = node.scrollHeight;
  }, [activeMode, communityMessages.length, directMessages.length]);

  const openConversation = async (conversation) => {
    setActiveMode('direct');
    setSelectedConversation(conversation);
    setDirectMessages([]);
    setError('');
    setLoading(true);
    try {
      const data = await loadDirect(conversation.id);
      setDirectMessages(data.messages || []);
      setDirectPagination(data.pagination || { before: null, hasMore: false });
      setSelectedConversation(data.conversation || conversation);
      await markDirectRead(conversation.id);
      clearConversationUnread(conversation.id);
    } catch (requestError) {
      setError(requestError.userMessage || 'Unable to load direct chat.');
    } finally {
      setLoading(false);
    }
  };

  const startConversation = async (team) => {
    setError('');
    setNotice('');
    try {
      const response = await api.post('/team/admin-chat/conversations', { opponentTeamId: team.id || team._id });
      const conversation = response.data.data.conversation;
      setConversations((current) => {
        const withoutDuplicate = current.filter((item) => item.id !== conversation.id);
        return [conversation, ...withoutDuplicate];
      });
      await openConversation(conversation);
    } catch (requestError) {
      setError(requestError.userMessage || 'Unable to start direct chat.');
    }
  };

  const sendCommunity = async (event) => {
    event.preventDefault();
    const message = communityDraft.trim();
    if (!message || sending) return;
    setSending(true);
    setError('');
    setNotice('');
    try {
      const response = await api.post('/team/admin-chat/community/messages', { message });
      setCommunityMessages((current) => uniqueMessages([...current, response.data.data.message]));
      setCommunityDraft('');
      setNotice('Community message sent.');
      await markCommunityRead();
    } catch (requestError) {
      setError(requestError.userMessage || 'Message could not be sent.');
    } finally {
      setSending(false);
    }
  };

  const sendDirect = async (event) => {
    event.preventDefault();
    if (!selectedConversation) return;
    const message = directDraft.trim();
    if (!message || sending) return;
    setSending(true);
    setError('');
    setNotice('');
    try {
      const response = await api.post(`/team/admin-chat/conversations/${selectedConversation.id}/messages`, { message });
      setDirectMessages((current) => uniqueMessages([...current, response.data.data.message]));
      setConversations((current) => current.map((conversation) => (
        conversation.id === selectedConversation.id
          ? { ...conversation, lastMessageAt: response.data.data.message.createdAt || new Date().toISOString(), unreadCount: 0 }
          : conversation
      )));
      setDirectDraft('');
      setNotice('Direct message sent.');
      await markDirectRead(selectedConversation.id);
    } catch (requestError) {
      setError(requestError.userMessage || 'Message could not be sent.');
    } finally {
      setSending(false);
    }
  };

  const loadOlderCommunity = async () => {
    if (!communityPagination.hasMore || loadingOlder) return;
    setLoadingOlder(true);
    try {
      const data = await loadCommunity({ before: communityPagination.before });
      setCommunityMessages((current) => uniqueMessages([...(data.messages || []), ...current]));
      setCommunityPagination(data.pagination || { before: null, hasMore: false });
    } catch (requestError) {
      setError(requestError.userMessage || 'Unable to load older messages.');
    } finally {
      setLoadingOlder(false);
    }
  };

  const loadOlderDirect = async () => {
    if (!selectedConversation || !directPagination.hasMore || loadingOlder) return;
    setLoadingOlder(true);
    try {
      const data = await loadDirect(selectedConversation.id, { before: directPagination.before });
      setDirectMessages((current) => uniqueMessages([...(data.messages || []), ...current]));
      setDirectPagination(data.pagination || { before: null, hasMore: false });
    } catch (requestError) {
      setError(requestError.userMessage || 'Unable to load older direct messages.');
    } finally {
      setLoadingOlder(false);
    }
  };

  const connectionLabel = useMemo(() => {
    if (connection === 'connected') return 'Connected';
    if (connection === 'reconnecting') return 'Reconnecting...';
    return 'Offline';
  }, [connection]);

  const activeMessages = activeMode === 'community' ? communityMessages : directMessages;
  const activeListRef = activeMode === 'community' ? communityListRef : directListRef;
  const activePagination = activeMode === 'community' ? communityPagination : directPagination;

  return (
    <div className="space-y-6">
      <section className="panel overflow-hidden">
        <div className="panel-heading">
          <div>
            <p className="eyebrow">Team admin communication</p>
            <h1 className="panel-title">Team Admin Chat</h1>
            <p className="mt-2 max-w-2xl text-sm text-emerald-100/55">
              Chat with every FootStream team admin in the community pool, or open a direct admin-to-admin team conversation.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2 text-sm">
            <span className="status-badge status-neutral"><UsersRound size={14} /> Team admins only</span>
            <span className={`status-badge ${connection === 'connected' ? 'status-active' : 'status-neutral'}`}>
              {connection === 'connected' ? <Wifi size={14} /> : <WifiOff size={14} />} {connectionLabel}
            </span>
          </div>
        </div>

        {(error || notice) && (
          <div className={`mb-4 rounded-2xl border p-3 text-sm ${error ? 'border-red-300/20 bg-red-300/10 text-red-100' : 'border-lime-300/20 bg-lime-300/10 text-lime-100'}`} role={error ? 'alert' : 'status'}>
            {error || notice}
          </div>
        )}

        <div className="grid gap-4 xl:grid-cols-[21rem_1fr]">
          <aside className="space-y-4 rounded-[2rem] border border-white/[0.07] bg-black/20 p-4">
            <div className="grid grid-cols-2 gap-2">
              <button type="button" className={`rounded-2xl px-4 py-3 text-sm font-black transition ${activeMode === 'community' ? 'bg-lime-300 text-[#07110d]' : 'border border-white/10 text-white/70 hover:bg-white/[0.05]'}`} onClick={() => setActiveMode('community')}>
                Community Pool
              </button>
              <button type="button" className={`rounded-2xl px-4 py-3 text-sm font-black transition ${activeMode === 'direct' ? 'bg-lime-300 text-[#07110d]' : 'border border-white/10 text-white/70 hover:bg-white/[0.05]'}`} onClick={() => setActiveMode('direct')}>
                Direct Teams
              </button>
            </div>

            <div>
              <h2 className="text-sm font-black uppercase tracking-[0.2em] text-lime-200">Direct teams</h2>
              <label className="mt-3 flex items-center gap-2 rounded-2xl border border-white/10 bg-white/[0.04] px-3 py-2 text-sm text-white/60">
                <Search size={15} />
                <span className="sr-only">Search teams</span>
                <input className="w-full bg-transparent text-white outline-none placeholder:text-white/35" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search registered teams" />
              </label>
              <div className="mt-3 max-h-56 space-y-2 overflow-y-auto pr-1">
                {teams.length === 0 ? (
                  <p className="rounded-2xl border border-dashed border-white/10 p-3 text-sm text-white/45">No available registered teams found.</p>
                ) : teams.map((team) => (
                  <button key={team.id} type="button" className="flex w-full items-center justify-between gap-3 rounded-2xl border border-white/[0.07] bg-white/[0.035] px-3 py-2 text-left text-sm transition hover:border-lime-300/30 hover:bg-lime-300/10" onClick={() => startConversation(team)} aria-label={`Start chat with ${team.name}`}>
                    <TeamPill team={team} />
                    <span className="shrink-0 text-xs font-bold text-lime-200">Chat</span>
                  </button>
                ))}
              </div>
            </div>

            <div>
              <h2 className="text-sm font-black uppercase tracking-[0.2em] text-lime-200">Open conversations</h2>
              <div className="mt-3 max-h-56 space-y-2 overflow-y-auto pr-1">
                {conversations.length === 0 ? (
                  <p className="rounded-2xl border border-dashed border-white/10 p-3 text-sm text-white/45">No direct conversations yet.</p>
                ) : conversations.map((conversation) => {
                  const unreadCount = Number(conversation.unreadCount) || 0;
                  const opponentName = conversation.opponent?.name || 'team';
                  return (
                    <button key={conversation.id} type="button" className={`flex w-full items-center justify-between gap-3 rounded-2xl border px-3 py-2 text-left text-sm transition ${selectedConversation?.id === conversation.id && activeMode === 'direct' ? 'border-lime-300/40 bg-lime-300/10' : 'border-white/[0.07] bg-white/[0.035] hover:border-lime-300/30 hover:bg-lime-300/10'}`} onClick={() => openConversation(conversation)} aria-label={`Open chat with ${opponentName}${unreadCount ? `, ${unreadCount} unread ${unreadCount === 1 ? 'message' : 'messages'}` : ''}`}>
                      <TeamPill team={conversation.opponent} />
                      <span className="flex shrink-0 items-center gap-2">
                        {unreadCount > 0 && (
                          <span className="grid min-w-5 place-items-center rounded-full bg-red-400 px-1.5 py-0.5 text-[0.62rem] font-black leading-none text-white shadow-lg shadow-red-500/30" aria-label={`${unreadCount} unread ${unreadCount === 1 ? 'message' : 'messages'} from ${opponentName}`}>
                            {unreadCount > 9 ? '9+' : unreadCount}
                          </span>
                        )}
                        <span className="text-[0.65rem] uppercase tracking-[0.12em] text-white/35">{formatTime(conversation.lastMessageAt)}</span>
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          </aside>

          <div className="rounded-[2rem] border border-white/[0.07] bg-black/20">
            <div className="border-b border-white/[0.07] px-4 py-3 sm:px-6">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.22em] text-lime-200/80">
                    {activeMode === 'community' ? 'Community Pool' : 'Direct Team Chat'}
                  </p>
                  <h2 className="mt-1 text-lg font-black text-white">
                    {activeMode === 'community' ? 'All team admins' : selectedConversation?.opponent?.name || 'Choose a team'}
                  </h2>
                </div>
                <span className="status-badge status-neutral">
                  <MessageCircle size={14} /> {activeMessages.length} messages
                </span>
              </div>
            </div>

            <div ref={activeListRef} className="flex h-[62vh] min-h-[28rem] flex-col gap-3 overflow-y-auto p-4 sm:p-6" aria-live="polite" aria-label={activeMode === 'community' ? 'Community team admin chat messages' : 'Direct team admin chat messages'}>
              {loading ? (
                <div className="grid flex-1 place-items-center text-sm text-white/45">Loading team admin chat...</div>
              ) : activeMode === 'direct' && !selectedConversation ? (
                <div className="grid flex-1 place-items-center text-center">
                  <div>
                    <UsersRound className="mx-auto text-lime-200" size={38} />
                    <p className="mt-3 font-semibold text-white">Select a registered team to start chatting.</p>
                    <p className="mt-1 text-sm text-white/45">Only assigned admins of both teams can see that direct conversation.</p>
                  </div>
                </div>
              ) : (
                <>
                  {activePagination.hasMore && (
                    <button type="button" className="secondary-button mx-auto text-xs" onClick={activeMode === 'community' ? loadOlderCommunity : loadOlderDirect} disabled={loadingOlder}>
                      {loadingOlder ? 'Loading...' : 'Load older messages'}
                    </button>
                  )}
                  {activeMessages.length === 0 ? (
                    <div className="grid flex-1 place-items-center text-center">
                      <div>
                        <MessageCircle className="mx-auto text-lime-200" size={36} />
                        <p className="mt-3 font-semibold text-white">No messages yet.</p>
                        <p className="mt-1 text-sm text-white/45">{activeMode === 'community' ? 'Start the all-team-admin discussion.' : 'Send the first direct message.'}</p>
                      </div>
                    </div>
                  ) : activeMessages.map((item) => {
                    const own = item.sender?.id && String(item.sender.id) === String(user?._id || user?.id);
                    return <MessageBubble key={item.id || item._id} item={item} own={own} user={user} />;
                  })}
                </>
              )}
            </div>

            {activeMode === 'community' ? (
              <ChatComposer id="team-admin-community-message" draft={communityDraft} setDraft={setCommunityDraft} sending={sending} onSubmit={sendCommunity} placeholder="Message all team admins..." />
            ) : (
              <ChatComposer id="team-admin-direct-message" draft={directDraft} setDraft={setDirectDraft} sending={sending} disabled={!selectedConversation} onSubmit={sendDirect} placeholder="Message this team admin..." />
            )}
          </div>
        </div>
      </section>
    </div>
  );
}
