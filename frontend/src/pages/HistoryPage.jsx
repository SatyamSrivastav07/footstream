import { useCallback, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import api from '../api/client.js';
import LoadingScreen from '../components/LoadingScreen.jsx';

export default function HistoryPage({ audience = 'team' }) {
  const { teamId } = useParams();
  const [history, setHistory] = useState(null);
  const [filters, setFilters] = useState({
    opponent: '',
    tournament: '',
    outcome: '',
    from: '',
    to: '',
  });
  const [error, setError] = useState('');
  const base = audience === 'team' ? '/team' : `/${audience}/teams/${teamId}`;
  const load = useCallback(async () => {
    try {
      const response = await api.get(`${base}/history`, {
        params: Object.fromEntries(Object.entries(filters).filter(([, value]) => value)),
      });
      setHistory(response.data.data.history);
      setError('');
    } catch (requestError) {
      setError(requestError.userMessage);
    }
  }, [base, filters]);
  useEffect(() => {
    const timer = setTimeout(load, 200);
    return () => clearTimeout(timer);
  }, [load]);
  if (!history && !error) return <LoadingScreen />;
  return (
    <>
      <header>
        <p className="eyebrow">Completed fixtures</p>
        <h1 className="page-title">Match history</h1>
        <p className="page-copy">Review final scorelines and result metadata, newest first.</p>
      </header>
      <section className="mt-7 grid gap-3 rounded-2xl border border-white/[0.07] bg-white/[0.025] p-4 sm:grid-cols-2 xl:grid-cols-5">
        <input className="field-input" placeholder="Opponent" value={filters.opponent} onChange={(e) => setFilters({ ...filters, opponent: e.target.value })} />
        <input className="field-input" placeholder="Tournament" value={filters.tournament} onChange={(e) => setFilters({ ...filters, tournament: e.target.value })} />
        <select className="field-input" value={filters.outcome} onChange={(e) => setFilters({ ...filters, outcome: e.target.value })}>
          <option value="">All outcomes</option>
          <option value="win">Wins</option>
          <option value="draw">Draws</option>
          <option value="loss">Losses</option>
        </select>
        <input className="field-input" type="date" value={filters.from} onChange={(e) => setFilters({ ...filters, from: e.target.value })} />
        <input className="field-input" type="date" value={filters.to} onChange={(e) => setFilters({ ...filters, to: e.target.value })} />
      </section>
      {error && <div className="mt-6 text-red-200">{error}</div>}
      <section className="mt-7 space-y-3">
        {history?.map((item) => (
          <article className="list-card" key={item.matchId}>
            <span className={`status-badge ${item.outcome === 'win' ? 'status-active' : item.outcome === 'loss' ? 'status-off' : 'status-neutral'}`}>{item.outcome}</span>
            <div className="min-w-0 flex-1">
              <h2 className="font-semibold">vs {item.opponentName}</h2>
              <p className="mt-1 text-xs text-white/40">
                {new Date(item.scheduledAt).toLocaleDateString()} · {item.tournament || 'No tournament'} · {item.venue}
              </p>
            </div>
            <strong className="font-display text-2xl">
              {item.finalTeamScore}–{item.finalOpponentScore}
            </strong>
            <Link
              className="secondary-button px-3 py-2"
              to={audience === 'team' ? `/team/matches/${item.matchId}/result` : audience === 'admin' ? `/admin/matches/${item.matchId}/result` : `/matches/${item.matchId}/result`}
            >
              Result
            </Link>
          </article>
        ))}
        {history?.length === 0 && <div className="panel text-sm text-white/40">No completed matches match these filters.</div>}
      </section>
    </>
  );
}
