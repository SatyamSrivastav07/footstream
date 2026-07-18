import { Eye, Search } from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../api/client.js';
import EmptyState from '../components/EmptyState.jsx';
import PlayerAvatar from '../features/squad/PlayerAvatar.jsx';
import { ACADEMIC_YEARS, POSITIONS, statusClass, statusLabel } from '../features/joinRequests/joinRequestConstants.js';

const initialFilters = { status: '', position: '', academicYear: '', search: '' };

export default function TeamJoinRequestsPage() {
  const [data, setData] = useState(null);
  const [filters, setFilters] = useState(initialFilters);
  const [page, setPage] = useState(1);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const params = useMemo(() => ({ ...Object.fromEntries(Object.entries(filters).filter(([, value]) => value)), page, limit: 20 }), [filters, page]);
  const updateFilter = (field, value) => {
    setFilters((current) => ({ ...current, [field]: value }));
    setPage(1);
  };
  const load = useCallback(async () => {
    setLoading(true);
    try {
      const response = await api.get('/team/join-requests', { params });
      setData(response.data.data);
      setError('');
    } catch (requestError) {
      setError(requestError.userMessage);
    } finally {
      setLoading(false);
    }
  }, [params]);
  useEffect(() => { load(); }, [load]);
  const summary = data?.summary || { pending: 0, approved: 0, rejected: 0, total: 0 };
  return (
    <>
      <header>
        <p className="eyebrow">Recruitment</p>
        <h1 className="page-title">Join Requests</h1>
        <p className="page-copy">Review public applications and approve players into your official squad.</p>
      </header>
      {error && <div className="mt-6 rounded-xl border border-red-300/20 bg-red-300/10 px-4 py-3 text-sm text-red-100">{error}</div>}
      <section className="mt-7 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {Object.entries(summary).map(([key, value]) => <article key={key} className="rounded-2xl border border-white/[0.07] bg-white/[0.025] p-4"><p className="font-display text-3xl font-bold">{value}</p><p className="mt-1 capitalize text-xs text-white/40">{key}</p></article>)}
      </section>
      <section className="mt-7 rounded-2xl border border-white/[0.07] bg-white/[0.025] p-4">
        <div className="grid gap-3 md:grid-cols-[1fr_160px_160px_160px]">
          <label className="relative"><span className="sr-only">Search requests</span><Search className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30" size={16} /><input className="field-input pl-9" value={filters.search} onChange={(e) => updateFilter('search', e.target.value)} placeholder="Search applicant, email, or phone" /></label>
          <Filter value={filters.status} onChange={(value) => updateFilter('status', value)}><option value="">All statuses</option>{['pending', 'approved', 'rejected'].map((item) => <option key={item} value={item}>{statusLabel(item)}</option>)}</Filter>
          <Filter value={filters.position} onChange={(value) => updateFilter('position', value)}><option value="">All positions</option>{POSITIONS.map((item) => <option key={item}>{item}</option>)}</Filter>
          <Filter value={filters.academicYear} onChange={(value) => updateFilter('academicYear', value)}><option value="">All years</option>{ACADEMIC_YEARS.map((item) => <option key={item}>{item}</option>)}</Filter>
        </div>
      </section>
      <section className="mt-7">
        {loading ? <div className="skeleton h-64" /> : !data?.requests?.length ? <EmptyState title="No join requests" message="Public applications will appear here." /> : (
          <div className="grid gap-4 xl:grid-cols-2">
            {data.requests.map((request) => <RequestCard key={request._id} request={request} />)}
          </div>
        )}
        {data?.pagination?.pages > 1 && <div className="mt-6 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-white/[0.07] bg-white/[0.025] p-4">
          <p className="text-sm text-white/55">Page {data.pagination.page} of {data.pagination.pages} · {data.pagination.total} requests</p>
          <div className="flex gap-2">
            <button type="button" className="secondary-button" disabled={page <= 1 || loading} onClick={() => setPage((value) => Math.max(1, value - 1))}>Previous</button>
            <button type="button" className="secondary-button" disabled={page >= data.pagination.pages || loading} onClick={() => setPage((value) => value + 1)}>Next</button>
          </div>
        </div>}
      </section>
    </>
  );
}

function RequestCard({ request }) {
  return (
    <article className="rounded-3xl border border-white/[0.08] bg-white/[0.025] p-5">
      <div className="flex gap-4">
        <PlayerAvatar src={request.photoUrl} name={request.applicantName} className="size-20 shrink-0 rounded-2xl" />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div><h2 className="truncate font-display text-2xl font-bold">{request.applicantName}</h2><p className="mt-1 text-sm text-white/45">{request.position} · {request.age || 'Age not listed'} · {request.academicYear || 'No year'}</p></div>
            <span className={statusClass[request.status]}>{statusLabel(request.status)}</span>
          </div>
          <p className="mt-3 text-xs text-white/35">Applied {new Date(request.createdAt).toLocaleString()}</p>
          <Link className="secondary-button mt-4 w-fit" to={`/team/join-requests/${request._id}`}><Eye size={16} /> View</Link>
        </div>
      </div>
    </article>
  );
}

function Filter({ value, onChange, children }) {
  return <label><span className="sr-only">Join request filter</span><select className="field-input" value={value} onChange={(event) => onChange(event.target.value)}>{children}</select></label>;
}
