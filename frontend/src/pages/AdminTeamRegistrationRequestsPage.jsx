import { Eye, Search } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../api/client.js';
import EmptyState from '../components/EmptyState.jsx';

export default function AdminTeamRegistrationRequestsPage() {
  const [requests, setRequests] = useState([]);
  const [filters, setFilters] = useState({ status: '', search: '' });
  const [applied, setApplied] = useState(filters);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = Object.fromEntries(Object.entries(applied).filter(([, value]) => value));
      const response = await api.get('/admin/team-registration-requests', { params });
      setRequests(response.data.data.requests);
      setError('');
    } catch (requestError) { setError(requestError.userMessage); }
    finally { setLoading(false); }
  }, [applied]);
  useEffect(() => { load(); }, [load]);
  const submit = (event) => { event.preventDefault(); setApplied(filters); };
  return <><header><p className="eyebrow">Super admin review</p><h1 className="page-title">Team Requests</h1><p className="page-copy">Review public club/team requests to join FootStream.</p></header>
    <form onSubmit={submit} className="mt-6 grid gap-3 rounded-2xl border border-white/[0.07] bg-white/[0.025] p-4 md:grid-cols-[1fr_180px_auto]">
      <input className="field-input" placeholder="Search team, city, representative" value={filters.search} onChange={(event) => setFilters({ ...filters, search: event.target.value })} />
      <select className="field-input" value={filters.status} onChange={(event) => setFilters({ ...filters, status: event.target.value })}><option value="">All statuses</option><option value="pending">Pending</option><option value="changesRequested">Changes requested</option><option value="approved">Approved</option><option value="rejected">Rejected</option></select>
      <button className="primary-button"><Search size={16} /> Filter</button>
    </form>
    {error && <div className="mt-6 rounded-xl border border-red-300/20 bg-red-300/10 p-4 text-red-100">{error}</div>}
    <section className="mt-6">{loading ? <div className="skeleton h-64" /> : requests.length === 0 ? <EmptyState title="No team requests" message="Public team registration requests will appear here." /> : <div className="overflow-hidden rounded-3xl border border-white/[0.08]"><table className="w-full text-left text-sm"><thead className="bg-white/[0.04] text-xs uppercase tracking-wider text-white/35"><tr><th className="p-4">Team</th><th className="p-4">Location</th><th className="p-4">Representative</th><th className="p-4">Status</th><th className="p-4">Submitted</th><th className="p-4">Action</th></tr></thead><tbody>{requests.map((request) => <tr key={request._id} className="border-t border-white/[0.07]"><td className="p-4 font-semibold">{request.teamName}</td><td className="p-4 text-white/55">{request.city}, {request.country}</td><td className="p-4 text-white/55">{request.representativeName}</td><td className="p-4"><span className="status-badge status-neutral">{request.status}</span></td><td className="p-4 text-white/45">{new Date(request.submittedAt).toLocaleDateString()}</td><td className="p-4"><Link className="icon-button" to={`/admin/team-requests/${request._id}`} aria-label={`View ${request.teamName}`}><Eye size={16} /></Link></td></tr>)}</tbody></table></div>}</section>
  </>;
}
