import { ArrowLeft, Plus, Save, Trash2, Trophy } from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import api from '../api/client.js';
import LoadingScreen from '../components/LoadingScreen.jsx';
import TeamIdentity from '../components/TeamIdentity.jsx';

const emptyGoal = { scoringSide: 'team', playerId: '', assistPlayerId: '', temporaryOpponentPlayerName: '', minute: '' };
const emptyCard = { side: 'team', playerId: '', temporaryOpponentPlayerName: '', minute: '' };
const emptySubstitution = { playerOutId: '', playerInId: '', minute: '' };

const eventSide = (event) => event.scoringSide || event.side || (event.team ? 'team' : 'opponent');
const playerId = (snapshot) => String(snapshot?.player || snapshot?._id || '');

const toNumberOrNull = (value) => (value === '' || value === null || value === undefined ? null : Number(value));
const toTrimmedOrNull = (value) => {
  const text = String(value || '').trim();
  return text || null;
};

const entryLabel = (count) => (count === 1 ? 'goal entry has' : 'goal entries have');

export const countDirectGoalsBySide = (goals = []) => goals.reduce((counts, goal) => {
  if (goal.scoringSide === 'team' || goal.side === 'team') counts.team += 1;
  if (goal.scoringSide === 'opponent' || goal.side === 'opponent') counts.opponent += 1;
  return counts;
}, { team: 0, opponent: 0 });

export const validateDirectResultGoalCounts = (form) => {
  const teamScore = Number(form.finalTeamScore);
  const opponentScore = Number(form.finalOpponentScore);
  if (!Number.isInteger(teamScore) || !Number.isInteger(opponentScore)) return '';
  const counts = countDirectGoalsBySide(form.goals || []);
  if (counts.team !== teamScore) return `Team score is ${teamScore}, but ${counts.team} team ${entryLabel(counts.team)} been added.`;
  if (counts.opponent !== opponentScore) return `Opponent score is ${opponentScore}, but ${counts.opponent} opponent ${entryLabel(counts.opponent)} been added.`;
  return '';
};

export const buildDirectResultPayload = (form) => ({
  finalTeamScore: Number(form.finalTeamScore),
  finalOpponentScore: Number(form.finalOpponentScore),
  goals: form.goals.map((goal) => {
    const scoringSide = goal.scoringSide || goal.side || 'team';
    return {
      scoringSide,
      playerId: scoringSide === 'team' ? toTrimmedOrNull(goal.playerId) : null,
      assistPlayerId: scoringSide === 'team' ? toTrimmedOrNull(goal.assistPlayerId) : null,
      temporaryOpponentPlayerName: scoringSide === 'opponent' ? toTrimmedOrNull(goal.temporaryOpponentPlayerName) : null,
      minute: toNumberOrNull(goal.minute),
    };
  }),
  yellowCards: form.yellowCards.map((card) => ({
    side: card.side || 'team',
    playerId: card.side === 'opponent' ? null : toTrimmedOrNull(card.playerId),
    temporaryOpponentPlayerName: card.side === 'opponent' ? toTrimmedOrNull(card.temporaryOpponentPlayerName) : null,
    minute: toNumberOrNull(card.minute),
  })),
  redCards: form.redCards.map((card) => ({
    side: card.side || 'team',
    playerId: card.side === 'opponent' ? null : toTrimmedOrNull(card.playerId),
    temporaryOpponentPlayerName: card.side === 'opponent' ? toTrimmedOrNull(card.temporaryOpponentPlayerName) : null,
    minute: toNumberOrNull(card.minute),
  })),
  substitutions: form.substitutions.map((substitution) => ({
    playerOutId: toTrimmedOrNull(substitution.playerOutId),
    playerInId: toTrimmedOrNull(substitution.playerInId),
    minute: toNumberOrNull(substitution.minute),
  })),
  manOfTheMatchPlayerId: toTrimmedOrNull(form.manOfTheMatchPlayerId),
  completionNotes: String(form.completionNotes || '').trim(),
  attendance: form.attendance === '' ? null : Number(form.attendance),
  matchDuration: form.matchDuration === '' ? null : Number(form.matchDuration),
  refereeName: String(form.refereeName || '').trim(),
  venueNotes: String(form.venueNotes || '').trim(),
});

