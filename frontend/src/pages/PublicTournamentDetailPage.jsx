import { useCallback, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import EmptyState from '../components/EmptyState.jsx';
import { tournamentApi, unwrapData } from '../features/tournaments/api.js';
import { StatusBadge, TournamentLogo, dateText, imageUrl } from '../features/tournaments/TournamentUi.jsx';
import { formatTournamentLabel } from '../features/tournaments/constants.js';
import usePageMetadata from '../hooks/usePageMetadata.js';

export default function PublicTournamentDetailPage() {
  const { slug } = useParams();
  const [tournament, setTournament] = useState(null);
  const [fixtures, setFixtures] = useState([]);
  const [results, setResults] = useState([]);
  const [standings, setStandings] = useState([]);
  const [awards, setAwards] = useState({});
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    try {
      const [detail, fixturesResponse, resultsResponse, standingsResponse, awardsResponse, statsResponse] = await Promise.all([
        tournamentApi.getPublic(slug),
        tournamentApi.publicFixtures(slug),
        tournamentApi.publicResults(slug),
        tournamentApi.publicStandings(slug),
        tournamentApi.publicAwards(slug),
        tournamentApi.publicTournamentStats(slug),
      ]);
      setTournament(unwrapData(detail).tournament);
      setFixtures(unwrapData(fixturesResponse).fixtures || []);
      setResults(unwrapData(resultsResponse).results || []);
      setStandings(unwrapData(standingsResponse).standings || []);
      setAwards(unwrapData(awardsResponse).awards || {});
      setStats(unwrapData(statsResponse));
      setError('');
    } catch (requestError) {
      setError(requestError.userMessage);
    } finally {
      setLoading(false);
    }
  }, [slug]);

  useEffect(() => { load(); }, [load]);

  usePageMetadata({
    title: tournament ? `${tournament.name} Tournament | FootStream` : 'Tournament | FootStream',
    description: tournament?.description || 'View FootStream tournament fixtures, results, standings, awards and statistics.',
    path: `/tournaments/${slug}`,
    image: imageUrl(tournament?.coverImage) || imageUrl(tournament?.logo),
  });

  if (loading) return <div className="skeleton h-96" />;
  if (error) return <div className="rounded-2xl border border-red-300/20 bg-red-300/10 p-5 text-red-100">{error}</div>;
  if (!tournament) return <EmptyState title="Tournament unavailable" message="This public tournament could not be found." />;

  const cover = imageUrl(tournament.coverImage);

  const shareTournament = () => {
    if (navigator.share) {
      navigator.share({ title: tournament.name, url: window.location.href }).catch(() => {});
      return;
    }
    navigator.clipboard?.writeText(window.location.href);
  };

  return (
    <>
      <section className="overflow-hidden rounded-[2rem] border border-white/[0.08] bg-white/[0.035]">
        <div className="h-60 bg-emerald-950/80">{cover && <img src={cover} alt="" className="h-full w-full object-cover opacity-80" />}</div>
        <div className="-mt-10 p-6">
          <TournamentLogo tournament={tournament} className="size-20" />
          <p className="eyebrow mt-5">{formatTournamentLabel(tournament.scope)}</p>
          <h1 className="page-title">{tournament.name}</h1>
          <p className="page-copy">{tournament.seasonLabel} · {dateText(tournament.startDate)} - {dateText(tournament.endDate)} · {tournament.primaryVenue}, {tournament.city}</p>
          <div className="mt-5 flex flex-wrap gap-2">
            <button type="button" className="secondary-button" onClick={shareTournament}>Share</button>
            <a className="primary-button" href={tournamentApi.publicReportUrl(tournament.slug)} target="_blank" rel="noopener noreferrer">Tournament PDF</a>
          </div>
        </div>
      </section>

      <section className="mt-8 grid gap-5 lg:grid-cols-3">
        <Info title="Competition" value={`${formatTournamentLabel(tournament.competitionFormat)} · ${tournament.matchFormat}`} />
        <Info title="Rules" value={`${tournament.playersOnField} players · squad ${tournament.minimumSquad}-${tournament.maximumSquad}`} />
        <Info title="Points" value={`${tournament.winPoints}/${tournament.drawPoints}/${tournament.lossPoints}`} />
      </section>

      <section className="mt-8 rounded-3xl border border-white/[0.08] bg-white/[0.035] p-6">
        <h2 className="font-display text-3xl font-black">Participants</h2>
        <p className="mt-2 text-white/50">Only confirmed participants are public.</p>
        <div className="mt-5 grid gap-3 md:grid-cols-2">
          {(tournament.participants || []).length === 0 ? (
            <EmptyState title="No confirmed participants yet" message="Participants will appear after confirmation." />
          ) : tournament.participants.map((participant) => (
            <article key={participant.id} className="rounded-2xl border border-white/10 p-4">
              <p className="font-bold">{participant.displayName}</p>
              <p className="text-sm text-white/45">{formatTournamentLabel(participant.participantType)}</p>
              <Link className="secondary-button mt-4" to={`/tournaments/${tournament.slug}/participants/${participant.slug}/squad`}>View Squad</Link>
            </article>
          ))}
        </div>
      </section>

      <section className="mt-8 grid gap-5 lg:grid-cols-2">
        <Panel title="Fixtures">
          {fixtures.filter((fixture) => fixture.status !== 'completed').length === 0 ? <p>No fixtures yet.</p> : fixtures.filter((fixture) => fixture.status !== 'completed').slice(0, 8).map((fixture) => <FixtureRow key={`${fixture.type}-${fixture.id}`} fixture={fixture} />)}
        </Panel>
        <Panel title="Results">
          {results.length === 0 ? <p>No completed tournament results yet.</p> : results.slice(0, 8).map((fixture) => <FixtureRow key={`${fixture.type}-${fixture.id}`} fixture={fixture} result />)}
        </Panel>
      </section>

      <section className="mt-8 grid gap-5 xl:grid-cols-[1.1fr_0.9fr]">
        <Panel title="Standings">
          {standings.length === 0 ? <p>No standings yet.</p> : <StandingTable rows={standings} />}
        </Panel>
        <Panel title="Awards">
          <div className="grid gap-3 sm:grid-cols-2">
            <Award label="Champion" value={awards.champion?.displayName} />
            <Award label="Runner-up" value={awards.runnerUp?.displayName} />
            <Award label="Golden Boot" value={awards.goldenBoot?.name} />
            <Award label="Top Assist" value={awards.topAssist?.name} />
            <Award label="MVP" value={awards.mostValuablePlayer?.name} />
            <Award label="Fair Play" value={awards.fairPlay?.displayName} />
          </div>
        </Panel>
      </section>

      <section className="mt-8 rounded-3xl border border-white/[0.08] bg-white/[0.035] p-6">
        <h2 className="font-display text-3xl font-black">Tournament Statistics</h2>
        <div className="mt-5 grid gap-3 sm:grid-cols-3">
          <Info title="Matches" value={stats?.totals?.matches || 0} />
          <Info title="Goals" value={stats?.totals?.goals || 0} />
          <Info title="Players" value={stats?.totals?.players || 0} />
        </div>
        <div className="mt-5 grid gap-3 md:grid-cols-2">
          {(stats?.players || []).slice(0, 8).map((player) => (
            <article key={player.playerId} className="rounded-2xl border border-white/10 p-4">
              <p className="font-bold">{player.name}</p>
              <p className="text-sm text-white/45">{player.participant?.displayName || 'Participant'} · {player.goals} goals · {player.assists} assists</p>
            </article>
          ))}
        </div>
      </section>
    </>
  );
}

