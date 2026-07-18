import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { tournamentApi, unwrapData } from '../features/tournaments/api.js';
import EmptyState from '../components/EmptyState.jsx';
import FootballPitchLineup from '../components/FootballPitchLineup.jsx';
import { StatusBadge } from '../features/tournaments/TournamentUi.jsx';
import { formatTournamentLabel } from '../features/tournaments/constants.js';

const participantName = (participant) => participant?.displayName || 'Participant';

function SideSummary({ label, participant, side }) {
  return (
    <section className="rounded-3xl border border-white/[0.08] bg-white/[0.035] p-5">
      <p className="eyebrow">{label}</p>
      <h2 className="font-display text-2xl font-black">{participantName(participant)}</h2>
      <p className="mt-2 text-sm text-white/55">Formation: {side?.formation === 'custom' ? side.customFormation : side?.formation || 'Not selected'}</p>
      <div className="mt-4 grid gap-3 text-sm text-white/65 md:grid-cols-2">
        <p>Starters: {side?.startingPlayers?.length || 0}</p>
        <p>Bench: {side?.substitutes?.length || 0}</p>
        <p>Captain: {side?.captain?.name || 'Not selected'}</p>
        <p>Goalkeeper: {side?.goalkeeper?.name || 'Not selected'}</p>
      </div>
      <div className="mt-5">
        <FootballPitchLineup
          formation={side?.formation}
          customFormation={side?.customFormation}
          starters={side?.startingPlayers || []}
          captain={side?.captain}
          goalkeeper={side?.goalkeeper}
          editable={false}
          compact
          orientation={label === 'Home' ? 'attacking-up' : 'attacking-down'}
        />
      </div>
    </section>
  );
}

export default function AdminTournamentLineupPage() {
  const { tournamentId, lineupId } = useParams();
  const [lineup, setLineup] = useState(null);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setError('');
      try {
        const [lineupRes, historyRes] = await Promise.all([
          tournamentApi.adminLineup(tournamentId, lineupId),
          tournamentApi.adminLineupHistory(tournamentId, lineupId),
        ]);
        setLineup(unwrapData(lineupRes).lineup);
        setHistory(unwrapData(historyRes).history || []);
      } catch (err) {
        setError(err.response?.data?.message || 'Unable to load lineup.');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [tournamentId, lineupId]);

  if (loading) return <div className="skeleton h-96" />;
  if (error) return <div className="rounded-2xl border border-red-300/20 bg-red-300/10 p-5 text-red-100">{error}</div>;
  if (!lineup) return <EmptyState title="Lineup not found" message="The selected tournament lineup is unavailable." />;

  return (
    <div>
      <header className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="eyebrow">Super admin read-only</p>
          <h1 className="page-title">{lineup.provisionalFixtureKey}</h1>
          <p className="page-copy">Review matchday lineup readiness without mutation controls.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <StatusBadge>{formatTournamentLabel(lineup.status)}</StatusBadge>
          <Link className="secondary-button" to={`/admin/tournaments/${tournamentId}`}>Back to Review</Link>
        </div>
      </header>

      <div className="mt-7 grid gap-6 lg:grid-cols-2">
        <SideSummary label="Home" participant={lineup.homeParticipant} side={lineup.home} />
        <SideSummary label="Away" participant={lineup.awayParticipant} side={lineup.away} />
      </div>

      <section className="mt-7 rounded-3xl border border-white/[0.08] bg-white/[0.035] p-5">
        <h2 className="panel-title">Lineup history</h2>
        <div className="mt-4 space-y-3">{history.length ? history.map((item) => <p key={item.id} className="rounded-xl bg-black/20 p-3 text-sm text-white/65">{formatTournamentLabel(item.action)} · {item.safeMessage}</p>) : <p className="text-sm text-white/45">No history recorded.</p>}</div>
      </section>
    </div>
  );
}