export const buildInitialDirectResultForm = (match, direct) => {
  const events = direct?.events || [];
  return {
    finalTeamScore: direct?.result?.finalTeamScore ?? match?.result?.finalTeamScore ?? '',
    finalOpponentScore: direct?.result?.finalOpponentScore ?? match?.result?.finalOpponentScore ?? '',
    goals: events.filter((event) => event.type === 'goal').map((event) => ({
      scoringSide: eventSide(event),
      playerId: event.player ? String(event.player) : '',
      assistPlayerId: event.assistPlayer ? String(event.assistPlayer) : '',
      temporaryOpponentPlayerName: event.temporaryOpponentPlayerName || '',
      minute: event.minute ?? '',
    })),
    yellowCards: events.filter((event) => event.type === 'yellow_card').map((event) => ({
      side: event.team ? 'team' : 'opponent',
      playerId: event.player ? String(event.player) : '',
      temporaryOpponentPlayerName: event.temporaryOpponentPlayerName || '',
      minute: event.minute ?? '',
    })),
    redCards: events.filter((event) => event.type === 'red_card').map((event) => ({
      side: event.team ? 'team' : 'opponent',
      playerId: event.player ? String(event.player) : '',
      temporaryOpponentPlayerName: event.temporaryOpponentPlayerName || '',
      minute: event.minute ?? '',
    })),
    substitutions: events.filter((event) => event.type === 'substitution').map((event) => ({
      playerOutId: event.playerOut ? String(event.playerOut) : '',
      playerInId: event.playerIn ? String(event.playerIn) : '',
      minute: event.minute ?? '',
    })),
    manOfTheMatchPlayerId: match?.manOfTheMatch?.player || '',
    completionNotes: match?.completionNotes || '',
    attendance: match?.attendance ?? '',
    matchDuration: match?.directResult?.matchDuration ?? 90,
    refereeName: match?.directResult?.refereeName || '',
    venueNotes: match?.directResult?.venueNotes || '',
  };
};

