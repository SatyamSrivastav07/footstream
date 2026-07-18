import { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { Plus } from 'lucide-react';
import { tournamentApi, unwrapData } from '../features/tournaments/api.js';
import EmptyState from '../components/EmptyState.jsx';
import { StatusBadge } from '../features/tournaments/TournamentUi.jsx';
import { formatTournamentLabel } from '../features/tournaments/constants.js';

const participantName = (participant) => participant?.displayName || 'Participant';

export default function TeamTournamentLineupsPage() {
  const { tournamentId } = useParams();
  const navigate = useNavigate();
  const [data, setData] = useState({ tournament: null, participants: [], lineups: [] });
  const [form, setForm] = useState({ provisionalFixtureKey: '', homeParticipant: '', awayParticipant: '' });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [tournamentRes, participantsRes, lineupsRes] = await Promise.all([
        tournamentApi.getHosted(tournamentId),
        tournamentApi.participants(tournamentId),
        tournamentApi.lineups(tournamentId),
      ]);
      const tournament = unwrapData(tournamentRes).tournament;
      const participants = unwrapData(participantsRes).participants || [];
      const lineups = unwrapData(lineupsRes).lineups || [];
      setData({ tournament, participants, lineups });
      setForm((current) => ({ ...current, provisionalFixtureKey: current.provisionalFixtureKey || `${tournament.shortName || tournament.name}-matchday-${lineups.length + 1}` }));
    } catch (err) {
      setError(err.response?.data?.message || 'Unable to load tournament lineups.');
    } finally {
      setLoading(false);
    }
  }, [tournamentId]);

  useEffect(() => { load(); }, [load]);

  const create = async (event) => {
    event.preventDefault();
    setSaving(true);
    setError('');
    try {
      const response = await tournamentApi.createLineup(tournamentId, form);
      navigate(`/team/tournaments/${tournamentId}/lineups/${unwrapData(response).lineup.id}`);
    } catch (err) {
      setError(err.response?.data?.message || 'Unable to create lineup.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="skeleton h-96" />;

  return (
    <div>
      <header className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="eyebrow">Tournament matchday</p>
          <h1 className="page-title">Lineups</h1>
          <p className="page-copy">Prepare both teams before fixtures exist. No tournament Match is created in this phase.</p>
        </div>
        <Link className="secondary-button" to={`/team/tournaments/${tournamentId}`}>Back to Tournament</Link>
      </header>

      {error && <div className="mt-5 rounded-2xl border border-red-300/20 bg-red-300/10 p-4 text-red-100">{error}</div>}

      <section className="mt-7 rounded-3xl border border-white/[0.08] bg-white/[0.035] p-5">
        <h2 className="panel-title">Create matchup reference</h2>
        <form onSubmit={create} className="mt-4 grid gap-3 md:grid-cols-4">
          <input className="field-input" aria-label="Lineup reference" value={form.provisionalFixtureKey} onChange={(e) => setForm({ ...form, provisionalFixtureKey: e.target.value })} placeholder="RANN-M1" required />
          <select className="field-input" aria-label="Home participant" value={form.homeParticipant} onChange={(e) => setForm({ ...form, homeParticipant: e.target.value })} required>
            <option value="">Home participant</option>
            {data.participants.map((participant) => <option key={participant.id} value={participant.id}>{participant.displayName}</option>)}
          </select>
          <select className="field-input" aria-label="Away participant" value={form.awayParticipant} onChange={(e) => setForm({ ...form, awayParticipant: e.target.value })} required>
            <option value="">Away participant</option>
            {data.participants.map((participant) => <option key={participant.id} value={participant.id}>{participant.displayName}</option>)}
          </select>
          <button className="primary-button" disabled={saving}><Plus size={16} /> Create Lineup</button>
        </form>
      </section>

      <section className="mt-7">
        {data.lineups.length === 0 ? <EmptyState title="No matchday lineups" message="Create the first future matchup reference to prepare starters and bench." /> : (
          <div className="grid gap-4 lg:grid-cols-2">
            {data.lineups.map((lineup) => (
              <Link key={lineup.id} to={`/team/tournaments/${tournamentId}/lineups/${lineup.id}`} className="rounded-3xl border border-white/[0.08] bg-white/[0.035] p-5 transition hover:border-lime-300/30">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="eyebrow">{lineup.provisionalFixtureKey}</p>
                    <h2 className="font-display text-2xl font-black">{participantName(lineup.homeParticipant)} vs {participantName(lineup.awayParticipant)}</h2>
                    <p className="mt-2 text-sm text-white/45">{formatTournamentLabel(data.tournament?.playersOnField)} players on field</p>
                  </div>
                  <StatusBadge>{formatTournamentLabel(lineup.status)}</StatusBadge>
                </div>
                <div className="mt-4 grid gap-3 text-sm text-white/60 md:grid-cols-2">
                  <p>Home: {lineup.home?.startingPlayers?.length || 0} starters · {lineup.home?.substitutes?.length || 0} bench</p>
                  <p>Away: {lineup.away?.startingPlayers?.length || 0} starters · {lineup.away?.substitutes?.length || 0} bench</p>
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
