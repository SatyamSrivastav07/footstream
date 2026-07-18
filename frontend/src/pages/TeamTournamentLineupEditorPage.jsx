import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Lock, Save, Send, ShieldCheck, Unlock } from 'lucide-react';
import { tournamentApi, unwrapData } from '../features/tournaments/api.js';
import EmptyState from '../components/EmptyState.jsx';
import FootballPitchLineup from '../components/FootballPitchLineup.jsx';
import { StatusBadge } from '../features/tournaments/TournamentUi.jsx';
import { TOURNAMENT_FORMATION_PRESETS, formatTournamentLabel } from '../features/tournaments/constants.js';

const participantName = (participant) => participant?.displayName || 'Participant';
const isLocked = (lineup) => lineup?.status === 'locked' || lineup?.status === 'submitted';

function PlayerRow({ player, side, selected, disabled, onAction }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-white/[0.08] bg-black/20 p-3">
      <div>
        <p className="font-bold">{player.name}</p>
        <p className="text-xs text-white/45">#{player.jersey || '-'} · {player.position} · {formatTournamentLabel(player.sourceType)}</p>
      </div>
      <div className="flex flex-wrap gap-2">
        <button type="button" className="secondary-button text-xs" disabled={disabled || selected} onClick={() => onAction(side, 'addStarter', player.id)}>Starter</button>
        <button type="button" className="secondary-button text-xs" disabled={disabled || selected} onClick={() => onAction(side, 'addSubstitute', player.id)}>Bench</button>
      </div>
    </div>
  );
}

function SelectedPlayer({ player, side, disabled, onAction }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-white/[0.08] bg-white/[0.035] p-3">
      <span>{player.name} <span className="text-xs text-white/40">#{player.jersey || '-'} · {player.position}</span></span>
      {!disabled && <div className="flex flex-wrap gap-2">
        <button type="button" className="secondary-button text-xs" onClick={() => onAction(side, 'setCaptain', player.id)}>Captain</button>
        <button type="button" className="secondary-button text-xs" onClick={() => onAction(side, 'setGoalkeeper', player.id)}>GK</button>
        <button type="button" className="secondary-button text-xs" onClick={() => onAction(side, 'removePlayer', player.id)}>Remove</button>
      </div>}
    </div>
  );
}

