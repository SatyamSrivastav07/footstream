import { ArrowLeft } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import api from '../api/client.js';
import LoadingScreen from '../components/LoadingScreen.jsx';

export default function PlayerStatisticsPage({ audience = 'team' }) {
  const { playerId } = useParams();
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  useEffect(() => {
    api
      .get(`/${audience}/players/${playerId}/statistics`)
      .then((response) => setData(response.data.data))
      .catch((requestError) => setError(requestError.userMessage));
  }, [audience, playerId]);
  if (!data && !error) return <LoadingScreen />;
  if (!data) return <div className="text-red-200">{error}</div>;
  const labels = {
    matchesPlayed: 'Matches played',
    starts: 'Starts',
    substituteAppearances: 'Sub appearances',
    goals: 'Goals',
    assists: 'Assists',
    yellowCards: 'Yellow cards',
    redCards: 'Red cards',
    penaltiesScored: 'Penalties scored',
    penaltiesMissed: 'Penalties missed',
    penaltiesSaved: 'Penalties saved',
    ownGoals: 'Own goals',
    manOfTheMatchAwards: 'MOTM awards',
  };
  return (
    <>
      {audience !== 'public' && <Link className="inline-flex items-center gap-2 text-sm text-lime-200" to={audience === 'team' ? '/team/squad' : '/admin'}><ArrowLeft size={16} /> Back</Link>}
      <header className="mt-6">
        <p className="eyebrow">Career record</p>
        <h1 className="page-title">{data.player.name}</h1>
        <p className="page-copy">
          {data.player.position} · #{data.player.jerseyNumber || '—'} · {data.player.isActive ? 'Active' : 'Historical player'}
        </p>
      </header>
      <section className="mt-8 grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-4">
        {Object.entries(labels).map(([key, label]) => (
          <article className="panel" key={key}>
            <p className="font-display text-3xl font-bold text-lime-200">{data.statistics[key]}</p>
            <p className="mt-2 text-sm text-white/45">{label}</p>
          </article>
        ))}
      </section>
    </>
  );
}
