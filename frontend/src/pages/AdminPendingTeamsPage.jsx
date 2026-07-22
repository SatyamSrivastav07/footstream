import { ArrowRight, Search } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../api/client.js';
import EmptyState from '../components/EmptyState.jsx';

const statusClass = (status) => status === 'changesRequested' ? 'border-amber-300/20 bg-amber-300/10 text-amber-100' : 'status-neutral';
const label = (value = '') => value.replace(/([A-Z])/g, ' $1').replace(/^./, (char) => char.toUpperCase());

export default function AdminPendingTeamsPage() {
  const [filters, setFilters] = useState({ search: '', status: '', page: 1 });
  const [data, setData] = useState({ requests: [], pagination: { page: 1, pages: 1, total: 0 } });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = Object.fromEntries(Object.entries(filters).filter(([, value]) => value));
      const response = await api.get('/admin/teams/pending', { params });
      setData(response.data.data);
      setError('');
    } catch (requestError) {
      setError(requestError.userMessage || 'Unable to load pending teams.');
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
          <p className="eyebrow">Review queue</p>
          <h1 className="page-title">Pending Teams</h1>
          <p className="page-copy">Review new public registrations and change-requested teams before they become active.</p>
        </div>
        <Link className="secondary-button w-fit" to="/admin/teams">All Teams</Link>
      </header>

      <form onSubmit={(event) => { event.preventDefault(); load(); }} className="mt-7 grid gap-3 rounded-2xl border border-white/[0.07] bg-white/[0.025] p-4 md:grid-cols-[1fr_220px_auto]">
        <input className="field-input" placeholder="Search team, city, representative, email" value={filters.search} onChange={(event) => update({ search: event.target.value })} aria-label="Search pending teams" />
        <select className="field-input" value={filters.status} onChange={(event) => update({ status: event.target.value })} aria-label="Filter pending teams">
          <option value="">Pending + changes requested</option>
          <option value="pending">Pending</option>
          <option value="changesRequested">Changes requested</option>
        </select>
        <button className="primary-button"><Search size={16} /> Filter</button>
      </form>

      {error && <div className="mt-6 rounded-xl border border-red-300/20 bg-red-300/10 p-4 text-red-100" role="alert">{error}</div>}

      <section className="mt-6">
        {loading ? <div className="skeleton h-72" /> : data.requests.length === 0 ? (
          <EmptyState title="No pending teams" message="New registration requests and requested changes will appear here." />
        ) : (
          <div className="grid gap-4 lg:grid-cols-2">
            {data.requests.map((request) => (
              <article key={request.id} className="rounded-3xl border border-white/[0.08] bg-white/[0.035] p-5">
                <div className="flex items-start gap-4">
                  <div className="grid size-12 shrink-0 place-items-center overflow-hidden rounded-2xl border border-lime-300/15 bg-black/25">
                    {request.logoUrl ? <img src={request.logoUrl} alt="" className="size-full bg-black/20 object-contain" /> : <span className="font-display text-lg font-black text-lime-200">{request.teamName.slice(0, 1)}</span>}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="truncate font-display text-2xl font-black">{request.teamName}</h2>
                      <span className={`status-badge ${statusClass(request.status)}`}>{label(request.status)}</span>
                    </div>
                    <p className="mt-1 text-sm text-white/50">{request.city}, {request.country} · {request.teamType || 'Team representative'}</p>
                  </div>
                </div>
                <dl className="mt-5 grid gap-3 text-sm sm:grid-cols-2">
                  <Info label="Applicant" value={request.representativeName} />
                  <Info label="Contact" value={`${request.email} · ${request.phone}`} />
                  <Info label="Submitted" value={new Date(request.submittedAt).toLocaleString()} />
                  <Info label="Request code" value={request.requestCode} />
                </dl>
                {request.message && <p className="mt-4 rounded-2xl bg-black/15 p-3 text-sm text-white/55">{request.message}</p>}
                {request.changeRequestMessage && <p className="mt-4 rounded-2xl border border-amber-300/20 bg-amber-300/10 p-3 text-sm text-amber-100">{request.changeRequestMessage}</p>}
                <Link to={`/admin/team-requests/${request.id}`} className="primary-button mt-5 w-fit">Review <ArrowRight size={16} /></Link>
              </article>
            ))}
          </div>
        )}
      </section>
    </>
  );
}

function Info({ label, value }) {
  return <div><dt className="text-xs uppercase tracking-wider text-white/35">{label}</dt><dd className="mt-1 font-semibold text-emerald-50/75">{value || '—'}</dd></div>;
}
