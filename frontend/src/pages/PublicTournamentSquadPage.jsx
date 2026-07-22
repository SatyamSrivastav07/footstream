import { useCallback, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import EmptyState from '../components/EmptyState.jsx';
import { tournamentApi, unwrapData } from '../features/tournaments/api.js';
import { StatusBadge, imageUrl } from '../features/tournaments/TournamentUi.jsx';

export default function PublicTournamentSquadPage() {
  const { slug, participantSlug } = useParams();
  const [participant, setParticipant] = useState(null);
  const [squad, setSquad] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const response = await tournamentApi.getPublicSquad(slug, participantSlug);
      const data = unwrapData(response);
      setParticipant(data.participant);
      setSquad(data.squad);
      setError('');
    } catch (requestError) {
      setError(requestError.userMessage);
    } finally {
      setLoading(false);
    }
  }, [participantSlug, slug]);

  useEffect(() => { load(); }, [load]);

  if (loading) return <div className="skeleton h-96" />;
  if (error) return <div className="rounded-2xl border border-red-300/20 bg-red-300/10 p-5 text-red-100">{error}</div>;
  if (!participant) return <EmptyState title="Squad unavailable" message="This public squad could not be found." />;
  if (!squad) return <EmptyState title="Squad not announced yet" message="The tournament host has not published this squad yet." />;

  return <><header className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between"><div><p className="eyebrow">Tournament squad</p><h1 className="page-title">{participant.displayName}</h1><p className="page-copy">{squad.playerCount} players · Captain {squad.captain?.name || 'not announced'}</p></div><Link to={`/tournaments/${slug}`} className="secondary-button">Back to tournament</Link></header><section className="mt-7 grid gap-4 lg:grid-cols-2 xl:grid-cols-3">{squad.players.map((player) => <PlayerCard key={player.id} player={player} />)}</section></>;
}

function PlayerCard({ player }) {
  const photo = imageUrl(player.photo);
  return <article className="rounded-2xl border border-white/10 bg-white/[0.035] p-4"><div className="flex gap-4">{photo ? <img src={photo} alt="" className="size-16 rounded-xl bg-black/20 object-contain" loading="lazy" /> : <div className="grid size-16 place-items-center rounded-xl bg-lime-300/10 font-black text-lime-100">{player.name.slice(0, 2).toUpperCase()}</div>}<div><p className="font-bold">{player.name}</p><p className="text-sm text-white/45">{player.position} · #{player.jersey || '-'}</p><div className="mt-2 flex flex-wrap gap-2">{player.captain && <StatusBadge tone="lime">Captain</StatusBadge>}{player.viceCaptain && <StatusBadge>Vice Captain</StatusBadge>}{player.goalkeeper && <StatusBadge>Goalkeeper</StatusBadge>}</div></div></div></article>;
}
