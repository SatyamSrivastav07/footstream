import { FileText, RefreshCw } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { tournamentApi, unwrapData } from '../features/tournaments/api.js';
import { ReviewTimeline, StatusBadge, TournamentLogo, approvalTone, dateText } from '../features/tournaments/TournamentUi.jsx';
import { formatTournamentLabel } from '../features/tournaments/constants.js';

export default function AdminTournamentReviewPage() {
  const { tournamentId } = useParams();
  const [tournament, setTournament] = useState(null);
  const [history, setHistory] = useState([]);
  const [squadRows, setSquadRows] = useState([]);
  const [lineups, setLineups] = useState([]);
  const [fixtures, setFixtures] = useState([]);
  const [standings, setStandings] = useState([]);
  const [awards, setAwards] = useState({});
  const [stats, setStats] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [detail, timeline, squadsResponse, lineupResponse, fixturesResponse, standingsResponse, awardsResponse, statsResponse] = await Promise.all([
        tournamentApi.getAdmin(tournamentId),
        tournamentApi.adminHistory(tournamentId),
        tournamentApi.adminSquads(tournamentId),
        tournamentApi.adminLineups(tournamentId),
        tournamentApi.adminFixtures(tournamentId),
        tournamentApi.adminStandings(tournamentId),
        tournamentApi.adminAwards(tournamentId),
        tournamentApi.adminTournamentStats(tournamentId),
      ]);
      setTournament(unwrapData(detail).tournament);
      setHistory(unwrapData(timeline).history || []);
      setSquadRows(unwrapData(squadsResponse).squads || []);
      setLineups(unwrapData(lineupResponse).lineups || []);
      setFixtures(unwrapData(fixturesResponse).fixtures || []);
      setStandings(unwrapData(standingsResponse).standings || []);
      setAwards(unwrapData(awardsResponse).awards || {});
      setStats(unwrapData(statsResponse));
      setError('');
    } catch (requestError) {
      setError(requestError.userMessage);
    } finally {
      setLoading(false);
    }
  }, [tournamentId]);

  useEffect(() => { load(); }, [load]);

  const reason = (fallback) => window.prompt('Reason/message', fallback);
  const act = async (callback) => {
    setSaving(true);
    try {
      await callback();
      await load();
    } catch (requestError) {
      setError(requestError.userMessage);
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="skeleton h-96" role="status" aria-label="Loading tournament review" />;
  if (error && !tournament) return <ErrorState error={error} onRetry={load} />;
  if (!tournament) return <ErrorState error="Tournament not found." onRetry={load} />;

  const pending = tournament.approvalStatus === 'approval_pending' && !tournament.isArchived;
  const approved = tournament.approvalStatus === 'approved' && !tournament.isArchived;
  const suspended = tournament.approvalStatus === 'suspended' && !tournament.isArchived;
  const canArchive = ['approved', 'rejected', 'suspended'].includes(tournament.approvalStatus) && !tournament.isArchived;

  return (
    <>
      <header className="flex flex-col justify-between gap-5 md:flex-row md:items-end">
        <div className="flex items-center gap-4">
          <TournamentLogo tournament={tournament} className="size-16" />
          <div className="min-w-0">
            <p className="eyebrow">Tournament review</p>
            <h1 className="page-title truncate">{tournament.name}</h1>
            <p className="page-copy">{tournament.seasonLabel || 'Season not set'} · {dateText(tournament.startDate)} - {dateText(tournament.endDate)}</p>
          </div>
        </div>
        <div className="flex gap-2">
          <a href={tournamentApi.adminReportUrl(tournament.id)} target="_blank" rel="noopener noreferrer" className="secondary-button"><FileText size={16} /> Report</a>
          <Link to="/admin/tournaments" className="secondary-button">Back</Link>
        </div>
      </header>

      {error && <div className="mt-6 rounded-2xl border border-red-300/20 bg-red-300/10 p-4 text-red-100" role="alert">{error}</div>}

      <section className="mt-7 grid gap-5 lg:grid-cols-3">
        <Info title="Status" value={<StatusBadge tone={approvalTone(tournament.approvalStatus)}>{formatTournamentLabel(tournament.approvalStatus)}</StatusBadge>} />
        <Info title="Host" value={tournament.hostTeam || 'Host team'} />
        <Info title="Venue" value={`${tournament.primaryVenue || 'Venue not set'} · ${tournament.city || 'City not set'}`} />
      </section>

      <section className="mt-7 rounded-3xl border border-white/[0.08] bg-white/[0.035] p-6">
        <h2 className="font-display text-3xl font-black">Action Panel</h2>
        {tournament.isArchived ? <p className="mt-3 text-sm text-white/55">Archived tournaments are read-only.</p> : null}
        <div className="mt-5 flex flex-wrap gap-2">
          {pending && <button type="button" className="primary-button" disabled={saving} onClick={() => act(() => tournamentApi.approve(tournament.id))}>Approve</button>}
          {pending && <button type="button" className="secondary-button" disabled={saving} onClick={() => { const value = reason('Please revise the details.'); if (value) act(() => tournamentApi.requestChanges(tournament.id, value)); }}>Request Changes</button>}
          {pending && <button type="button" className="secondary-button border-red-300/20 text-red-100" disabled={saving} onClick={() => { const value = reason('Not approved.'); if (value) act(() => tournamentApi.reject(tournament.id, value)); }}>Reject</button>}
          {approved && <button type="button" className="secondary-button" disabled={saving} onClick={() => { const value = reason('Suspended for review.'); if (value) act(() => tournamentApi.suspend(tournament.id, value)); }}>Suspend</button>}
          {suspended && <button type="button" className="secondary-button" disabled={saving} onClick={() => act(() => tournamentApi.unsuspend(tournament.id))}>Unsuspend</button>}
          {canArchive && <button type="button" className="secondary-button" disabled={saving} onClick={() => { const value = reason('Archive reason'); if (value) act(() => tournamentApi.archive(tournament.id, value)); }}>Archive</button>}
          {!pending && !approved && !suspended && !canArchive && <p className="text-sm text-white/50">No review actions are available for this status.</p>}
        </div>
      </section>

      <section className="mt-7 grid gap-5 lg:grid-cols-2">
        <Panel title="Overview"><p>{tournament.description || 'No description.'}</p><p>{formatTournamentLabel(tournament.scope)} · {formatTournamentLabel(tournament.competitionFormat)} · {tournament.matchFormat}</p></Panel>
        <Panel title="Rules"><p>{tournament.playersOnField} players · Squad {tournament.minimumSquad}-{tournament.maximumSquad}</p><p>Points {tournament.winPoints}/{tournament.drawPoints}/{tournament.lossPoints}</p></Panel>
        <Panel title="Squads">
          {squadRows.length === 0 ? <p>No participant squads yet.</p> : squadRows.map((row) => (
            <Link key={row.participant.id} className="block rounded-2xl border border-white/10 p-3 hover:border-lime-300/30" to={`/admin/tournaments/${tournament.id}/participants/${row.participant.id}/squad`}>
              <span className="font-bold text-white">{row.participant.displayName}</span>
              <span className="ml-2 text-sm text-white/45">{row.squad ? `${formatTournamentLabel(row.squad.status)} · ${row.squad.playerCount} players · Captain ${row.squad.captain?.name || 'not set'}` : 'No squad'}</span>
            </Link>
          ))}
        </Panel>
        <Panel title="Matchday Lineups">
          {lineups.length === 0 ? <p>No matchday lineups yet.</p> : lineups.map((lineup) => (
            <Link key={lineup.id} className="block rounded-2xl border border-white/10 p-3 hover:border-lime-300/30" to={`/admin/tournaments/${tournament.id}/lineups/${lineup.id}`}>
              <span className="font-bold text-white">{lineup.homeParticipant?.displayName || 'Home'} vs {lineup.awayParticipant?.displayName || 'Away'}</span>
              <span className="ml-2 text-sm text-white/45">{formatTournamentLabel(lineup.status)} · {lineup.home?.formation || 'No home formation'} / {lineup.away?.formation || 'No away formation'}</span>
            </Link>
          ))}
        </Panel>
        <Panel title="Fixtures & Results">
          {fixtures.length === 0 ? <p>No tournament fixtures yet.</p> : fixtures.slice(0, 8).map((fixture) => (
            <p key={`${fixture.type}-${fixture.id}`}><span className="font-bold text-white">{fixture.homeParticipant?.displayName || 'Home'} vs {fixture.awayParticipant?.displayName || 'Away'}</span> · {formatTournamentLabel(fixture.status)} · {dateText(fixture.scheduledAt)}</p>
          ))}
        </Panel>
        <Panel title="Standings">
          {standings.length === 0 ? <p>No standings yet.</p> : standings.slice(0, 8).map((row) => (
            <p key={row.participant.id}><span className="font-bold text-white">{row.participant.displayName}</span> · {row.points} pts · GD {row.goalDifference}</p>
          ))}
        </Panel>
        <Panel title="Awards & Statistics">
          <p>Champion: {awards.champion?.displayName || 'Pending'}</p>
          <p>Golden Boot: {awards.goldenBoot?.name || 'Pending'}</p>
          <p>Top Assist: {awards.topAssist?.name || 'Pending'}</p>
          <p>Matches: {stats?.totals?.matches || 0} · Goals: {stats?.totals?.goals || 0}</p>
        </Panel>
        <Panel title="Timeline"><ReviewTimeline history={history} /></Panel>
      </section>
    </>
  );
}

function ErrorState({ error, onRetry }) {
  return <div className="rounded-2xl border border-red-300/20 bg-red-300/10 p-5 text-red-100" role="alert"><p>{error}</p><button type="button" className="secondary-button mt-4" onClick={onRetry}><RefreshCw size={16} /> Retry</button></div>;
}

function Info({ title, value }) {
  return <div className="rounded-2xl border border-white/[0.08] bg-white/[0.035] p-5"><p className="eyebrow">{title}</p><div className="mt-2 text-lg font-bold">{value}</div></div>;
}

function Panel({ title, children }) {
  return <div className="rounded-3xl border border-white/[0.08] bg-white/[0.035] p-6"><h2 className="mb-3 font-display text-2xl font-black">{title}</h2><div className="space-y-2 text-white/65">{children}</div></div>;
}
