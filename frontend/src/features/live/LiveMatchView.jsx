import { ArrowRightLeft, CircleDot, Goal, RotateCcw, ShieldAlert, Trophy, Undo2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import api from '../../api/client.js';
import FootballPitchLineup from '../../components/FootballPitchLineup.jsx';
import TeamIdentity from '../../components/TeamIdentity.jsx';
import PlayerAvatar from '../squad/PlayerAvatar.jsx';
import { formatLocalDateTime, label } from '../matches/constants.js';
import EventActionModal from './EventActionModal.jsx';
import EventTimeline from './EventTimeline.jsx';
import LiveEventOverlay from './LiveEventOverlay.jsx';
import LiveTimer from './LiveTimer.jsx';
import useLiveMatch from './useLiveMatch.js';

const actions = [
  ['goal', Goal, 'Goal'], ['assist', CircleDot, 'Assist'], ['yellowCard', ShieldAlert, 'Yellow card'],
  ['redCard', ShieldAlert, 'Red card'], ['substitution', ArrowRightLeft, 'Substitution'],
  ['penalty', Trophy, 'Penalty'], ['ownGoal', RotateCcw, 'Own goal'], ['undo', Undo2, 'Undo last'],
];
const formatStarters = { '5v5': 5, '7v7': 7, '11v11': 11 };

export const buildGoalEventPayload = (form, commonPayload = {}) => {
  const scoringSide = form.scoringSide || 'team';
  if (scoringSide === 'opponent') {
    return {
      ...commonPayload,
      scoringSide,
      opponentPlayerId: form.opponentPlayerId || undefined,
      opponentAssistPlayerId: form.opponentAssistPlayerId || undefined,
      temporaryOpponentPlayerName: form.temporaryOpponentPlayerName || undefined,
    };
  }

  return {
    ...commonPayload,
    scoringSide,
    playerId: form.playerId || undefined,
    assistPlayerId: form.assistPlayerId || undefined,
  };
};

export default function LiveMatchView({ matchId, mode = 'public', onViewerCount }) {
  const { state, events, loading, error, connection, viewerCount, refresh, setError, notifications } = useLiveMatch(matchId, mode);
  const [action, setAction] = useState(null);
  const [saving, setSaving] = useState(false);
  const editable = mode === 'team' && state?.permissions?.canControlLive !== false;

  useEffect(() => {
    if (typeof onViewerCount === 'function') onViewerCount(viewerCount);
  }, [onViewerCount, viewerCount]);

  const transition = async (endpoint, confirmation) => {
    if (confirmation && !window.confirm(confirmation)) return;
    setSaving(true); setError('');
    try { await api.post(`/team/matches/${matchId}/${endpoint}`); await refresh(); }
    catch (requestError) { setError(requestError.userMessage); }
    finally { setSaving(false); }
  };

  const submitEvent = async (kind, form) => {
    setSaving(true); setError('');
    const cleanCommon = {
      minute: Number(form.minute),
      ...(form.stoppageMinute === '' ? {} : { stoppageMinute: Number(form.stoppageMinute) }),
      description: form.description || '',
    };
    try {
      if (kind === 'goal') await api.post(`/team/matches/${matchId}/events/goal`, buildGoalEventPayload(form, cleanCommon));
      if (kind === 'assist') await api.patch(`/team/matches/${matchId}/events/${form.goalEventId}/assist`, { assistPlayerId: form.assistPlayerId });
      if (kind === 'yellowCard' || kind === 'redCard') await api.post(`/team/matches/${matchId}/events/${kind === 'yellowCard' ? 'yellow-card' : 'red-card'}`, { ...cleanCommon, side: form.side, playerId: form.playerId || undefined, opponentPlayerId: form.opponentPlayerId || undefined, temporaryOpponentPlayerName: form.temporaryOpponentPlayerName || undefined });
      if (kind === 'substitution') await api.post(`/team/matches/${matchId}/events/substitution`, { ...cleanCommon, side: form.side, playerOutId: form.playerOutId, playerInId: form.playerInId });
      if (kind === 'penalty') await api.post(`/team/matches/${matchId}/events/penalty`, { ...cleanCommon, scoringSide: form.scoringSide, outcome: form.outcome, playerId: form.playerId || undefined, opponentPlayerId: form.opponentPlayerId || undefined, temporaryOpponentPlayerName: form.temporaryOpponentPlayerName || undefined });
      if (kind === 'ownGoal') await api.post(`/team/matches/${matchId}/events/own-goal`, { ...cleanCommon, ownGoalBySide: form.ownGoalBySide, playerId: form.playerId || undefined, opponentPlayerId: form.opponentPlayerId || undefined, temporaryOpponentPlayerName: form.temporaryOpponentPlayerName || undefined });
      if (kind === 'undo') await api.post(`/team/matches/${matchId}/events/undo-last`, { reason: form.reason || '' });
      setAction(null); await refresh();
    } catch (requestError) { setError(requestError.userMessage); }
    finally { setSaving(false); }
  };

  if (loading) return <div className="grid min-h-96 place-items-center"><div className="loading-bar h-1 w-40 rounded-full bg-lime-300" /></div>;
  if (!state) return <div className="rounded-xl border border-red-300/20 bg-red-300/10 p-4 text-red-100">{error || 'Live match unavailable.'}</div>;

  const teamName = state.team?.name || 'FootStream team';
  const homeIsTeam = state.teamSide === 'home';
  const awayIsTeam = state.teamSide !== 'home';
  const homeName = homeIsTeam ? teamName : state.opponent.name;
  const awayName = awayIsTeam ? teamName : state.opponent.name;
  const nextTransition = state.status === 'scheduled' ? ['start', 'Start match'] : state.status === 'live' && state.currentPeriod === 'first_half' ? ['end-first-half', 'End first half'] : state.status === 'half_time' ? ['start-second-half', 'Start second half'] : state.status === 'live' && state.currentPeriod === 'second_half' ? ['complete', 'Complete match'] : null;
  const matchFormat = state.matchFormat || '11v11';
  const requiredStarters = formatStarters[matchFormat] || 11;
  const lineupIncomplete = state.startingXI.length !== requiredStarters;
  const lineupWarning = `Complete your ${matchFormat} lineup before starting the match.`;
  const liveFormation = state.formation === 'custom' ? state.customFormation : state.formation;
  const opponentFormation = state.registeredOpponentFormation === 'custom' ? state.registeredOpponentCustomFormation : state.registeredOpponentFormation;
  const opponentLineup = state.currentOpponentLineup || { onField: [], bench: [], sentOff: [], substitutions: [] };
  const hasOpponentTacticalBoard = opponentLineup.onField.length > 0 && (opponentFormation || state.tournament);

  return <>
    {mode === 'public' && <LiveEventOverlay notification={notifications.active} onDismiss={notifications.dismiss} />}
    {error && <div className="mb-5 rounded-xl border border-red-300/20 bg-red-300/10 p-4 text-red-100" role="alert">{error}</div>}
    <section className="overflow-hidden rounded-3xl border border-white/[0.08] bg-[radial-gradient(circle_at_top,rgba(239,68,68,.11),rgba(190,242,100,.055)_38%,rgba(255,255,255,.02)_70%)] p-5 sm:p-8">
      <div className="flex flex-wrap items-center justify-between gap-3"><div className="flex items-center gap-2"><span className={`size-2 rounded-full ${state.status === 'live' ? 'animate-pulse bg-red-400' : 'bg-white/30'}`} /><span className="text-xs font-black uppercase tracking-[0.18em] text-white/70">{label(state.status)} · {label(state.currentPeriod)}</span></div><div className="flex items-center gap-2">{mode === 'public' && <span className="status-badge status-active">{viewerCount} watching</span>}<span className={`status-badge ${connection === 'connected' ? 'status-active' : 'status-neutral'}`}>{connection}</span></div></div>
      <div className="my-8 grid grid-cols-[1fr_auto_1fr] items-center gap-3 text-center"><div><p className="text-[10px] font-bold uppercase tracking-wider text-emerald-100/35">Home</p><h1 className="mt-2 flex justify-center font-display text-xl font-black text-white sm:text-4xl">{homeIsTeam ? <TeamIdentity team={state.team} name={homeName} className="justify-center" logoClassName="size-9 rounded-xl sm:size-11" /> : homeName}</h1></div><div className="rounded-2xl border border-white/10 bg-black/25 px-4 py-3 sm:px-7"><p className="font-display text-4xl font-black tracking-wider text-lime-300 sm:text-6xl">{state.homeScore}–{state.awayScore}</p><p className="mt-1 text-sm font-bold text-white/60"><LiveTimer elapsedSeconds={state.elapsedSeconds} running={state.status === 'live'} /></p></div><div><p className="text-[10px] font-bold uppercase tracking-wider text-emerald-100/35">Away</p><h1 className="mt-2 flex justify-center font-display text-xl font-black text-white sm:text-4xl">{awayIsTeam ? <TeamIdentity team={state.team} name={awayName} className="justify-center" logoClassName="size-9 rounded-xl sm:size-11" /> : awayName}</h1></div></div>
      <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 border-t border-white/[0.08] pt-5 text-xs text-emerald-100/45"><span>{state.venue}</span><span>{state.tournament || 'No tournament'}</span><span>{formatLocalDateTime(state.scheduledAt)}</span></div>
      {editable && lineupIncomplete && <div className="mt-5 rounded-xl border border-amber-300/20 bg-amber-300/10 p-4 text-center text-sm font-semibold text-amber-100">{lineupWarning}</div>}
      {editable && nextTransition && <div className="mt-6 flex justify-center"><button type="button" className="primary-button" disabled={saving || (nextTransition[0] === 'start' && lineupIncomplete)} onClick={() => transition(nextTransition[0], nextTransition[0] === 'complete' ? 'Complete this match and lock new events?' : undefined)}>{nextTransition[1]}</button></div>}
    </section>

      {editable && <section className="panel mt-6"><div className="panel-heading"><div><p className="eyebrow">Match operations</p><h2 className="panel-title">Event controls</h2></div><span className="count-pill">REST secured</span></div>{lineupIncomplete && <p className="mb-4 rounded-xl bg-amber-300/10 p-3 text-sm text-amber-100">{lineupWarning}</p>}<div className="grid grid-cols-2 gap-3 sm:grid-cols-4 xl:grid-cols-8">{actions.map(([key, Icon, text]) => { const unavailable = lineupIncomplete || state.status !== 'live' || saving || (key === 'undo' && !events.some((event) => !event.isUndone)) || (key === 'assist' && !events.some((event) => event.type === 'goal' && event.scoringSide === 'team' && !event.isUndone && !event.assistPlayer)) || (key === 'substitution' && state.currentLineup.bench.length === 0 && opponentLineup.bench.length === 0); return <button key={key} type="button" disabled={unavailable} onClick={() => { setError(''); setAction(key); }} className="flex min-h-24 flex-col items-center justify-center gap-2 rounded-2xl border border-white/[0.08] bg-black/10 p-3 text-center text-xs font-bold text-white/65 transition hover:border-lime-300/20 hover:bg-lime-300/[0.055] hover:text-white disabled:opacity-30"><Icon size={21} className="text-lime-200" />{text}</button>; })}</div></section>}

    {liveFormation && <section className="panel mt-6">
      <div className="panel-heading"><div><p className="eyebrow">Live formation</p><h2 className="panel-title">Current tactical shape</h2></div><span className="count-pill">{hasOpponentTacticalBoard ? 'Both teams' : liveFormation}</span></div>
      <div className={`grid gap-5 ${hasOpponentTacticalBoard ? 'xl:grid-cols-2' : ''}`}>
        <div>
          <h3 className="mb-3 font-display text-xl font-black">{teamName}</h3>
          <FootballPitchLineup
            formation={state.formation}
            customFormation={state.customFormation}
            starters={state.currentLineup.onField.map((player) => ({ ...player, id: player.player, jersey: player.jerseyNumber }))}
            goalkeeper={state.currentLineup.onField.find((player) => String(player.position || '').toUpperCase() === 'GK')}
            captain={state.currentLineup.onField.find((player) => player.isCaptain)}
            editable={false}
            compact
          />
        </div>
        {hasOpponentTacticalBoard && (
          <div>
            <h3 className="mb-3 font-display text-xl font-black">{state.opponent?.name || 'Opponent'}</h3>
            <FootballPitchLineup
              formation={state.registeredOpponentFormation || state.formation}
              customFormation={state.registeredOpponentCustomFormation || state.customFormation}
              starters={opponentLineup.onField.map((player) => ({ ...player, id: player.player, jersey: player.jerseyNumber }))}
              goalkeeper={opponentLineup.onField.find((player) => String(player.position || '').toUpperCase() === 'GK')}
              captain={opponentLineup.onField.find((player) => player.isCaptain)}
              editable={false}
              compact
              orientation="attacking-down"
            />
          </div>
        )}
      </div>
    </section>}

    <div className="mt-6 grid gap-6 xl:grid-cols-[1.1fr_.9fr]">
      <section className="panel"><div className="panel-heading"><div><p className="eyebrow">Live feed</p><h2 className="panel-title">Event timeline</h2></div><span className="count-pill">{events.filter((event) => !event.isUndone).length} active</span></div><EventTimeline events={events} /></section>
      <section className="space-y-6"><LineupPanel title="On field" players={state.currentLineup.onField} /><LineupPanel title="Bench" players={state.currentLineup.bench} />{state.currentLineup.sentOff.length > 0 && <LineupPanel title="Sent off" players={state.currentLineup.sentOff} danger />}{state.currentLineup.substitutions.length > 0 && <div className="panel"><p className="eyebrow">Substitution history</p><div className="mt-4 space-y-2">{state.currentLineup.substitutions.map((item) => <p key={item.sequence} className="rounded-xl bg-white/[0.03] px-3 py-2 text-sm text-emerald-100/55">{item.minute}' · {item.playerIn.name} in, {item.playerOut.name} out</p>)}</div></div>}</section>
    </div>
    <EventActionModal action={action} state={state} events={events} open={Boolean(action)} onClose={() => setAction(null)} onSubmit={submitEvent} saving={saving} error={error} />
  </>;
}

function LineupPanel({ title, players, danger = false }) { return <div className="panel"><div className="panel-heading"><h2 className="panel-title">{title}</h2><span className="count-pill">{players.length}</span></div><div className="grid gap-2 sm:grid-cols-2">{players.map((player) => <div key={player.player} className={`flex items-center gap-3 rounded-xl border p-2 ${danger ? 'border-red-300/10 bg-red-300/[0.04]' : 'border-white/[0.06] bg-black/10'}`}><PlayerAvatar src={player.photoUrl} name={player.name} className="size-10 rounded-lg" /><div className="min-w-0"><p className="truncate text-sm font-semibold text-white">{player.name}</p><p className="text-xs text-emerald-100/40">#{player.jerseyNumber || '—'} · {player.position}</p></div></div>)}</div></div>; }
