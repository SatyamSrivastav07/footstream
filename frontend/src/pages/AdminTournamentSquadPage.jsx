import { useCallback, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import EmptyState from '../components/EmptyState.jsx';
import { tournamentApi, unwrapData } from '../features/tournaments/api.js';
import { StatusBadge, imageUrl } from '../features/tournaments/TournamentUi.jsx';
import { formatTournamentLabel } from '../features/tournaments/constants.js';

export default function AdminTournamentSquadPage() {
  const { tournamentId, participantId } = useParams();
  const [squad, setSquad] = useState(null);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [detail, timeline] = await Promise.all([
        tournamentApi.adminSquad(tournamentId, participantId),
        tournamentApi.adminSquadHistory(tournamentId, participantId).catch(() => ({ data: { data: { history: [] } } })),
      ]);
      setSquad(unwrapData(detail).squad);
      setHistory(unwrapData(timeline).history || []);
      setError('');
    } catch (requestError) {
      setError(requestError.userMessage);
    } finally {
      setLoading(false);
    }
  }, [participantId, tournamentId]);

  useEffect(() => { load(); }, [load]);

  if (loading) return <div className="skeleton h-96" />;
  if (error) return <div className="rounded-2xl border border-red-300/20 bg-red-300/10 p-5 text-red-100">{error}</div>;
  if (!squad) return <EmptyState title="Squad unavailable" message="This tournament squad could not be loaded." />;

  return <><header className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between"><div><p className="eyebrow">Read-only squad oversight</p><h1 className="page-title">{squad.participant?.displayName || 'Tournament squad'}</h1><p className="page-copy">{formatTournamentLabel(squad.status)} · {squad.playerCount} players · captain {squad.captain?.name || 'not set'}</p></div><Link className="secondary-button" to={`/admin/tournaments/${tournamentId}`}>Back</Link></header><section className="mt-7 grid gap-4 lg:grid-cols-2">{squad.players?.length ? squad.players.map((player) => <PlayerCard key={player.id} player={player} />) : <EmptyState title="No players" message="The host has not added players yet." />}</section><section className="mt-8"><h2 className="mb-4 font-display text-2xl font-black">Squad audit history</h2>{history.length ? <div className="space-y-3">{history.map((item) => <div key={item.id} className="rounded-2xl border border-white/10 p-4"><p className="font-bold">{formatTournamentLabel(item.action)}</p><p className="text-sm text-white/55">{item.safeMessage}</p></div>)}</div> : <EmptyState title="No history" message="Squad events will appear here." />}</section></>;
}

function PlayerCard({ player }) {
  const photo = imageUrl(player.photo);
  return <article className="rounded-2xl border border-white/10 p-4"><div className="flex gap-4">{photo ? <img src={photo} alt="" className="size-14 rounded-xl bg-black/20 object-contain" /> : <div className="grid size-14 place-items-center rounded-xl bg-lime-300/10 font-black text-lime-100">{player.name.slice(0, 2).toUpperCase()}</div>}<div><p className="font-bold">{player.name}</p><p className="text-sm text-white/45">{player.position} · #{player.jersey || '-'}</p><div className="mt-2 flex gap-2">{player.captain && <StatusBadge tone="lime">Captain</StatusBadge>}{player.viceCaptain && <StatusBadge>Vice</StatusBadge>}{player.goalkeeper && <StatusBadge>GK</StatusBadge>}</div></div></div></article>;
}
