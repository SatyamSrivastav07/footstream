import { Plus, Search } from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../api/client.js';
import EmptyState from '../components/EmptyState.jsx';
import MatchCard from '../features/matches/MatchCard.jsx';
import { MATCH_STATUSES, MATCH_TYPES, label } from '../features/matches/constants.js';

export default function TeamMatchesPage() {
  const [matches, setMatches] = useState([]);
  const [filters, setFilters] = useState({ search: '', status: '', matchType: '' });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const load = useCallback(async () => {
    try { const response = await api.get('/team/matches'); setMatches(response.data.data.matches); setError(''); }
    catch (requestError) { setError(requestError.userMessage); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { load(); }, [load]);

  const filtered = useMemo(() => matches.filter((match) =>
    match.opponent.name.toLowerCase().includes(filters.search.toLowerCase()) &&
    (!filters.status || match.status === filters.status) &&
    (!filters.matchType || match.matchType === filters.matchType),
  ), [matches, filters]);

  const cancel = async (match) => {
    if (!window.confirm(`Cancel the scheduled match against ${match.opponent.name}?`)) return;
    try { await api.patch(`/team/matches/${match._id}/cancel`); setNotice('Match cancelled.'); await load(); }
    catch (requestError) { setError(requestError.userMessage); }
  };
  const remove = async (match) => {
    if (!window.confirm(`Delete the scheduled match against ${match.opponent.name}? This removes it from all match lists.`)) return;
    try { await api.delete(`/team/matches/${match._id}`); setNotice('Scheduled match deleted.'); await load(); }
    catch (requestError) { setError(requestError.userMessage); }
  };

  const sections = [
    ['Upcoming matches', filtered.filter((match) => match.status === 'scheduled')],
    ['Cancelled matches', filtered.filter((match) => match.status === 'cancelled')],
    ['Completed matches', filtered.filter((match) => match.status === 'completed')],
  ];

  return <>
    <header className="flex flex-col justify-between gap-6 md:flex-row md:items-end"><div><p className="eyebrow">Match preparation</p><h1 className="page-title">Matches</h1><p className="page-copy">Schedule fixtures and lock match-day squads from your permanent player pool.</p></div><Link to="/team/matches/new" className="primary-button w-fit"><Plus size={17} /> Create match</Link></header>
    {(error || notice) && <div className={`mt-7 rounded-xl border px-4 py-3 text-sm ${error ? 'border-red-300/20 bg-red-300/10 text-red-100' : 'border-lime-300/15 bg-lime-300/[0.07] text-lime-100'}`} role="status">{error || notice}</div>}
    <div className="mt-7 grid gap-3 rounded-2xl border border-white/[0.07] bg-white/[0.025] p-4 sm:grid-cols-3"><label className="relative"><span className="sr-only">Search opponents</span><Search className="absolute left-3 top-1/2 -translate-y-1/2 text-emerald-100/30" size={16} /><input className="field-input pl-9" placeholder="Search opponent" value={filters.search} onChange={(e) => setFilters({ ...filters, search: e.target.value })} /></label><select className="field-input" aria-label="Filter matches by status" value={filters.status} onChange={(e) => setFilters({ ...filters, status: e.target.value })}><option value="">All statuses</option>{MATCH_STATUSES.map((status) => <option key={status} value={status}>{label(status)}</option>)}</select><select className="field-input" aria-label="Filter matches by type" value={filters.matchType} onChange={(e) => setFilters({ ...filters, matchType: e.target.value })}><option value="">All match types</option>{MATCH_TYPES.map((type) => <option key={type} value={type}>{label(type)}</option>)}</select></div>
    {loading ? <div className="mt-7 grid gap-5 lg:grid-cols-2 xl:grid-cols-3"><div className="skeleton h-80" /><div className="skeleton h-80" /><div className="skeleton h-80" /></div> : matches.length === 0 ? <div className="mt-7"><EmptyState title="No matches scheduled" message="Create the first fixture after at least 11 players are active and available." /></div> : filtered.length === 0 ? <div className="mt-7"><EmptyState title="No matches match these filters" message="Adjust the opponent search, status, or match type." /></div> : sections.map(([title, items]) => items.length > 0 && <section key={title} className="mt-9"><div className="mb-4 flex items-center justify-between"><h2 className="font-display text-2xl font-bold text-white">{title}</h2><span className="count-pill">{items.length}</span></div><div className="grid gap-5 lg:grid-cols-2 xl:grid-cols-3">{items.map((match) => <MatchCard key={match._id} match={match} basePath="/team/matches" onCancel={cancel} onDelete={remove} />)}</div></section>)}
  </>;
}
