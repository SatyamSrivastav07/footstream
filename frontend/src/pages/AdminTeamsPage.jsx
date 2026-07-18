import { Eye, Filter, Search } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../api/client.js';
import EmptyState from '../components/EmptyState.jsx';
import TeamIdentity from '../components/TeamIdentity.jsx';

const statuses = ['', 'approved', 'suspended', 'archived', 'pending', 'changesRequested', 'rejected'];
const sorts = [['newest', 'Newest'], ['oldest', 'Oldest'], ['alpha', 'Alphabetical']];
const label = (value = '') => value ? value.replace(/([A-Z])/g, ' $1').replace(/^./, (char) => char.toUpperCase()) : 'All';
const statusClass = (status) => status === 'approved' ? 'status-active' : status === 'suspended' || status === 'rejected' || status === 'archived' ? 'status-off' : 'status-neutral';

export default function AdminTeamsPage() {
  const [filters, setFilters] = useState({ search: '', status: '', teamType: '', sort: 'newest', page: 1 });
  const [data, setData] = useState({ teams: [], pagination: { page: 1, pages: 1, total: 0 } });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = Object.fromEntries(Object.entries(filters).filter(([, value]) => value !== '' && value !== null));
      if (filters.status === 'archived') params.includeArchived = true;
      const response = await api.get('/admin/teams', { params });
      setData(response.data.data);
      setError('');
    } catch (requestError) {
      setError(requestError.userMessage || 'Unable to load teams.');
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => { load(); }, [load]);

  const update = (patch) => setFilters((current) => ({ ...current, ...patch, page: patch.page || 1 }));

  return (
    <>
      <header className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
        <div>
          <p className="eyebrow">Super admin</p>
          <h1 className="page-title">All Teams</h1>
          <p className="page-copy">Search, filter, review, and manage every FootStream team without touching match history.</p>
        </div>
        <Link to="/admin/teams/pending" className="secondary-button w-fit">Pending Teams</Link>
      </header>

      <form onSubmit={(event) => { event.preventDefault(); load(); }} className="mt-7 grid gap-3 rounded-2xl border border-white/[0.07] bg-white/[0.025] p-4 lg:grid-cols-[1fr_170px_170px_160px_auto]">
        <label className="sr-only" htmlFor="team-search">Search teams</label>
        <input id="team-search" className="field-input" placeholder="Search team, organization, city, or admin" value={filters.search} onChange={(event) => update({ search: event.target.value })} />
        <select className="field-input" value={filters.status} onChange={(event) => update({ status: event.target.value })} aria-label="Filter by status">
          {statuses.map((status) => <option key={status || 'all'} value={status}>{status ? label(status) : 'All statuses'}</option>)}
        </select>
        <input className="field-input" placeholder="Team type" value={filters.teamType} onChange={(event) => update({ teamType: event.target.value })} aria-label="Filter by team type" />
        <select className="field-input" value={filters.sort} onChange={(event) => update({ sort: event.target.value })} aria-label="Sort teams">
          {sorts.map(([value, text]) => <option key={value} value={value}>{text}</option>)}
        </select>
        <button className="primary-button"><Search size={16} /> Filter</button>
      </form>

      {error && <div className="mt-6 rounded-xl border border-red-300/20 bg-red-300/10 p-4 text-red-100" role="alert">{error}</div>}

      <section className="mt-6">
        {loading ? <div className="skeleton h-72" /> : data.teams.length === 0 ? (
          <EmptyState title="No teams found" message="Adjust filters or create a team from the control room." />
        ) : (
          <div className="overflow-hidden rounded-3xl border border-white/[0.08]">
            <div className="hidden grid-cols-[1.4fr_1fr_.8fr_.8fr_.8fr_.8fr_auto] gap-3 bg-white/[0.04] p-4 text-xs font-bold uppercase tracking-wider text-white/35 lg:grid">
              <span>Team</span><span>Organization</span><span>Type</span><span>Status</span><span>Team admin</span><span>Players</span><span>Action</span>
            </div>
            <div className="divide-y divide-white/[0.07]">
              {data.teams.map((team) => (
                <article key={team.id} className="grid gap-3 p-4 lg:grid-cols-[1.4fr_1fr_.8fr_.8fr_.8fr_.8fr_auto] lg:items-center">
                  <div className="min-w-0">
                    <TeamIdentity team={team} logoClassName="size-10 rounded-xl" />
                    <p className="mt-1 text-xs text-emerald-100/45">{team.city || team.location || 'Location not set'} · {new Date(team.createdAt).toLocaleDateString()}</p>
                  </div>
                  <Info value={team.organization || team.college || '—'} />
                  <Info value={team.teamType || '—'} />
                  <span className={`status-badge ${statusClass(team.status)}`}>{label(team.status)}</span>
                  <Info value={team.teamAdmin?.name || 'Unassigned'} />
                  <Info value={`${team.activePlayerCount}/${team.playerCount}`} />
                  <Link to={`/admin/teams/${team.id}`} className="primary-button w-fit px-3" aria-label={`View ${team.name}`}><Eye size={16} /> View</Link>
                </article>
              ))}
            </div>
          </div>
        )}
      </section>

      <div className="mt-5 flex flex-wrap items-center justify-between gap-3 text-sm text-white/50">
        <span><Filter size={14} className="inline" /> {data.pagination.total || 0} teams</span>
        <div className="flex gap-2">
          <button type="button" className="secondary-button px-3" disabled={filters.page <= 1} onClick={() => update({ page: filters.page - 1 })}>Previous</button>
          <span className="rounded-xl border border-white/10 px-3 py-2 font-semibold">Page {data.pagination.page || filters.page} of {data.pagination.pages || 1}</span>
          <button type="button" className="secondary-button px-3" disabled={(data.pagination.page || 1) >= (data.pagination.pages || 1)} onClick={() => update({ page: filters.page + 1 })}>Next</button>
        </div>
      </div>
    </>
  );
}

function Info({ value }) {
  return <span className="text-sm font-semibold text-emerald-50/70">{value}</span>;
}