export default function DirectResultPage({ audience = 'team' }) {
  const { matchId } = useParams();
  const navigate = useNavigate();
  const base = `/${audience}/matches/${matchId}`;
  const apiBase = `/${audience}/matches/${matchId}`;
  const [match, setMatch] = useState(null);
  const [form, setForm] = useState(() => buildInitialDirectResultForm(null, null));
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const squad = useMemo(() => [...(match?.startingXI || []), ...(match?.substitutes || [])], [match]);
  const starters = match?.startingXI || [];
  const opponentName = match?.registeredOpponentTeam?.name || match?.opponent?.name || 'Opponent';
  const goalCountError = useMemo(() => validateDirectResultGoalCounts(form), [form]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [matchResponse, resultResponse] = await Promise.all([
        api.get(apiBase),
        api.get(`${apiBase}/direct-result`).catch((requestError) => {
          if (requestError.response?.status === 404) return { data: { data: null } };
          throw requestError;
        }),
      ]);
      const loadedMatch = matchResponse.data.data.match;
      setMatch(loadedMatch);
      setForm(buildInitialDirectResultForm(loadedMatch, resultResponse.data.data));
      setError('');
    } catch (requestError) {
      setError(requestError.userMessage);
    } finally {
      setLoading(false);
    }
  }, [apiBase]);

  useEffect(() => { load(); }, [load]);

  const update = (field, value) => setForm((current) => ({ ...current, [field]: value }));
  const updateArray = (field, index, key, value) => setForm((current) => ({
    ...current,
    [field]: current[field].map((item, itemIndex) => (itemIndex === index ? { ...item, [key]: value } : item)),
  }));
  const addRow = (field, row) => setForm((current) => ({ ...current, [field]: [...current[field], row] }));
  const removeRow = (field, index) => setForm((current) => ({ ...current, [field]: current[field].filter((_, itemIndex) => itemIndex !== index) }));

  const submit = async (event) => {
    event.preventDefault();
    if (goalCountError) {
      setError(goalCountError);
      setNotice('');
      return;
    }
    setSaving(true);
    setError('');
    setNotice('');
    try {
      await api.patch(`${apiBase}/direct-result`, buildDirectResultPayload(form));
      setNotice('Direct result saved. Statistics will use the updated match events.');
      await load();
      navigate(`${base}/result`, { replace: false });
    } catch (requestError) {
      setError(requestError.userMessage);
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <LoadingScreen />;
  if (!match) return <div className="rounded-xl border border-red-300/20 bg-red-300/10 p-4 text-red-100">{error || 'Match could not be loaded.'}</div>;

  return (
    <>
      <Link to={base} className="inline-flex items-center gap-2 text-sm font-semibold text-emerald-100/50 hover:text-lime-200"><ArrowLeft size={16} /> Back to match</Link>
      <header className="mt-6">
        <p className="eyebrow">Direct input result</p>
        <h1 className="page-title"><TeamIdentity team={match.team} name={match.team?.name || 'Your team'} logoClassName="size-10 rounded-xl" /> vs {opponentName}</h1>
        <p className="page-copy">Enter the completed result once. Editing replaces the previous direct-result events, so statistics do not double-count.</p>
      </header>
      {(error || notice) && <div className={`mt-6 rounded-xl border p-4 ${error ? 'border-red-300/20 bg-red-300/10 text-red-100' : 'border-lime-300/20 bg-lime-300/10 text-lime-100'}`}>{error || notice}</div>}
      <form className="mt-8 space-y-7" onSubmit={submit}>
        <section className="panel">
          <SectionTitle title="Starting XI and bench" copy="This match-day squad was selected while creating the match. Direct result events must use these players." />
          <div className="mt-5 grid gap-4 md:grid-cols-2">
            <SquadList title="Starting XI" players={match.startingXI || []} />
            <SquadList title="Bench players" players={match.substitutes || []} />
          </div>
        </section>

        <section className="panel">
          <SectionTitle icon={Trophy} title="Final score" copy="Scores must match the goal entries below." />
          <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Field label={`${match.team?.name || 'Team'} goals`}><input className="field-input mt-2" type="number" min="0" max="99" value={form.finalTeamScore} onChange={(event) => update('finalTeamScore', event.target.value)} required /></Field>
            <Field label={`${opponentName} goals`}><input className="field-input mt-2" type="number" min="0" max="99" value={form.finalOpponentScore} onChange={(event) => update('finalOpponentScore', event.target.value)} required /></Field>
            <Field label="Match duration"><input className="field-input mt-2" type="number" min="1" max="300" value={form.matchDuration} onChange={(event) => update('matchDuration', event.target.value)} /></Field>
            <Field label="Attendance"><input className="field-input mt-2" type="number" min="0" value={form.attendance} onChange={(event) => update('attendance', event.target.value)} /></Field>
          </div>
          {goalCountError && <p className="mt-4 rounded-xl border border-red-300/20 bg-red-300/10 px-4 py-3 text-sm font-semibold text-red-100">{goalCountError}</p>}
        </section>

        <EventRows title="Goal scorers and assists" rows={form.goals} addLabel="Add goal" onAdd={() => addRow('goals', { ...emptyGoal })} onRemove={(index) => removeRow('goals', index)}>
          {(goal, index) => <GoalRow key={index} goal={goal} index={index} squad={squad} opponentName={opponentName} onChange={updateArray} />}
        </EventRows>

        <EventRows title="Yellow cards" rows={form.yellowCards} addLabel="Add yellow card" onAdd={() => addRow('yellowCards', { ...emptyCard })} onRemove={(index) => removeRow('yellowCards', index)}>
          {(card, index) => <CardRow key={index} kind="yellowCards" card={card} index={index} squad={squad} opponentName={opponentName} onChange={updateArray} />}
        </EventRows>

        <EventRows title="Red cards" rows={form.redCards} addLabel="Add red card" onAdd={() => addRow('redCards', { ...emptyCard })} onRemove={(index) => removeRow('redCards', index)}>
          {(card, index) => <CardRow key={index} kind="redCards" card={card} index={index} squad={squad} opponentName={opponentName} onChange={updateArray} />}
        </EventRows>

        <EventRows title="Substitutions" rows={form.substitutions} addLabel="Add substitution" onAdd={() => addRow('substitutions', { ...emptySubstitution })} onRemove={(index) => removeRow('substitutions', index)}>
          {(substitution, index) => <SubstitutionRow key={index} substitution={substitution} index={index} starters={starters} squad={squad} onChange={updateArray} />}
        </EventRows>

        <section className="panel">
          <SectionTitle title="Final details" copy="These fields appear on the verified result page." />
          <div className="mt-5 grid gap-4 md:grid-cols-2">
            <Field label="Man of the Match"><select className="field-input mt-2" value={form.manOfTheMatchPlayerId} onChange={(event) => update('manOfTheMatchPlayerId', event.target.value)}><option value="">Not selected</option>{squad.map((player) => <option key={playerId(player)} value={playerId(player)}>{player.name}</option>)}</select></Field>
            <Field label="Referee name"><input className="field-input mt-2" value={form.refereeName} onChange={(event) => update('refereeName', event.target.value)} /></Field>
            <Field label="Match notes"><textarea className="field-input mt-2 min-h-28" maxLength="2000" value={form.completionNotes} onChange={(event) => update('completionNotes', event.target.value)} /></Field>
            <Field label="Venue notes"><textarea className="field-input mt-2 min-h-28" maxLength="1000" value={form.venueNotes} onChange={(event) => update('venueNotes', event.target.value)} /></Field>
          </div>
          <button className="primary-button mt-6" type="submit" disabled={saving || Boolean(goalCountError)}><Save size={16} /> {saving ? 'Saving result...' : 'Save direct result'}</button>
        </section>
      </form>
    </>
  );
}

function SectionTitle({ icon: Icon, title, copy }) {
  return <div className="flex items-start gap-3">{Icon && <span className="grid size-10 place-items-center rounded-2xl bg-lime-300/10 text-lime-200"><Icon size={18} /></span>}<div><h2 className="panel-title">{title}</h2>{copy && <p className="mt-1 text-sm text-emerald-100/45">{copy}</p>}</div></div>;
}

function SquadList({ title, players }) {
  return <div className="rounded-2xl border border-white/[0.07] bg-black/10 p-4"><div className="flex items-center justify-between gap-3"><p className="text-xs font-bold uppercase tracking-wider text-lime-200/60">{title}</p><span className="count-pill">{players.length}</span></div><div className="mt-3 space-y-2">{players.length ? players.map((player) => <div key={playerId(player)} className="flex items-center justify-between rounded-xl bg-white/[0.025] px-3 py-2 text-sm"><span className="font-semibold text-white">{player.name}</span><span className="text-emerald-100/45">#{player.jerseyNumber || '—'} · {player.position}</span></div>) : <p className="text-sm text-emerald-100/40">No players selected.</p>}</div></div>;
}

function Field({ label, children }) {
  return <label className="field-label">{label}{children}</label>;
}

function EventRows({ title, rows, addLabel, onAdd, onRemove, children }) {
  return <section className="panel"><div className="panel-heading"><h2 className="panel-title">{title}</h2><button className="secondary-button px-3" type="button" onClick={onAdd}><Plus size={15} /> {addLabel}</button></div><div className="mt-5 space-y-3">{rows.length ? rows.map((row, index) => <div key={index} className="rounded-2xl border border-white/[0.07] bg-black/10 p-4"><div className="flex items-start gap-3"><div className="flex-1">{children(row, index)}</div><button type="button" className="icon-button text-red-200/70" onClick={() => onRemove(index)} aria-label={`Remove ${title} row ${index + 1}`}><Trash2 size={16} /></button></div></div>) : <p className="rounded-2xl bg-white/[0.025] p-4 text-sm text-emerald-100/40">No entries yet.</p>}</div></section>;
}

function GoalRow({ goal, index, squad, opponentName, onChange }) {
  const teamGoal = goal.scoringSide === 'team';
  return <div className="grid gap-3 md:grid-cols-[150px_1fr_1fr_110px]"><select className="field-input" aria-label="Goal side" value={goal.scoringSide} onChange={(event) => onChange('goals', index, 'scoringSide', event.target.value)}><option value="team">Our team</option><option value="opponent">{opponentName}</option></select>{teamGoal ? <select className="field-input" aria-label="Goal scorer" value={goal.playerId} onChange={(event) => onChange('goals', index, 'playerId', event.target.value)}><option value="">Scorer</option>{squad.map((player) => <option key={playerId(player)} value={playerId(player)}>{player.name}</option>)}</select> : <input className="field-input" aria-label="Opponent scorer" placeholder="Opponent scorer" value={goal.temporaryOpponentPlayerName} onChange={(event) => onChange('goals', index, 'temporaryOpponentPlayerName', event.target.value)} />}{teamGoal ? <select className="field-input" aria-label="Assist player" value={goal.assistPlayerId} onChange={(event) => onChange('goals', index, 'assistPlayerId', event.target.value)}><option value="">No assist</option>{squad.filter((player) => playerId(player) !== goal.playerId).map((player) => <option key={playerId(player)} value={playerId(player)}>{player.name}</option>)}</select> : <input className="field-input" aria-label="Opponent assist" placeholder="Assist not tracked" disabled />}<input className="field-input" aria-label="Goal minute" type="number" min="0" max="150" placeholder="Min" value={goal.minute} onChange={(event) => onChange('goals', index, 'minute', event.target.value)} /></div>;
}

function CardRow({ kind, card, index, squad, opponentName, onChange }) {
  const teamCard = card.side === 'team';
  return <div className="grid gap-3 md:grid-cols-[150px_1fr_110px]"><select className="field-input" aria-label="Card side" value={card.side} onChange={(event) => onChange(kind, index, 'side', event.target.value)}><option value="team">Our team</option><option value="opponent">{opponentName}</option></select>{teamCard ? <select className="field-input" aria-label="Carded player" value={card.playerId} onChange={(event) => onChange(kind, index, 'playerId', event.target.value)}><option value="">Player</option>{squad.map((player) => <option key={playerId(player)} value={playerId(player)}>{player.name}</option>)}</select> : <input className="field-input" aria-label="Opponent carded player" placeholder="Opponent player" value={card.temporaryOpponentPlayerName} onChange={(event) => onChange(kind, index, 'temporaryOpponentPlayerName', event.target.value)} />}<input className="field-input" aria-label="Card minute" type="number" min="0" max="150" placeholder="Min" value={card.minute} onChange={(event) => onChange(kind, index, 'minute', event.target.value)} /></div>;
}

function SubstitutionRow({ substitution, index, starters, squad, onChange }) {
  return <div className="grid gap-3 md:grid-cols-[1fr_1fr_110px]"><select className="field-input" aria-label="Player out" value={substitution.playerOutId} onChange={(event) => onChange('substitutions', index, 'playerOutId', event.target.value)}><option value="">Player out</option>{starters.map((player) => <option key={playerId(player)} value={playerId(player)}>{player.name}</option>)}</select><select className="field-input" aria-label="Player in" value={substitution.playerInId} onChange={(event) => onChange('substitutions', index, 'playerInId', event.target.value)}><option value="">Player in</option>{squad.filter((player) => playerId(player) !== substitution.playerOutId).map((player) => <option key={playerId(player)} value={playerId(player)}>{player.name}</option>)}</select><input className="field-input" aria-label="Substitution minute" type="number" min="0" max="150" placeholder="Min" value={substitution.minute} onChange={(event) => onChange('substitutions', index, 'minute', event.target.value)} /></div>;
}
