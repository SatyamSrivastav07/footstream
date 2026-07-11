import { Award, Goal, Shield, Trophy } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import api from '../api/client.js';
import LoadingScreen from '../components/LoadingScreen.jsx';

const boardTypes = [
  { key: 'goals', label: 'Goals' },
  { key: 'assists', label: 'Assists' },
  { key: 'appearances', label: 'Appearances' },
  { key: 'motm', label: 'MOTM' },
];

export default function StatisticsPage({ audience = 'team' }) {
  const { teamId } = useParams();
  const [statistics, setStatistics] = useState(null);
  const [boards, setBoards] = useState({});
  const [error, setError] = useState('');
  const base = audience === 'team' ? '/team' : `/${audience}/${audience === 'admin' ? 'teams/' : 'teams/'}${teamId}`;
  const load = useCallback(async () => {
    try {
      const [stats, ...lists] = await Promise.all([api.get(`${base}/statistics`), ...boardTypes.map(({ key }) => api.get(`${base}/leaderboards`, { params: { type: key, limit: 10 } }))]);
      setStatistics(stats.data.data.statistics);
      setBoards(Object.fromEntries(boardTypes.map(({ key }, index) => [key, lists[index].data.data.items])));
      setError('');
    } catch (requestError) {
      setError(requestError.userMessage);
    }
  }, [base]);
  useEffect(() => {
    load();
  }, [load]);
  if (!statistics && !error) return <LoadingScreen />;
  return (
    <>
      <header>
        <p className="eyebrow">Verified completed matches</p>
        <h1 className="page-title">Team statistics</h1>
        <p className="page-copy">Every number is rebuilt from final results, saved lineups, and active match events.</p>
      </header>
      {error && <ErrorBox error={error} />}
      {statistics && (
        <>
          <section className="mt-8 grid grid-cols-2 gap-3 lg:grid-cols-4">
            <Metric label="Played" value={statistics.matchesPlayed} icon={Shield} />
            <Metric label="Record" value={`${statistics.wins}-${statistics.draws}-${statistics.losses}`} icon={Trophy} />
            <Metric label="Goal difference" value={statistics.goalDifference > 0 ? `+${statistics.goalDifference}` : statistics.goalDifference} icon={Goal} />
            <Metric label="Win rate" value={`${statistics.winPercentage}%`} icon={Award} />
          </section>
          <section className="mt-8 grid gap-5 xl:grid-cols-2">
            {boardTypes.map((board) => (
              <Leaderboard key={board.key} title={board.label} items={boards[board.key] || []} audience={audience} />
            ))}
          </section>
        </>
      )}
    </>
  );
}
function Metric({ label, value, icon: Icon }) {
  return (
    <article className="panel">
      <Icon className="text-lime-300" size={20} />
      <p className="mt-5 font-display text-3xl font-bold">{value}</p>
      <p className="mt-1 text-sm text-emerald-100/45">{label}</p>
    </article>
  );
}
function Leaderboard({ title, items, audience }) {
  return (
    <article className="panel">
      <div className="panel-heading">
        <h2 className="panel-title">{title}</h2>
        <span className="count-pill">Top {items.length}</span>
      </div>
      <div className="space-y-2">
        {items.length ? (
          items.map((item, index) => (
            <div className="list-card" key={item.playerId}>
              <span className="font-display text-xl font-bold text-lime-300">{index + 1}</span>
              <div className="min-w-0 flex-1">
                <p className="truncate font-semibold">{item.name}</p>
                <p className="text-xs text-white/40">
                  {item.position} · #{item.jerseyNumber || '—'}
                </p>
              </div>
              <strong className="text-xl">{item.value}</strong>
              {audience !== 'admin' && (
                <Link className="text-xs font-semibold text-lime-200" to={audience === 'team' ? `/team/players/${item.playerId}/statistics` : `/players/${item.playerId}/stats`}>
                  View
                </Link>
              )}
            </div>
          ))
        ) : (
          <p className="text-sm text-white/40">No completed-match data yet.</p>
        )}
      </div>
    </article>
  );
}
function ErrorBox({ error }) {
  return <div className="mt-6 rounded-xl border border-red-300/20 bg-red-300/10 p-4 text-red-100">{error}</div>;
}
