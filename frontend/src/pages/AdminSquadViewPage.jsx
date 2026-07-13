import { ArrowLeft, UserCheck, UsersRound } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import api from '../api/client.js';
import EmptyState from '../components/EmptyState.jsx';
import TeamIdentity from '../components/TeamIdentity.jsx';
import PlayerCard from '../features/squad/PlayerCard.jsx';

export default function AdminSquadViewPage() {
  const { teamId } = useParams();
  const [team, setTeam] = useState(null);
  const [players, setPlayers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadSquad = useCallback(async () => {
    try {
      const response = await api.get(`/admin/teams/${teamId}/players`);
      setTeam(response.data.data.team); setPlayers(response.data.data.players); setError('');
    } catch (requestError) { setError(requestError.userMessage); }
    finally { setLoading(false); }
  }, [teamId]);

  useEffect(() => { loadSquad(); }, [loadSquad]);
  const active = players.filter((player) => player.isActive);

  return (
    <>
      <Link to="/admin" className="inline-flex items-center gap-2 text-sm font-semibold text-emerald-100/50 transition hover:text-lime-200"><ArrowLeft size={16} /> Back to control room</Link>
      <header className="mt-7 flex flex-col justify-between gap-6 md:flex-row md:items-end">
        <div><p className="eyebrow">Read-only squad view</p><h1 className="page-title"><TeamIdentity team={team} name={team?.name || 'Team squad'} logoClassName="size-12 rounded-2xl" /></h1><p className="page-copy">Review the permanent squad without changing team-admin player records.</p></div>
        <div className="flex gap-3"><span className="metric-card py-3"><UsersRound size={18} className="text-lime-200" /><strong>{players.length}</strong><span className="text-xs text-emerald-100/40">records</span></span><span className="metric-card py-3"><UserCheck size={18} className="text-emerald-200" /><strong>{active.length}</strong><span className="text-xs text-emerald-100/40">active</span></span></div>
      </header>
      {error && <div className="mt-7 rounded-xl border border-red-300/20 bg-red-300/10 px-4 py-3 text-sm text-red-100" role="alert">{error}</div>}
      <section className="mt-8">
        {loading ? <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3"><div className="skeleton h-[25rem]" /><div className="skeleton h-[25rem]" /><div className="skeleton h-[25rem]" /></div> : players.length === 0 ? <EmptyState title="No players recorded" message="The assigned team administrator has not added permanent squad members yet." /> : <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">{players.map((player) => <PlayerCard key={player._id} player={player} readOnly statsPath={`/admin/players/${player._id}/statistics`} />)}</div>}
      </section>
    </>
  );
}
