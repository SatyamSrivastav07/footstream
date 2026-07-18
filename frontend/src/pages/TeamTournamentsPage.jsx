import { Plus, Search } from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import EmptyState from '../components/EmptyState.jsx';
import { tournamentApi, unwrapData } from '../features/tournaments/api.js';
import { TournamentCard, TournamentListState } from '../features/tournaments/TournamentUi.jsx';

const tabs = [
  ['all', 'My Hosted Tournaments', {}],
  ['drafts', 'Drafts', { approvalStatus: 'draft' }],
  ['pending', 'Pending Approval', { approvalStatus: 'approval_pending' }],
  ['approved', 'Approved', { approvalStatus: 'approved' }],
  ['ongoing', 'Ongoing', { lifecycleStatus: 'ongoing' }],
  ['completed', 'Completed', { lifecycleStatus: 'completed' }],
  ['archived', 'Archived', { lifecycleStatus: 'archived' }],
];

export default function TeamTournamentsPage() {
  const { filter = 'all' } = useParams();
  const active = tabs.find(([key]) => key === filter) || tabs[0];
  const [search, setSearch] = useState('');
  const [tournaments, setTournaments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const response = await tournamentApi.listHosted({ ...active[2], search: search || undefined });
      setTournaments(unwrapData(response).tournaments || []);
      setError('');
    } catch (requestError) { setError(requestError.userMessage); }
    finally { setLoading(false); }
  }, [active, search]);

  useEffect(() => { load(); }, [load]);

  const action = async (label, callback) => {
    try { await callback(); setNotice(label); await load(); }
    catch (requestError) { setError(requestError.userMessage); }
  };

  const visible = useMemo(() => tournaments, [tournaments]);
  return <>
    <header className="flex flex-col justify-between gap-5 md:flex-row md:items-end"><div><p className="eyebrow">Tournament command center</p><h1 className="page-title">Tournament</h1><p className="page-copy">Create, submit, publish, and manage hosted tournaments without touching match fixtures yet.</p></div><Link to="/team/tournaments/new" className="primary-button w-fit"><Plus size={17} /> Create Tournament</Link></header>
    <nav className="mt-7 flex flex-wrap gap-2" aria-label="Tournament filters">{tabs.map(([key, label]) => <Link key={key} to={key === 'all' ? '/team/tournaments' : `/team/tournaments/filter/${key}`} className={`rounded-full border px-4 py-2 text-sm font-bold ${active[0] === key ? 'border-lime-300/40 bg-lime-300/15 text-lime-100' : 'border-white/10 text-white/55 hover:text-white'}`}>{label}</Link>)}</nav>
    <form onSubmit={(event) => { event.preventDefault(); load(); }} className="mt-5 flex gap-3 rounded-2xl border border-white/[0.07] bg-white/[0.025] p-3"><label className="relative flex-1"><span className="sr-only">Search tournaments</span><Search className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30" size={16} /><input className="field-input pl-9" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search tournament, series, city" /></label><button className="secondary-button">Search</button></form>
    {(notice || error) && <div className={`mt-5 rounded-xl border px-4 py-3 text-sm ${error ? 'border-red-300/20 bg-red-300/10 text-red-100' : 'border-lime-300/15 bg-lime-300/10 text-lime-100'}`} role="status">{error || notice}</div>}
    <section className="mt-7">{loading || error ? <TournamentListState loading={loading} error={error} /> : visible.length === 0 ? <EmptyState title="No tournaments found" message="Create a tournament draft or adjust your filters." /> : <div className="grid gap-5 lg:grid-cols-2 xl:grid-cols-3">{visible.map((tournament) => <TournamentCard key={tournament.id || tournament._id} tournament={tournament} basePath="/team/tournaments" onSubmit={(id) => action('Tournament submitted for approval.', () => tournament.approvalStatus === 'changes_requested' ? tournamentApi.resubmit(id) : tournamentApi.submit(id))} onPublish={(id) => window.confirm('Publish this approved tournament publicly?') && action('Tournament published.', () => tournamentApi.publish(id))} onUnpublish={(id) => window.confirm('Unpublish this tournament?') && action('Tournament unpublished.', () => tournamentApi.unpublish(id))} onDelete={(id) => window.confirm('Delete this tournament draft permanently? This cannot be undone.') && action('Draft deleted permanently.', () => tournamentApi.deleteHosted(id))} />)}</div>}</section>
  </>;
}