function Info({ title, value }) {
  return <div className="rounded-2xl border border-white/[0.08] bg-white/[0.035] p-5"><p className="eyebrow">{title}</p><p className="mt-2 text-lg font-bold">{value}</p></div>;
}

function Panel({ title, children }) {
  return <section className="rounded-3xl border border-white/[0.08] bg-white/[0.035] p-6"><h2 className="mb-4 font-display text-3xl font-black">{title}</h2><div className="space-y-3 text-white/65">{children}</div></section>;
}

function FixtureRow({ fixture, result = false }) {
  return <article className="rounded-2xl border border-white/10 p-4">
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div>
        <p className="font-bold text-white">{fixture.homeParticipant?.displayName || 'Home'} vs {fixture.awayParticipant?.displayName || 'Away'}</p>
        <p className="text-sm text-white/45">{dateText(fixture.scheduledAt)} · {fixture.venue || 'Venue not set'}</p>
      </div>
      <StatusBadge tone={fixture.status === 'completed' ? 'lime' : 'neutral'}>{formatTournamentLabel(fixture.status)}</StatusBadge>
    </div>
    {result && fixture.result ? <p className="mt-2 font-display text-2xl font-black text-lime-100">{fixture.result.finalTeamScore} - {fixture.result.finalOpponentScore}</p> : null}
    {fixture.matchId ? <Link className="secondary-button mt-3" to={fixture.status === 'completed' ? `/matches/${fixture.matchId}/result` : `/matches/${fixture.matchId}`}>Open Match</Link> : null}
  </article>;
}

function Award({ label, value }) {
  return <div className="rounded-2xl border border-lime-300/10 bg-lime-300/5 p-4"><p className="eyebrow">{label}</p><p className="mt-2 font-bold text-white">{value || 'Pending'}</p></div>;
}

function StandingTable({ rows }) {
  return <div className="overflow-x-auto"><table className="min-w-full text-sm"><thead className="text-white/45"><tr><th className="p-2 text-left">Team</th><th className="p-2">P</th><th className="p-2">W</th><th className="p-2">D</th><th className="p-2">L</th><th className="p-2">GF</th><th className="p-2">GA</th><th className="p-2">GD</th><th className="p-2">Pts</th></tr></thead><tbody>{rows.map((row) => <tr key={row.participant.id} className="border-t border-white/10"><td className="p-2 font-bold text-white">{row.participant.displayName}</td><td className="p-2 text-center">{row.played}</td><td className="p-2 text-center">{row.won}</td><td className="p-2 text-center">{row.drawn}</td><td className="p-2 text-center">{row.lost}</td><td className="p-2 text-center">{row.goalsFor}</td><td className="p-2 text-center">{row.goalsAgainst}</td><td className="p-2 text-center">{row.goalDifference}</td><td className="p-2 text-center font-black text-lime-200">{row.points}</td></tr>)}</tbody></table></div>;
}
