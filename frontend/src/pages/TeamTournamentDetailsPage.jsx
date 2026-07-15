import { Search, Trash2, UsersRound } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import EmptyState from '../components/EmptyState.jsx';
import { tournamentApi, unwrapData } from '../features/tournaments/api.js';
import { ReviewTimeline, StatusBadge, TournamentLogo, dateText } from '../features/tournaments/TournamentUi.jsx';
import { TOURNAMENT_PARTICIPANT_TYPE_LABEL, formatTournamentLabel } from '../features/tournaments/constants.js';

export default function TeamTournamentDetailsPage() {
  const { tournamentId } = useParams();
  const [tournament, setTournament] = useState(null);
  const [participants, setParticipants] = useState([]);
  const [available, setAvailable] = useState([]);
  const [history, setHistory] = useState([]);
  const [tab, setTab] = useState('registered');
  const [search, setSearch] = useState('');
  const [manual, setManual] = useState({ displayName: '', shortName: '', seed: '' });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [detail, participantResponse, historyResponse] = await Promise.all([tournamentApi.getHosted(tournamentId), tournamentApi.participants(tournamentId), tournamentApi.history(tournamentId)]);
      setTournament(unwrapData(detail).tournament);
      setParticipants(unwrapData(participantResponse).participants || []);
      setHistory(unwrapData(historyResponse).history || []);
      setError('');
    } catch (requestError) { setError(requestError.userMessage); }
    finally { setLoading(false); }
  }, [tournamentId]);
  useEffect(() => { load(); }, [load]);
  const searchTeams = async () => {
    try { const response = await tournamentApi.availableTeams(tournamentId, { search }); setAvailable(unwrapData(response).teams || []); }
    catch (requestError) { setError(requestError.userMessage); }
  };
  const addRegistered = async (teamId) => { await tournamentApi.addRegistered(tournamentId, { registeredTeam: teamId }); await load(); };
  const addManual = async () => { await (tab === 'external' ? tournamentApi.addExternal : tournamentApi.addIntra)(tournamentId, { ...manual, seed: manual.seed || undefined }); setManual({ displayName: '', shortName: '', seed: '' }); await load(); };
  const remove = async (participantId) => { if (window.confirm('Remove this participant?')) { await tournamentApi.removeParticipant(tournamentId, participantId); await load(); } };
  if (loading) return <div className="skeleton h-96" />;
  if (error) return <div className="rounded-2xl border border-red-300/20 bg-red-300/10 p-5 text-red-100">{error}</div>;
  if (!tournament) return <EmptyState title="Tournament not found" message="This tournament could not be loaded." />;
  return <><header className="flex flex-col gap-5 md:flex-row md:items-end md:justify-between"><div className="flex items-center gap-4"><TournamentLogo tournament={tournament} className="size-16" /><div><p className="eyebrow">Tournament detail</p><h1 className="page-title">{tournament.name}</h1><p className="page-copy">{tournament.seasonLabel} · {formatTournamentLabel(tournament.scope)} · {dateText(tournament.startDate)} - {dateText(tournament.endDate)}</p></div></div><div className="flex gap-2"><Link to={`/team/tournaments/${tournament.id}/edit`} className="secondary-button">Edit</Link><Link to={`/team/tournaments/${tournament.id}/history`} className="secondary-button">History</Link></div></header>
    <section className="mt-7 grid gap-5 lg:grid-cols-3"><Info title="Approval" value={formatTournamentLabel(tournament.approvalStatus)} /><Info title="Visibility" value={tournament.isPublished ? 'Published' : 'Unpublished'} /><Info title="Venue" value={`${tournament.primaryVenue || 'Venue not set'} · ${tournament.city || 'City not set'}`} /></section>
    <section className="mt-8 rounded-3xl border border-white/[0.08] bg-white/[0.035] p-6"><div className="flex items-center justify-between"><div><p className="eyebrow">Participant management</p><h2 className="font-display text-3xl font-black">Participants</h2></div><StatusBadge><UsersRound size={12} className="mr-1 inline" />{participants.length}</StatusBadge></div><div className="mt-5 flex flex-wrap gap-2">{['registered', 'external', 'intra'].map((item) => <button key={item} className={`rounded-full border px-4 py-2 text-sm font-bold ${tab === item ? 'border-lime-300/40 bg-lime-300/15 text-lime-100' : 'border-white/10 text-white/55'}`} onClick={() => setTab(item)}>{formatTournamentLabel(item)} Teams</button>)}</div>
      {tab === 'registered' ? <div className="mt-5"><div className="flex gap-3"><input className="field-input" placeholder="Search public registered teams" value={search} onChange={(e) => setSearch(e.target.value)} /><button className="secondary-button" onClick={searchTeams}><Search size={16} /> Search</button></div><div className="mt-4 grid gap-3 md:grid-cols-2">{available.length === 0 ? <p className="text-sm text-white/45">Search teams to add registered participants.</p> : available.map((team) => <button key={team.id} className="rounded-2xl border border-white/10 p-4 text-left hover:border-lime-300/30" onClick={() => addRegistered(team.id)}><strong>{team.name}</strong><span className="ml-2 text-white/40">{team.city}</span></button>)}</div></div> : <div className="mt-5 grid gap-3 md:grid-cols-[1fr_160px_100px_auto]"><input className="field-input" placeholder={`${formatTournamentLabel(tab)} team name`} value={manual.displayName} onChange={(e) => setManual({ ...manual, displayName: e.target.value })} /><input className="field-input" placeholder="Short name" value={manual.shortName} onChange={(e) => setManual({ ...manual, shortName: e.target.value })} /><input className="field-input" placeholder="Seed" value={manual.seed} onChange={(e) => setManual({ ...manual, seed: e.target.value })} /><button className="primary-button" onClick={addManual}>Add</button></div>}
      <div className="mt-6 grid gap-3 md:grid-cols-2">{participants.length === 0 ? <EmptyState title="No participants" message="Add registered, external, or intra teams." /> : participants.map((participant) => <article key={participant.id} className="flex items-center justify-between rounded-2xl border border-white/10 p-4"><div><p className="font-bold">{participant.displayName}</p><p className="text-xs text-white/45">{TOURNAMENT_PARTICIPANT_TYPE_LABEL[participant.participantType]} · {participant.status}</p></div><button className="icon-button" onClick={() => remove(participant.id)} aria-label={`Remove ${participant.displayName}`}><Trash2 size={16} /></button></article>)}</div></section>
    <section className="mt-8"><h2 className="mb-4 font-display text-3xl font-black">Recent Timeline</h2><ReviewTimeline history={history.slice(0, 4)} /></section>
  </>;
}
function Info({ title, value }) { return <div className="rounded-2xl border border-white/[0.08] bg-white/[0.035] p-5"><p className="eyebrow">{title}</p><p className="mt-2 text-lg font-bold">{value}</p></div>; }
