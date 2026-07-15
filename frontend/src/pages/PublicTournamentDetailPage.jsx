import { useCallback, useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import EmptyState from '../components/EmptyState.jsx';
import { tournamentApi, unwrapData } from '../features/tournaments/api.js';
import { TournamentLogo, dateText, imageUrl } from '../features/tournaments/TournamentUi.jsx';
import { formatTournamentLabel } from '../features/tournaments/constants.js';

export default function PublicTournamentDetailPage() {
  const { slug } = useParams();
  const [tournament, setTournament] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const load = useCallback(async () => { try { const response = await tournamentApi.getPublic(slug); setTournament(unwrapData(response).tournament); setError(''); } catch (requestError) { setError(requestError.userMessage); } finally { setLoading(false); } }, [slug]);
  useEffect(() => { load(); }, [load]);
  if (loading) return <div className="skeleton h-96" />;
  if (error) return <div className="rounded-2xl border border-red-300/20 bg-red-300/10 p-5 text-red-100">{error}</div>;
  if (!tournament) return <EmptyState title="Tournament unavailable" message="This public tournament could not be found." />;
  const cover = imageUrl(tournament.coverImage);
  return <><section className="overflow-hidden rounded-[2rem] border border-white/[0.08] bg-white/[0.035]"><div className="h-60 bg-emerald-950/80">{cover && <img src={cover} alt="" className="h-full w-full object-cover opacity-80" />}</div><div className="-mt-10 p-6"><TournamentLogo tournament={tournament} className="size-20" /><p className="eyebrow mt-5">{formatTournamentLabel(tournament.scope)}</p><h1 className="page-title">{tournament.name}</h1><p className="page-copy">{tournament.seasonLabel} · {dateText(tournament.startDate)} - {dateText(tournament.endDate)} · {tournament.primaryVenue}, {tournament.city}</p></div></section><section className="mt-8 grid gap-5 lg:grid-cols-3"><Info title="Competition" value={`${formatTournamentLabel(tournament.competitionFormat)} · ${tournament.matchFormat}`} /><Info title="Rules" value={`${tournament.playersOnField} players · squad ${tournament.minimumSquad}-${tournament.maximumSquad}`} /><Info title="Points" value={`${tournament.winPoints}/${tournament.drawPoints}/${tournament.lossPoints}`} /></section><section className="mt-8 rounded-3xl border border-white/[0.08] bg-white/[0.035] p-6"><h2 className="font-display text-3xl font-black">Participants</h2><p className="mt-2 text-white/50">Only confirmed participants are public. Groups, fixtures, standings, statistics, and awards are intentionally not shown yet.</p><div className="mt-5 grid gap-3 md:grid-cols-2">{(tournament.participants || []).length === 0 ? <EmptyState title="No confirmed participants yet" message="Participants will appear after confirmation." /> : tournament.participants.map((participant) => <article key={participant.id} className="rounded-2xl border border-white/10 p-4"><p className="font-bold">{participant.displayName}</p><p className="text-sm text-white/45">{formatTournamentLabel(participant.participantType)}</p></article>)}</div></section></>;
}
function Info({ title, value }) { return <div className="rounded-2xl border border-white/[0.08] bg-white/[0.035] p-5"><p className="eyebrow">{title}</p><p className="mt-2 text-lg font-bold">{value}</p></div>; }