function SidePanel({ label, participant, side, lineup, eligible, playersOnField, maxMatchday, disabled, onAction, onFormation, selectedPlayerId, onSelectPlayer, onSlotAssign }) {
  const data = lineup?.[side] || {};
  const selectedIds = new Set([...(data.startingPlayers || []), ...(data.substitutes || [])].map((player) => player.id));
  const assignedStarterIds = new Set((data.startingPlayers || []).filter((player) => player.slotId).map((player) => player.id));
  const unassignedStarters = (data.startingPlayers || []).filter((player) => !assignedStarterIds.has(player.id));
  const presets = TOURNAMENT_FORMATION_PRESETS[playersOnField] || [];
  return (
    <section className="rounded-3xl border border-white/[0.08] bg-white/[0.035] p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="eyebrow">{label}</p>
          <h2 className="font-display text-2xl font-black">{participantName(participant)}</h2>
          <p className="mt-1 text-sm text-white/45">Select exactly {playersOnField} starters · max {maxMatchday} matchday players</p>
        </div>
        <StatusBadge>{data.startingPlayers?.length || 0}/{playersOnField} starters</StatusBadge>
      </div>

      <div className="mt-5 grid gap-3 md:grid-cols-[1fr_auto]">
        <select className="field-input" value={data.formation || ''} disabled={disabled} onChange={(event) => onFormation(side, event.target.value, data.customFormation || '')}>
          <option value="">Select formation</option>
          {presets.map((preset) => <option key={preset} value={preset}>{preset}</option>)}
          <option value="custom">Custom</option>
        </select>
        {data.formation === 'custom' && <input className="field-input" aria-label={`${label} custom formation`} disabled={disabled} value={data.customFormation || ''} onChange={(event) => onFormation(side, 'custom', event.target.value)} placeholder="4-3-3 style total" />}
      </div>

      <div className="mt-5 grid gap-5 lg:grid-cols-2">
        <div>
          <h3 className="font-bold">Starting lineup</h3>
          <div className="mt-3 space-y-2">{data.startingPlayers?.length ? data.startingPlayers.map((player) => <div key={player.id} className={selectedPlayerId === player.id ? 'rounded-xl ring-2 ring-lime-300' : ''}><SelectedPlayer player={player} side={side} disabled={disabled} onAction={onAction} />{!disabled && <button type="button" className="mt-2 text-xs font-bold text-lime-200" onClick={() => onSelectPlayer(side, player.id)}>{selectedPlayerId === player.id ? 'Selected for pitch' : 'Place on pitch'}</button>}</div>) : <p className="text-sm text-white/40">No starters selected.</p>}</div>
        </div>
        <div>
          <h3 className="font-bold">Bench</h3>
          <div className="mt-3 space-y-2">{data.substitutes?.length ? data.substitutes.map((player) => <SelectedPlayer key={player.id} player={player} side={side} disabled={disabled} onAction={onAction} />) : <p className="text-sm text-white/40">No substitutes selected.</p>}</div>
        </div>
      </div>

      <div className="mt-6">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <div>
            <h3 className="font-bold">Tactical pitch</h3>
            <p className="text-xs text-white/45">Select a starter, then choose a pitch slot. All starters must be placed before submit/lock.</p>
          </div>
          <StatusBadge>{assignedStarterIds.size}/{data.startingPlayers?.length || 0} placed</StatusBadge>
        </div>
        <FootballPitchLineup
          formation={data.formation}
          customFormation={data.customFormation}
          starters={data.startingPlayers || []}
          captain={data.captain}
          goalkeeper={data.goalkeeper}
          selectedPlayerId={selectedPlayerId}
          editable={!disabled}
          side={side}
          orientation={side === 'home' ? 'attacking-up' : 'attacking-down'}
          onSlotSelect={(slot, currentPlayer) => {
            if (selectedPlayerId) onSlotAssign(side, selectedPlayerId, slot.slotId);
            else if (currentPlayer) onSelectPlayer(side, currentPlayer.id);
          }}
        />
        {!disabled && unassignedStarters.length > 0 && <div className="mt-3 rounded-2xl border border-amber-300/20 bg-amber-300/10 p-3 text-sm text-amber-100">Unassigned starters: {unassignedStarters.map((player) => player.name).join(', ')}</div>}
      </div>

      <div className="mt-5 grid gap-3 text-sm text-white/65 md:grid-cols-2">
        <p>Captain: <span className="font-bold text-white">{data.captain?.name || 'Not selected'}</span></p>
        <p>Goalkeeper: <span className="font-bold text-white">{data.goalkeeper?.name || 'Not selected'}</span></p>
      </div>

      <div className="mt-6">
        <h3 className="font-bold">Eligible squad players</h3>
        <div className="mt-3 grid gap-3">{eligible.length ? eligible.map((player) => <PlayerRow key={player.id} player={player} side={side} selected={selectedIds.has(player.id)} disabled={disabled} onAction={onAction} />) : <EmptyState title="No eligible players" message="Approve or lock this participant squad first." />}</div>
      </div>
    </section>
  );
}

