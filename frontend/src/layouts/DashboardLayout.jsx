import { BarChart3, Building2, CalendarDays, History, LayoutDashboard, LogOut, Menu, ShieldCheck, Swords, UserCog, UserPlus, UsersRound, X } from 'lucide-react';
import { useState } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import Brand from '../components/Brand.jsx';
import { useAuth } from '../context/AuthContext.jsx';

export default function DashboardLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);
  const home = user.role === 'superAdmin' ? '/admin' : '/team';

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
          <Brand />
          <button type="button" className="icon-button lg:hidden" onClick={() => setMobileOpen(false)} aria-label="Close navigation"><X size={19} /></button>
        </div>

        <nav className="mt-12 space-y-2" aria-label="Main navigation">
          <NavLink to={home} end className={({ isActive }) => `nav-link ${isActive ? 'nav-link-active' : ''}`} onClick={() => setMobileOpen(false)}>
            <LayoutDashboard size={18} /> Overview
          </NavLink>
          {user.role === 'superAdmin' ? (
            <>
              <NavLink to="/admin/teams" className={({ isActive }) => `nav-link ${isActive ? 'nav-link-active' : ''}`} onClick={() => setMobileOpen(false)}>
                <Building2 size={18} /> Teams
              </NavLink>
              <NavLink to="/admin/team-admins" className={({ isActive }) => `nav-link ${isActive ? 'nav-link-active' : ''}`} onClick={() => setMobileOpen(false)}>
                <UserCog size={18} /> Team admins
              </NavLink>
              <NavLink to="/admin/challenges" className={({ isActive }) => `nav-link ${isActive ? 'nav-link-active' : ''}`} onClick={() => setMobileOpen(false)}>
                <Swords size={18} /> Challenges
              </NavLink>
            </>
          ) : (
            <NavLink to="/team/current" className={({ isActive }) => `nav-link ${isActive ? 'nav-link-active' : ''}`} onClick={() => setMobileOpen(false)}>
              <Building2 size={18} /> My team
            </NavLink>
          )}
          {user.role === 'teamAdmin' && (
            <>
              <NavLink to="/team/squad" className={({ isActive }) => `nav-link ${isActive ? 'nav-link-active' : ''}`} onClick={() => setMobileOpen(false)}>
                <UsersRound size={18} /> Squad
              </NavLink>
              <NavLink to="/team/join-requests" className={({ isActive }) => `nav-link ${isActive ? 'nav-link-active' : ''}`} onClick={() => setMobileOpen(false)}>
                <UserPlus size={18} /> Join Requests
              </NavLink>
              <NavLink to="/team/challenges" className={({ isActive }) => `nav-link ${isActive ? 'nav-link-active' : ''}`} onClick={() => setMobileOpen(false)}>
                <Swords size={18} /> Challenges
              </NavLink>
            </>
          )}
          <NavLink to={user.role === 'superAdmin' ? '/admin/matches' : '/team/matches'} className={({ isActive }) => `nav-link ${isActive ? 'nav-link-active' : ''}`} onClick={() => setMobileOpen(false)}>
            <CalendarDays size={18} /> Matches
          </NavLink>
          {user.role === 'teamAdmin' && <><NavLink to="/team/statistics" className={({ isActive }) => `nav-link ${isActive ? 'nav-link-active' : ''}`} onClick={() => setMobileOpen(false)}><BarChart3 size={18} /> Statistics</NavLink><NavLink to="/team/history" className={({ isActive }) => `nav-link ${isActive ? 'nav-link-active' : ''}`} onClick={() => setMobileOpen(false)}><History size={18} /> History</NavLink></>}
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
