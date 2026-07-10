import { CalendarCheck, Plus, Search, Trash2 } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import api from '../../api/client.js';
import PlayerAvatar from '../squad/PlayerAvatar.jsx';
import { POSITIONS } from '../squad/constants.js';
import { emptyMatch, FORMATIONS, label, MATCH_TYPES, TEAM_SIDES, toLocalInput } from './constants.js';

const toForm = (match) => match ? {
  opponentName: match.opponent.name,
  tournament: match.tournament || '',
  venue: match.venue,
  matchType: match.matchType,
  teamSide: match.teamSide,
  scheduledAt: toLocalInput(match.scheduledAt),
  formation: match.formation || '',
  customFormation: match.customFormation || '',
  notes: match.notes || '',
  temporaryPlayers: match.opponent.temporaryPlayers || [],
  startingPlayerIds: match.startingXI.map((entry) => String(entry.player)),
  substitutePlayerIds: match.substitutes.map((entry) => String(entry.player)),
} : { ...emptyMatch, scheduledAt: toLocalInput(new Date(Date.now() + 24 * 60 * 60 * 1000)) };

export default function MatchForm({ initialMatch, teamName, saving, serverError, serverFieldErrors = {}, onSubmit }) {
  const [form, setForm] = useState(() => toForm(initialMatch));
  const [players, setPlayers] = useState([]);
  const [loadingPlayers, setLoadingPlayers] = useState(true);
  const [playerError, setPlayerError] = useState('');
  const [errors, setErrors] = useState({});
  const [dirty, setDirty] = useState(false);
  const [starterSearch, setStarterSearch] = useState('');
  const [starterPosition, setStarterPosition] = useState('');
  const [subSearch, setSubSearch] = useState('');

  useEffect(() => {
    const load = async () => {
      try {
        const response = await api.get('/team/players', { params: { isActive: true, availabilityStatus: 'available' } });
        setPlayers(response.data.data.players);
        if (initialMatch) {
          const eligible = new Set(response.data.data.players.map((player) => player._id));
          setForm((current) => ({
            ...current,
            startingPlayerIds: current.startingPlayerIds.filter((id) => eligible.has(id)),
            substitutePlayerIds: current.substitutePlayerIds.filter((id) => eligible.has(id)),
          }));
        }
      } catch (error) { setPlayerError(error.userMessage); }
      finally { setLoadingPlayers(false); }
    };
    load();
  }, [initialMatch]);

  useEffect(() => {
    const warn = (event) => { if (dirty) { event.preventDefault(); event.returnValue = ''; } };
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [dirty]);

  const update = (field, value) => { setDirty(true); setForm((current) => ({ ...current, [field]: value })); };
  const availableStarters = useMemo(() => players.filter((player) =>
    player.name.toLowerCase().includes(starterSearch.toLowerCase()) && (!starterPosition || player.position === starterPosition),
  ), [players, starterSearch, starterPosition]);
  const availableSubs = useMemo(() => players.filter((player) =>
    !form.startingPlayerIds.includes(player._id) && player.name.toLowerCase().includes(subSearch.toLowerCase()),
  ), [players, form.startingPlayerIds, subSearch]);

  const toggleStarter = (id) => {
    if (!form.startingPlayerIds.includes(id) && form.startingPlayerIds.length >= 11) return;
    setDirty(true);
    setForm((current) => ({
      ...current,
      startingPlayerIds: current.startingPlayerIds.includes(id) ? current.startingPlayerIds.filter((value) => value !== id) : [...current.startingPlayerIds, id],
      substitutePlayerIds: current.substitutePlayerIds.filter((value) => value !== id),
    }));
  };

  const toggleSubstitute = (id) => {
    setDirty(true);
    setForm((current) => ({ ...current, substitutePlayerIds: current.substitutePlayerIds.includes(id) ? current.substitutePlayerIds.filter((value) => value !== id) : [...current.substitutePlayerIds, id] }));
  };

  const addTemporaryPlayer = () => update('temporaryPlayers', [...form.temporaryPlayers, { name: '', position: '', jerseyNumber: '' }]);
  const updateTemporary = (index, field, value) => update('temporaryPlayers', form.temporaryPlayers.map((player, playerIndex) => playerIndex === index ? { ...player, [field]: value } : player));
  const removeTemporary = (index) => update('temporaryPlayers', form.temporaryPlayers.filter((_, playerIndex) => playerIndex !== index));

  const validate = () => {
    const next = {};
    if (form.opponentName.trim().length < 2) next.opponent = 'Enter an opponent name.';
    if (form.venue.trim().length < 2) next.venue = 'Enter a venue.';
    if (!form.scheduledAt || new Date(form.scheduledAt) <= new Date()) next.scheduledAt = 'Choose a future date and kickoff time.';
    if (form.formation === 'custom' && !form.customFormation.trim()) next.customFormation = 'Describe the custom formation.';
    if (form.startingPlayerIds.length !== 11) next.startingPlayerIds = 'Select exactly 11 starters.';
    if (form.temporaryPlayers.some((player) => player.name.trim().length < 2)) next.temporaryPlayers = 'Every temporary opponent player needs a name.';
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const submit = (event) => {
    event.preventDefault();
    if (!validate()) return;
    const payload = {
      opponent: {
        name: form.opponentName.trim(),
        temporaryPlayers: form.temporaryPlayers.map((player) => ({
          name: player.name.trim(), position: player.position.trim(),
          jerseyNumber: player.jerseyNumber === '' ? null : Number(player.jerseyNumber),
        })),
      },
      tournament: form.tournament.trim(), venue: form.venue.trim(), matchType: form.matchType,
      teamSide: form.teamSide, scheduledAt: new Date(form.scheduledAt).toISOString(),
      formation: form.formation || null,
      customFormation: form.formation === 'custom' ? form.customFormation.trim() : '',
      startingPlayerIds: form.startingPlayerIds, substitutePlayerIds: form.substitutePlayerIds,
      notes: form.notes.trim(),
    };
    setDirty(false);
    onSubmit(payload);
  };

  const fieldError = (field) => errors[field] || serverFieldErrors[field];
  const selected = (ids) => ids.map((id) => players.find((player) => player._id === id)).filter(Boolean);

  return (
    <form onSubmit={submit} className="space-y-7" noValidate>
      {(serverError || playerError) && <div className="rounded-xl border border-red-300/20 bg-red-300/10 px-4 py-3 text-sm text-red-100" role="alert">{serverError || playerError}</div>}

      <section className="panel"><SectionHeader number="01" title="Match details" copy="Schedule the fixture and record the opponent without creating another team." />
        <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          <Field label="Opponent name" error={fieldError('opponent')}><input className="field-input mt-2" value={form.opponentName} onChange={(e) => update('opponentName', e.target.value)} /></Field>
          <Field label="Tournament"><input className="field-input mt-2" value={form.tournament} onChange={(e) => update('tournament', e.target.value)} /></Field>
          <Field label="Venue" error={fieldError('venue')}><input className="field-input mt-2" value={form.venue} onChange={(e) => update('venue', e.target.value)} /></Field>
          <Field label="Match type"><select className="field-input mt-2" value={form.matchType} onChange={(e) => update('matchType', e.target.value)}>{MATCH_TYPES.map((type) => <option key={type} value={type}>{label(type)}</option>)}</select></Field>
          <Field label="Team side"><select className="field-input mt-2" value={form.teamSide} onChange={(e) => update('teamSide', e.target.value)}>{TEAM_SIDES.map((side) => <option key={side} value={side}>{label(side)}</option>)}</select></Field>
          <Field label="Kickoff" error={fieldError('scheduledAt')}><input className="field-input mt-2" type="datetime-local" value={form.scheduledAt} onChange={(e) => update('scheduledAt', e.target.value)} /></Field>
          <Field label="Formation"><select className="field-input mt-2" value={form.formation} onChange={(e) => update('formation', e.target.value)}><option value="">Not specified</option>{FORMATIONS.map((formation) => <option key={formation} value={formation}>{label(formation)}</option>)}</select></Field>
          {form.formation === 'custom' && <Field label="Custom formation" error={fieldError('customFormation')}><input className="field-input mt-2" value={form.customFormation} onChange={(e) => update('customFormation', e.target.value)} placeholder="2-3-2-3" /></Field>}
          <Field label="Notes" className="sm:col-span-2 xl:col-span-3"><textarea className="field-input mt-2 min-h-24 resize-y" maxLength="2000" value={form.notes} onChange={(e) => update('notes', e.target.value)} /></Field>
        </div>
        <div className="mt-6 border-t border-white/[0.07] pt-5"><div className="flex items-center justify-between gap-3"><div><h3 className="font-semibold text-white">Temporary opponent players</h3><p className="mt-1 text-xs text-emerald-100/40">Optional names stored only on this match.</p></div><button type="button" className="secondary-button px-3" onClick={addTemporaryPlayer}><Plus size={15} /> Add name</button></div>
          {fieldError('temporaryPlayers') && <p className="mt-3 text-xs text-red-200">{fieldError('temporaryPlayers')}</p>}
          <div className="mt-4 space-y-3">{form.temporaryPlayers.map((player, index) => <div key={index} className="grid gap-2 rounded-xl bg-white/[0.025] p-3 sm:grid-cols-[1fr_130px_100px_auto]"><input className="field-input" aria-label={`Opponent player ${index + 1} name`} placeholder="Player name" value={player.name} onChange={(e) => updateTemporary(index, 'name', e.target.value)} /><input className="field-input" aria-label={`Opponent player ${index + 1} position`} placeholder="Position" value={player.position} onChange={(e) => updateTemporary(index, 'position', e.target.value)} /><input className="field-input" aria-label={`Opponent player ${index + 1} jersey number`} type="number" min="1" max="99" placeholder="#" value={player.jerseyNumber} onChange={(e) => updateTemporary(index, 'jerseyNumber', e.target.value)} /><button type="button" className="icon-button" onClick={() => removeTemporary(index)} aria-label={`Remove opponent player ${index + 1}`}><Trash2 size={16} /></button></div>)}</div>
        </div>
      </section>

      <section className="panel"><SectionHeader number="02" title="Starting XI" copy="Only active and available permanent squad members can be selected." count={`${form.startingPlayerIds.length}/11`} />
        {fieldError('startingPlayerIds') && <p className="mt-4 text-sm text-red-200">{fieldError('startingPlayerIds')}</p>}
        <PlayerFilters search={starterSearch} setSearch={setStarterSearch} position={starterPosition} setPosition={setStarterPosition} />
        {loadingPlayers ? <div className="skeleton mt-5 h-48" /> : <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">{availableStarters.map((player) => <SelectablePlayer key={player._id} player={player} selected={form.startingPlayerIds.includes(player._id)} disabled={!form.startingPlayerIds.includes(player._id) && form.startingPlayerIds.length >= 11} onClick={() => toggleStarter(player._id)} />)}</div>}
      </section>

      <section className="panel"><SectionHeader number="03" title="Substitutes" copy="Optional selections from eligible players outside the Starting XI." count={`${form.substitutePlayerIds.length} selected`} />
        <div className="relative mt-5 max-w-md"><Search className="absolute left-3 top-1/2 -translate-y-1/2 text-emerald-100/30" size={16} /><input className="field-input pl-9" value={subSearch} onChange={(e) => setSubSearch(e.target.value)} placeholder="Search eligible substitutes" /></div>
        <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">{availableSubs.map((player) => <SelectablePlayer key={player._id} player={player} selected={form.substitutePlayerIds.includes(player._id)} onClick={() => toggleSubstitute(player._id)} />)}</div>
      </section>

      <section className="rounded-3xl border border-lime-300/15 bg-lime-300/[0.055] p-6"><SectionHeader number="04" title="Review & save" copy="Confirm the fixture and selected match-day squad." />
        <dl className="mt-6 grid gap-4 text-sm sm:grid-cols-2 lg:grid-cols-4"><Summary label="Fixture" value={`${teamName} vs ${form.opponentName || 'Opponent'}`} /><Summary label="Kickoff" value={form.scheduledAt ? new Date(form.scheduledAt).toLocaleString() : 'Not set'} /><Summary label="Formation" value={form.formation === 'custom' ? form.customFormation || 'Custom' : form.formation || 'Not set'} /><Summary label="Squad" value={`${form.startingPlayerIds.length} starters · ${form.substitutePlayerIds.length} substitutes`} /></dl>
        <div className="mt-5 grid gap-4 md:grid-cols-2"><SelectedNames title="Starting XI" players={selected(form.startingPlayerIds)} /><SelectedNames title="Substitutes" players={selected(form.substitutePlayerIds)} /></div>
        <button type="submit" className="primary-button mt-6 w-full sm:w-auto" disabled={saving || loadingPlayers}><CalendarCheck size={17} /> {saving ? 'Saving match…' : initialMatch ? 'Save scheduled match' : 'Schedule match'}</button>
      </section>
    </form>
  );
}

function SectionHeader({ number, title, copy, count }) { return <div className="flex items-start justify-between gap-4"><div className="flex gap-4"><span className="font-display text-xl font-black text-lime-300/40">{number}</span><div><h2 className="font-display text-2xl font-bold text-white">{title}</h2><p className="mt-1 text-sm text-emerald-100/40">{copy}</p></div></div>{count && <span className="count-pill shrink-0">{count}</span>}</div>; }
function Field({ label: text, error, children, className = '' }) { return <label className={`field-label ${className}`}>{text}{children}{error && <span className="mt-1 block text-xs text-red-200">{error}</span>}</label>; }
function PlayerFilters({ search, setSearch, position, setPosition }) { return <div className="mt-5 grid gap-3 sm:grid-cols-[1fr_180px]"><label className="relative"><span className="sr-only">Search starters</span><Search className="absolute left-3 top-1/2 -translate-y-1/2 text-emerald-100/30" size={16} /><input className="field-input pl-9" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search available players" /></label><select className="field-input" aria-label="Filter starters by position" value={position} onChange={(e) => setPosition(e.target.value)}><option value="">All positions</option>{POSITIONS.map((value) => <option key={value}>{value}</option>)}</select></div>; }
function SelectablePlayer({ player, selected, disabled, onClick }) { return <button type="button" disabled={disabled} onClick={onClick} className={`flex items-center gap-3 rounded-2xl border p-3 text-left transition ${selected ? 'border-lime-300/35 bg-lime-300/[0.09]' : 'border-white/[0.07] bg-black/10 hover:border-white/15'}`}><PlayerAvatar src={player.photoUrl} name={player.name} className="size-12 shrink-0 rounded-xl" /><span className="min-w-0 flex-1"><span className="block truncate font-semibold text-white">{player.name}</span><span className="mt-1 block text-xs text-emerald-100/40">#{player.jerseyNumber || '—'} · {player.position}</span></span><span className={`grid size-6 place-items-center rounded-full border text-xs font-black ${selected ? 'border-lime-300 bg-lime-300 text-emerald-950' : 'border-white/15 text-transparent'}`}>✓</span></button>; }
function Summary({ label: text, value }) { return <div><dt className="text-[10px] font-bold uppercase tracking-wider text-emerald-100/35">{text}</dt><dd className="mt-1 font-semibold text-white/80">{value}</dd></div>; }
function SelectedNames({ title, players }) { return <div className="rounded-2xl border border-white/[0.07] bg-black/10 p-4"><p className="text-xs font-bold uppercase tracking-wider text-lime-200/60">{title}</p><p className="mt-2 text-sm leading-6 text-emerald-50/60">{players.length ? players.map((player) => player.name).join(', ') : 'None selected'}</p></div>; }

