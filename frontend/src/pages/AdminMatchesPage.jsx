import { Search } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import api from '../api/client.js';
import EmptyState from '../components/EmptyState.jsx';
import MatchCard from '../features/matches/MatchCard.jsx';
import { MATCH_STATUSES, MATCH_TYPES, label } from '../features/matches/constants.js';

export default function AdminMatchesPage() {
  const [matches, setMatches] = useState([]); const [teams, setTeams] = useState([]); const [loading, setLoading] = useState(true); const [error, setError] = useState('');
  const [filters, setFilters] = useState({ search: '', teamId: '', status: '', matchType: '', from: '', to: '' });
  const load = useCallback(async () => { try { const [matchesResponse, teamsResponse] = await Promise.all([api.get('/admin/matches', { params: Object.fromEntries(Object.entries(filters).filter(([, value]) => value)) }), api.get('/admin/teams')]); setMatches(matchesResponse.data.data.matches); setTeams(teamsResponse.data.data.teams); setError(''); } catch (requestError) { setError(requestError.userMessage); } finally { setLoading(false); } }, [filters]);
  useEffect(() => { const timer = setTimeout(load, 200); return () => clearTimeout(timer); }, [load]);
  const update = (field, value) => setFilters((current) => ({ ...current, [field]: value }));
  return <><header><p className="eyebrow">Organization fixtures</p><h1 className="page-title">All matches</h1><p className="page-copy">Read-only oversight of every team's scheduled, cancelled, and completed fixtures.</p></header>{error && <div className="mt-7 rounded-xl border border-red-300/20 bg-red-300/10 p-4 text-red-100">{error}</div>}
    <div className="mt-7 grid gap-3 rounded-2xl border border-white/[0.07] bg-white/[0.025] p-4 sm:grid-cols-2 xl:grid-cols-6"><label className="relative xl:col-span-2"><span className="sr-only">Search opponent</span><Search className="absolute left-3 top-1/2 -translate-y-1/2 text-emerald-100/30" size={16} /><input className="field-input pl-9" placeholder="Search opponent" value={filters.search} onChange={(e) => update('search', e.target.value)} /></label><select className="field-input" aria-label="Filter by team" value={filters.teamId} onChange={(e) => update('teamId', e.target.value)}><option value="">All teams</option>{teams.map((team) => <option key={team._id} value={team._id}>{team.name}</option>)}</select><select className="field-input" aria-label="Filter by status" value={filters.status} onChange={(e) => update('status', e.target.value)}><option value="">All statuses</option>{MATCH_STATUSES.map((status) => <option key={status} value={status}>{label(status)}</option>)}</select><select className="field-input" aria-label="Filter by type" value={filters.matchType} onChange={(e) => update('matchType', e.target.value)}><option value="">All types</option>{MATCH_TYPES.map((type) => <option key={type} value={type}>{label(type)}</option>)}</select><div className="grid grid-cols-2 gap-2"><input className="field-input px-2" type="date" aria-label="Matches from date" value={filters.from} onChange={(e) => update('from', e.target.value)} /><input className="field-input px-2" type="date" aria-label="Matches to date" value={filters.to} onChange={(e) => update('to', e.target.value)} /></div></div>
    <section className="mt-7">{loading ? <div className="grid gap-5 lg:grid-cols-2 xl:grid-cols-3"><div className="skeleton h-80" /><div className="skeleton h-80" /></div> : matches.length === 0 ? <EmptyState title="No matches found" message="No active match records match the selected filters." /> : <div className="grid gap-5 lg:grid-cols-2 xl:grid-cols-3">{matches.map((match) => <MatchCard key={match._id} match={match} basePath="/admin/matches" readOnly />)}</div>}</section>
  </>;
}

