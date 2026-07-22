import { BarChart3, Bell, Building2, CalendarDays, ClipboardList, History, Image, LayoutDashboard, LogOut, Menu, MessageCircle, Settings, ShieldCheck, Sparkles, Trophy, UserCog, UserPlus, UsersRound, X, ClipboardCheck, ShieldQuestion } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { io } from 'socket.io-client';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import api, { socketUrl } from '../api/client.js';
import Brand from '../components/Brand.jsx';
import { TOURNAMENTS_ENABLED } from '../config/features.js';
import { useAuth } from '../context/AuthContext.jsx';

export default function DashboardLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [unreadCategories, setUnreadCategories] = useState({});
  const [teamAdminChatUnread, setTeamAdminChatUnread] = useState(0);
  const home = user.role === 'superAdmin' ? '/admin' : '/team';

  const loadUnread = useCallback(async () => {
    try {
      const response = await api.get('/notifications/unread-count');
      setUnreadCount(response.data.data.count);
      setUnreadCategories(response.data.data.categories || {});
    } catch {
      setUnreadCount(0);
      setUnreadCategories({});
    }
  }, []);

  const loadTeamAdminChatUnread = useCallback(async () => {
    if (user.role !== 'teamAdmin') return;
    try {
      const response = await api.get('/team/admin-chat/unread-count');
      setTeamAdminChatUnread(response.data.data.count || 0);
    } catch {
      setTeamAdminChatUnread(0);
    }
  }, [user.role]);

  useEffect(() => {
    loadUnread();
    window.addEventListener('footstream:notifications-changed', loadUnread);
    return () => window.removeEventListener('footstream:notifications-changed', loadUnread);
  }, [loadUnread]);

  useEffect(() => {
    loadTeamAdminChatUnread();
    window.addEventListener('footstream:team-admin-chat-read', loadTeamAdminChatUnread);
    return () => window.removeEventListener('footstream:team-admin-chat-read', loadTeamAdminChatUnread);
  }, [loadTeamAdminChatUnread]);

  useEffect(() => {
    if (user.role !== 'teamAdmin') return undefined;
    const socket = io(socketUrl, { withCredentials: true, reconnection: true });
    socket.on('connect', () => socket.emit('join-team-admin-chat'));
    const handleMessage = (payload) => {
      const senderId = payload?.message?.sender?.id;
      if (senderId && String(senderId) === String(user._id || user.id)) return;
      if (window.location.pathname === '/team/chat') {
        loadTeamAdminChatUnread();
        return;
      }
      setTeamAdminChatUnread((current) => current + 1);
    };
    socket.on('team-admin-chat:community-message', handleMessage);
    socket.on('team-admin-chat:direct-message', handleMessage);
    return () => socket.disconnect();
  }, [loadTeamAdminChatUnread, user._id, user.id, user.role]);

  const dot = (count) => count > 0 ? <span className="ml-auto size-2 rounded-full bg-red-400" aria-label={`${count} unread notifications`} /> : null;
  const unreadDot = dot(unreadCount);
  const teamRequestDot = dot(unreadCategories.teamRequests || 0);
  const joinRequestDot = dot(unreadCategories.joinRequests || 0);
  const collaborationDot = dot(unreadCategories.matchCollaborations || 0);
  const tournamentReviewDot = dot(unreadCategories.tournamentReview || 0);
  const tournamentDot = dot((unreadCategories.hostedTournaments || 0) + (unreadCategories.myTournaments || 0));
  const teamAdminChatDot = dot(teamAdminChatUnread);
  const adminTournamentPath = TOURNAMENTS_ENABLED ? '/admin/tournaments' : '/tournaments-coming-soon';
  const teamTournamentPath = TOURNAMENTS_ENABLED ? '/team/tournaments' : '/tournaments-coming-soon';

  const handleLogout = async () => {
    await logout();
    navigate('/login', { replace: true });
  };

  return (
    <div className="min-h-screen bg-[#07110d] text-white">
      <button type="button" className="fixed left-4 top-4 z-30 rounded-xl border border-white/10 bg-[#102019] p-2.5 text-white lg:hidden" onClick={() => setMobileOpen(true)} aria-label="Open navigation">
        <Menu size={20} />
      </button>

      {mobileOpen && <button type="button" className="fixed inset-0 z-30 bg-black/65 lg:hidden" aria-label="Close navigation" onClick={() => setMobileOpen(false)} />}

      <aside className={`fixed inset-y-0 left-0 z-40 flex w-72 flex-col border-r border-white/[0.07] bg-[#09150f] px-5 py-6 transition-transform lg:translate-x-0 ${mobileOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="flex items-center justify-between">
          <NavLink to={home} className="rounded-2xl focus:outline-none focus:ring-2 focus:ring-lime-300/70" onClick={() => setMobileOpen(false)} aria-label="Go to dashboard overview">
            <Brand />
          </NavLink>
          <button type="button" className="icon-button lg:hidden" onClick={() => setMobileOpen(false)} aria-label="Close navigation"><X size={19} /></button>
        </div>

        <nav className="mt-12 flex-1 space-y-2 overflow-y-auto pr-1" aria-label="Main navigation">
          <NavLink to={home} end className={({ isActive }) => `nav-link ${isActive ? 'nav-link-active' : ''}`} onClick={() => setMobileOpen(false)}>
            <LayoutDashboard size={18} /> Overview
          </NavLink>
          {user.role === 'superAdmin' ? (
            <>
              <NavLink to="/admin/teams" className={({ isActive }) => `nav-link ${isActive ? 'nav-link-active' : ''}`} onClick={() => setMobileOpen(false)}>
                <Building2 size={18} /> All Teams
              </NavLink>
              <NavLink to="/admin/team-admins" className={({ isActive }) => `nav-link ${isActive ? 'nav-link-active' : ''}`} onClick={() => setMobileOpen(false)}>
                <UserCog size={18} /> Team admins
              </NavLink>
              <NavLink to="/admin/platform-settings" className={({ isActive }) => `nav-link ${isActive ? 'nav-link-active' : ''}`} onClick={() => setMobileOpen(false)}>
                <Settings size={18} /> Platform Settings
              </NavLink>
              <NavLink to="/admin/teams/pending" className={({ isActive }) => `nav-link ${isActive ? 'nav-link-active' : ''}`} onClick={() => setMobileOpen(false)}>
                <ClipboardList size={18} /> Pending Teams {teamRequestDot}
              </NavLink>
              <NavLink to={adminTournamentPath} className={({ isActive }) => `nav-link ${isActive ? 'nav-link-active' : ''}`} onClick={() => setMobileOpen(false)}>
                <Trophy size={18} /> Tournament Review {tournamentReviewDot}
              </NavLink>
            </>
          ) : (
            <NavLink to="/team/current" className={({ isActive }) => `nav-link ${isActive ? 'nav-link-active' : ''}`} onClick={() => setMobileOpen(false)}>
              <Building2 size={18} /> My team
            </NavLink>
          )}
          {user.role === 'teamAdmin' && (
            <>
              <NavLink to="/team/chat" className={({ isActive }) => `nav-link ${isActive ? 'nav-link-active' : ''}`} onClick={() => setMobileOpen(false)}>
                <MessageCircle size={18} /> Team Admin Chat {teamAdminChatDot}
              </NavLink>
              <NavLink to="/team/collaborations" className={({ isActive }) => `nav-link ${isActive ? 'nav-link-active' : ''}`} onClick={() => setMobileOpen(false)}>
                <ShieldQuestion size={18} /> Match Verification {collaborationDot}
              </NavLink>
              <NavLink to="/team/activity" className={({ isActive }) => `nav-link ${isActive ? 'nav-link-active' : ''}`} onClick={() => setMobileOpen(false)}>
                <Sparkles size={18} /> Activity
              </NavLink>
              <NavLink to="/team/squad" className={({ isActive }) => `nav-link ${isActive ? 'nav-link-active' : ''}`} onClick={() => setMobileOpen(false)}>
                <UsersRound size={18} /> Squad
              </NavLink>
              <NavLink to="/team/squad/tactical-board" className={({ isActive }) => `nav-link ${isActive ? 'nav-link-active' : ''}`} onClick={() => setMobileOpen(false)}>
                <ClipboardCheck size={18} /> Tactical Board
              </NavLink>
              <NavLink to="/team/join-requests" className={({ isActive }) => `nav-link ${isActive ? 'nav-link-active' : ''}`} onClick={() => setMobileOpen(false)}>
                <UserPlus size={18} /> Join Requests {joinRequestDot}
              </NavLink>
              <NavLink to="/team/gallery-posts" className={({ isActive }) => `nav-link ${isActive ? 'nav-link-active' : ''}`} onClick={() => setMobileOpen(false)}>
                <Image size={18} /> Gallery Posts
              </NavLink>
              <NavLink to="/team/achievements" className={({ isActive }) => `nav-link ${isActive ? 'nav-link-active' : ''}`} onClick={() => setMobileOpen(false)}>
                <Trophy size={18} /> Achievements
              </NavLink>
              <NavLink to={teamTournamentPath} className={({ isActive }) => `nav-link ${isActive ? 'nav-link-active' : ''}`} onClick={() => setMobileOpen(false)}>
                <Trophy size={18} /> Tournament {tournamentDot}
              </NavLink>
            </>
          )}
          <NavLink to={user.role === 'superAdmin' ? '/admin/matches' : '/team/matches'} className={({ isActive }) => `nav-link ${isActive ? 'nav-link-active' : ''}`} onClick={() => setMobileOpen(false)}>
            <CalendarDays size={18} /> Matches
          </NavLink>
          {user.role === 'teamAdmin' && <><NavLink to="/team/statistics" className={({ isActive }) => `nav-link ${isActive ? 'nav-link-active' : ''}`} onClick={() => setMobileOpen(false)}><BarChart3 size={18} /> Statistics</NavLink><NavLink to="/team/history" className={({ isActive }) => `nav-link ${isActive ? 'nav-link-active' : ''}`} onClick={() => setMobileOpen(false)}><History size={18} /> History</NavLink></>}
          <NavLink to="/notifications" className={({ isActive }) => `nav-link ${isActive ? 'nav-link-active' : ''}`} onClick={() => setMobileOpen(false)}>
            <Bell size={18} /> Notifications {unreadDot}
          </NavLink>
        </nav>

        <div className="mt-auto rounded-2xl border border-white/[0.07] bg-white/[0.035] p-4">
          <div className="flex items-center gap-3">
            <div className="grid size-10 shrink-0 place-items-center rounded-xl bg-emerald-400/10 text-sm font-bold text-emerald-200">{user.name.slice(0, 2).toUpperCase()}</div>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-white">{user.name}</p>
              <p className="truncate text-xs text-emerald-100/45">{user.email}</p>
            </div>
          </div>
          <div className="mt-3 flex items-center gap-2 text-xs font-semibold text-lime-300/80">
            <ShieldCheck size={14} /> {user.role === 'superAdmin' ? 'Super administrator' : 'Team administrator'}
          </div>
          <button type="button" onClick={handleLogout} className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl border border-white/10 px-3 py-2.5 text-sm font-semibold text-white/75 transition hover:border-red-300/20 hover:bg-red-300/10 hover:text-red-100">
            <LogOut size={16} /> Log out
          </button>
        </div>
      </aside>

      <main className="min-h-screen lg:pl-72">
        <div className="mx-auto max-w-[1440px] px-5 pb-12 pt-20 sm:px-8 lg:px-10 lg:pt-10">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
