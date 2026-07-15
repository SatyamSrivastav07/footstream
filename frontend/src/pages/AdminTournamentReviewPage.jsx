import { useCallback, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { tournamentApi, unwrapData } from '../features/tournaments/api.js';
import { ReviewTimeline, StatusBadge, TournamentLogo, approvalTone, dateText } from '../features/tournaments/TournamentUi.jsx';
import { formatTournamentLabel } from '../features/tournaments/constants.js';

export default function AdminTournamentReviewPage() {
  const { tournamentId } = useParams();
  const [tournament, setTournament] = useState(null);
  const [history, setHistory] = useState([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const load = useCallback(async () => {
    setLoading(true);
    try { const [detail, timeline] = await Promise.all([tournamentApi.getAdmin(tournamentId), tournamentApi.adminHistory(tournamentId)]); setTournament(unwrapData(detail).tournament); setHistory(unwrapData(timeline).history || []); setError(''); }
    catch (requestError) { setError(requestError.userMessage); }
    finally { setLoading(false); }
  }, [tournamentId]);
  useEffect(() => { load(); }, [load]);
  const reason = (fallback) => window.prompt('Reason/message', fallback);
  const act = async (callback) => { try { await callback(); await load(); } catch (requestError) { setError(requestError.userMessage); } };
  if (loading) return <div className="skeleton h-96" />;
  if (error) return <div className="rounded-2xl border border-red-300/20 bg-red-300/10 p-5 text-red-100">{error}</div>;
  return <><header className="flex flex-col justify-between gap-5 md:flex-row md:items-end"><div className="flex items-center gap-4"><TournamentLogo tournament={tournament} className="size-16" /><div><p className="eyebrow">Tournament review</p><h1 className="page-title">{tournament.name}</h1><p className="page-copy">{tournament.seasonLabel} · {dateText(tournament.startDate)} - {dateText(tournament.endDate)}</p></div></div><Link to="/admin/tournaments" className="secondary-button">Back</Link></header><section className="mt-7 grid gap-5 lg:grid-cols-3"><Info title="Status" value={<StatusBadge tone={approvalTone(tournament.approvalStatus)}>{formatTournamentLabel(tournament.approvalStatus)}</StatusBadge>} /><Info title="Host" value={tournament.hostTeam || 'Host team'} /><Info title="Venue" value={`${tournament.primaryVenue} · ${tournament.city}`} /></section><section className="mt-7 rounded-3xl border border-white/[0.08] bg-white/[0.035] p-6"><h2 className="font-display text-3xl font-black">Action Panel</h2><div className="mt-5 flex flex-wrap gap-2"><button className="primary-button" onClick={() => act(() => tournamentApi.approve(tournament.id))}>Approve</button><button className="secondary-button" onClick={() => { const value = reason('Please revise the details.'); if (value) act(() => tournamentApi.requestChanges(tournament.id, value)); }}>Request Changes</button><button className="secondary-button border-red-300/20 text-red-100" onClick={() => { const value = reason('Not approved.'); if (value) act(() => tournamentApi.reject(tournament.id, value)); }}>Reject</button><button className="secondary-button" onClick={() => { const value = reason('Suspended for review.'); if (value) act(() => tournamentApi.suspend(tournament.id, value)); }}>Suspend</button><button className="secondary-button" onClick={() => { const value = reason('Archive reason'); if (value) act(() => tournamentApi.archive(tournament.id, value)); }}>Archive</button></div></section><section className="mt-7 grid gap-5 lg:grid-cols-2"><Panel title="Overview"><p>{tournament.description || 'No description.'}</p><p>{formatTournamentLabel(tournament.scope)} · {formatTournamentLabel(tournament.competitionFormat)} · {tournament.matchFormat}</p></Panel><Panel title="Rules"><p>{tournament.playersOnField} players · Squad {tournament.minimumSquad}-{tournament.maximumSquad}</p><p>Points {tournament.winPoints}/{tournament.drawPoints}/{tournament.lossPoints}</p></Panel><Panel title="Participants"><p>{tournament.participants?.length || 0} confirmed participants shown when public.</p></Panel><Panel title="Timeline"><ReviewTimeline history={history} /></Panel></section></>;
}
function Info({ title, value }) { return <div className="rounded-2xl border border-white/[0.08] bg-white/[0.035] p-5"><p className="eyebrow">{title}</p><div className="mt-2 text-lg font-bold">{value}</div></div>; }
function Panel({ title, children }) { return <div className="rounded-3xl border border-white/[0.08] bg-white/[0.035] p-6"><h2 className="mb-3 font-display text-2xl font-black">{title}</h2><div className="space-y-2 text-white/65">{children}</div></div>; }