export default function TeamTournamentLineupEditorPage() {
  const { tournamentId, lineupId } = useParams();
  const [tournament, setTournament] = useState(null);
  const [lineup, setLineup] = useState(null);
  const [eligible, setEligible] = useState({ home: [], away: [] });
  const [history, setHistory] = useState([]);
  const [selectedPitchPlayers, setSelectedPitchPlayers] = useState({ home: '', away: '' });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const disabled = useMemo(() => isLocked(lineup), [lineup]);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [tournamentRes, lineupRes, historyRes] = await Promise.all([
        tournamentApi.getHosted(tournamentId),
        tournamentApi.getLineup(tournamentId, lineupId),
        tournamentApi.lineupHistory(tournamentId, lineupId),
      ]);
      const nextLineup = unwrapData(lineupRes).lineup;
      setTournament(unwrapData(tournamentRes).tournament);
      setLineup(nextLineup);
      setHistory(unwrapData(historyRes).history || []);
      const [homeRes, awayRes] = await Promise.all([
        tournamentApi.lineupEligiblePlayers(tournamentId, lineupId, 'home'),
        tournamentApi.lineupEligiblePlayers(tournamentId, lineupId, 'away'),
      ]);
      setEligible({ home: unwrapData(homeRes).players || [], away: unwrapData(awayRes).players || [] });
    } catch (err) {
      setError(err.response?.data?.message || 'Unable to load lineup.');
    } finally {
      setLoading(false);
    }
  }, [tournamentId, lineupId]);

  useEffect(() => { load(); }, [load]);

  const mutate = async (operation) => {
    setError('');
    try {
      const response = await operation();
      setLineup(unwrapData(response).lineup);
      await load();
    } catch (err) {
      setError(err.response?.data?.message || 'Lineup update failed.');
    }
  };

  const onAction = (side, action, squadPlayerId) => mutate(() => tournamentApi.updateLineupSide(tournamentId, lineupId, side, { action, squadPlayerId }));
  const onFormation = (side, formation, customFormation) => mutate(() => tournamentApi.updateLineupSide(tournamentId, lineupId, side, { action: 'formation', formation, customFormation }));
  const onSelectPlayer = (side, squadPlayerId) => setSelectedPitchPlayers((current) => ({ ...current, [side]: current[side] === squadPlayerId ? '' : squadPlayerId }));
  const onSlotAssign = (side, squadPlayerId, slotId) => mutate(() => tournamentApi.updateLineupSide(tournamentId, lineupId, side, { action: 'assignSlot', squadPlayerId, slotId })).then(() => setSelectedPitchPlayers((current) => ({ ...current, [side]: '' })));

  if (loading) return <div className="skeleton h-96" />;
  if (error && !lineup) return <div className="rounded-2xl border border-red-300/20 bg-red-300/10 p-5 text-red-100">{error}</div>;

  return (
    <div>
      <header className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="eyebrow">Tournament matchday lineup</p>
          <h1 className="page-title">{lineup.provisionalFixtureKey}</h1>
          <p className="page-copy">This prepares both sides only. There is no Start Match control and no tournament Match document is created.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <StatusBadge>{formatTournamentLabel(lineup.status)}</StatusBadge>
          <Link className="secondary-button" to={`/team/tournaments/${tournamentId}/lineups`}>All Lineups</Link>
          {lineup.status === 'draft' && <button className="primary-button" onClick={() => mutate(() => tournamentApi.submitLineup(tournamentId, lineupId))}><Send size={16} /> Submit</button>}
          {lineup.status !== 'locked' && <button className="secondary-button" onClick={() => mutate(() => tournamentApi.lockLineup(tournamentId, lineupId))}><Lock size={16} /> Lock</button>}
          {lineup.status === 'locked' && <button className="secondary-button" onClick={() => mutate(() => tournamentApi.unlockLineup(tournamentId, lineupId))}><Unlock size={16} /> Unlock</button>}
        </div>
      </header>

      {error && <div className="mt-5 rounded-2xl border border-red-300/20 bg-red-300/10 p-4 text-red-100">{error}</div>}

      <div className="mt-7 grid gap-6">
        <SidePanel label="Home" participant={lineup.homeParticipant} side="home" lineup={lineup} eligible={eligible.home} playersOnField={tournament.playersOnField} maxMatchday={tournament.maximumMatchdaySquad} disabled={disabled} onAction={onAction} onFormation={onFormation} selectedPlayerId={selectedPitchPlayers.home} onSelectPlayer={onSelectPlayer} onSlotAssign={onSlotAssign} />
        <SidePanel label="Away" participant={lineup.awayParticipant} side="away" lineup={lineup} eligible={eligible.away} playersOnField={tournament.playersOnField} maxMatchday={tournament.maximumMatchdaySquad} disabled={disabled} onAction={onAction} onFormation={onFormation} selectedPlayerId={selectedPitchPlayers.away} onSelectPlayer={onSelectPlayer} onSlotAssign={onSlotAssign} />
      </div>

      <section className="mt-7 rounded-3xl border border-white/[0.08] bg-white/[0.035] p-5">
        <h2 className="panel-title"><ShieldCheck size={18} /> Audit history</h2>
        <div className="mt-4 space-y-3">{history.length ? history.map((item) => <p key={item.id} className="rounded-xl bg-black/20 p-3 text-sm text-white/65">{formatTournamentLabel(item.action)} · {item.safeMessage}</p>) : <p className="text-sm text-white/45">No lineup history yet.</p>}</div>
      </section>

      <p className="mt-5 text-xs font-bold uppercase tracking-[0.18em] text-white/35"><Save size={14} className="mr-1 inline" /> No fixture generator, tournament Match, or live controls are available in this phase.</p>
    </div>
  );
}
