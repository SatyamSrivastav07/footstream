import { Search } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import EmptyState from '../components/EmptyState.jsx';
import { tournamentApi, unwrapData } from '../features/tournaments/api.js';
import { StatusBadge, TournamentLogo, approvalTone, dateText } from '../features/tournaments/TournamentUi.jsx';
import { TOURNAMENT_APPROVAL_STATUS_LABEL, formatTournamentLabel } from '../features/tournaments/constants.js';

const tabs = ['approval_pending', 'approved', 'changes_requested', 'rejected', 'suspended', 'archived'];

export default function AdminTournamentsPage() {
  const [status, setStatus] = useState('approval_pending');
  const [search, setSearch] = useState('');
  const [tournaments, setTournaments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const load = useCallback(async () => {
    setLoading(true);
    try { const response = await tournamentApi.listAdmin({ approvalStatus: status === 'archived' ? undefined : status, search: search || undefined }); setTournaments(unwrapData(response).tournaments || []); setError(''); }
    catch (requestError) { setError(requestError.userMessage); }
    finally { setLoading(false); }
  }, [status, search]);
  useEffect(() => { load(); }, [load]);
  return <><header><p className="eyebrow">Super admin tournament review</p><h1 className="page-title">Tournament Review</h1><p className="page-copy">Review, approve, request changes, suspend, and archive tournament submissions.</p></header><div className="mt-7 flex flex-wrap gap-2">{tabs.map((item) => <button key={item} className={`rounded-full border px-4 py-2 text-sm font-bold ${status === item ? 'border-lime-300/40 bg-lime-300/15 text-lime-100' : 'border-white/10 text-white/55'}`} onClick={() => setStatus(item)}>{TOURNAMENT_APPROVAL_STATUS_LABEL[item] || formatTournamentLabel(item)}</button>)}</div><form onSubmit={(event) => { event.preventDefault(); load(); }} className="mt-5 flex gap-3 rounded-2xl border border-white/[0.07] bg-white/[0.025] p-3"><input className="field-input" placeholder="Search tournament" value={search} onChange={(e) => setSearch(e.target.value)} /><button className="secondary-button"><Search size={16} /> Search</button></form><section className="mt-7">{loading ? <div className="skeleton h-80" /> : error ? <div className="rounded-2xl border border-red-300/20 bg-red-300/10 p-5 text-red-100">{error}</div> : tournaments.length === 0 ? <EmptyState title="No tournaments in this queue" message="Submissions will appear here." /> : <div className="grid gap-5 lg:grid-cols-2">{tournaments.map((tournament) => <article key={tournament.id} className="rounded-3xl border border-white/[0.08] bg-white/[0.035] p-5"><div className="flex items-center gap-4"><TournamentLogo tournament={tournament} /><div><h2 className="font-display text-2xl font-black">{tournament.name}</h2><p className="text-sm text-white/45">{tournament.seasonLabel} · Submitted {dateText(tournament.submittedAt)}</p></div></div><div className="mt-4 flex flex-wrap gap-2"><StatusBadge tone={approvalTone(tournament.approvalStatus)}>{TOURNAMENT_APPROVAL_STATUS_LABEL[tournament.approvalStatus]}</StatusBadge><StatusBadge>{formatTournamentLabel(tournament.scope)}</StatusBadge></div><div className="mt-5 flex flex-wrap gap-2"><Link to={`/admin/tournaments/${tournament.id}`} className="primary-button">Review</Link></div></article>)}</div>}</section></>;
}
