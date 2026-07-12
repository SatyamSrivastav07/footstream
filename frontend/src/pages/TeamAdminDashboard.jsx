import { Building2, CalendarDays, MapPin, ShieldCheck } from 'lucide-react';
import { useEffect, useState } from 'react';
import api from '../api/client.js';
import TeamBrandingUploader from '../components/TeamBrandingUploader.jsx';
import { useAuth } from '../context/AuthContext.jsx';

export default function TeamAdminDashboard() {
  const { user } = useAuth();
  const [team, setTeam] = useState(user.team);

  useEffect(() => {
    api.get('/team/current')
      .then((response) => setTeam(response.data.data.team))
      .catch(() => setTeam(user.team));
  }, [user.team]);

  return (
    <>
      <header>
        <p className="eyebrow">Team workspace</p>
        <h1 className="page-title">Welcome, {user.name.split(' ')[0]}</h1>
        <p className="page-copy">Your club foundation is ready. Squad and match tools arrive in their approved phases.</p>
      </header>

      <section className="mt-9 overflow-hidden rounded-3xl border border-white/[0.08] bg-[linear-gradient(135deg,rgba(190,242,100,.09),rgba(255,255,255,.025))] p-7 sm:p-9">
        <div className="flex flex-col justify-between gap-8 md:flex-row md:items-center">
          <div className="flex items-center gap-5">
            <div className="grid size-20 shrink-0 place-items-center rounded-2xl bg-lime-300 font-display text-2xl font-black text-emerald-950">{team?.name?.slice(0, 2).toUpperCase() || 'FS'}</div>
            <div><p className="text-xs font-bold uppercase tracking-[0.2em] text-lime-200/65">Assigned club</p><h2 className="mt-2 font-display text-3xl font-bold text-white">{team?.name || 'Team unavailable'}</h2><div className="mt-2 flex items-center gap-2 text-sm text-emerald-100/45"><MapPin size={15} /> Team profile initialized</div></div>
          </div>
          <span className="status-badge status-active w-fit"><ShieldCheck size={13} /> Authorized</span>
        </div>
      </section>

      <section className="mt-7 grid gap-5 md:grid-cols-2">
        <article className="panel min-h-56"><div className="metric-icon metric-emerald"><Building2 size={20} /></div><h2 className="mt-7 font-display text-2xl font-bold">Team administration</h2><p className="mt-2 max-w-md text-sm leading-6 text-emerald-100/45">Your account is securely linked to one team. Cross-team access is rejected by the FootStream API.</p><div className="mt-7 h-px bg-white/[0.07]" /><p className="mt-5 text-xs font-semibold uppercase tracking-[0.18em] text-emerald-100/30">Phase 1 active</p></article>
        <article className="panel min-h-56"><div className="metric-icon metric-lime"><CalendarDays size={20} /></div><h2 className="mt-7 font-display text-2xl font-bold">What comes next</h2><p className="mt-2 max-w-md text-sm leading-6 text-emerald-100/45">Permanent squads begin in Phase 2. Match creation, live controls, and public experiences remain intentionally unavailable.</p><div className="mt-7 h-px bg-white/[0.07]" /><p className="mt-5 text-xs font-semibold uppercase tracking-[0.18em] text-lime-300/50">Scope protected</p></article>
      </section>

      <section className="panel mt-7">
        <div className="panel-heading"><div><p className="eyebrow">Team branding</p><h2 className="panel-title">Logo and cover photo</h2></div></div>
        <div className="grid gap-4 lg:grid-cols-2">
          <TeamBrandingUploader kind="logo" initialImage={team?.logo} uploadUrl="/team/profile/logo" deleteUrl="/team/profile/logo" />
          <TeamBrandingUploader kind="cover" initialImage={team?.coverPhoto} uploadUrl="/team/profile/cover" deleteUrl="/team/profile/cover" />
        </div>
      </section>
    </>
  );
}
