import { ArrowLeft, CheckCircle2, Copy, Eraser, Goal, Move, RotateCcw, Save, Search, Sparkles, Star, Trash2, UsersRound } from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../api/client.js';
import EmptyState from '../components/EmptyState.jsx';
import LoadingScreen from '../components/LoadingScreen.jsx';
import TeamIdentity from '../components/TeamIdentity.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import PlayerAvatar from '../features/squad/PlayerAvatar.jsx';
import { availabilityLabel } from '../features/squad/constants.js';
import { autoArrangeTacticalPlan } from '../features/tactical/tacticalAutoArrange.js';
import { FORMATION_DEFINITIONS, getFormationDefinition, isManualFormation } from '../features/tactical/formationDefinitions.js';
import {
  createLibraryItem,
  createEmptyPlan,
  loadTacticalLibrary,
  loadTacticalPlan,
  removeTacticalLibraryItem,
  saveTacticalPlan,
  upsertTacticalLibraryItem,
} from '../features/tactical/tacticalBoardStorage.js';
import { normalizePlan, playerIdOf, validateTacticalPlan } from '../features/tactical/tacticalBoardValidation.js';
import { suggestReplacements } from '../features/tactical/tacticalSuggestions.js';

const playerImageUrl = (player) => player?.photoUrl || (typeof player?.photo === 'string' ? player.photo : player?.photo?.imageUrl || player?.photo?.url || '');
const pctFromEvent = (event, element) => {
  const rect = element.getBoundingClientRect();
  return {
    x: Math.min(95, Math.max(5, ((event.clientX - rect.left) / rect.width) * 100)),
    y: Math.min(95, Math.max(5, ((event.clientY - rect.top) / rect.height) * 100)),
  };
};

export default function TacticalBoardPage() {
  const { user } = useAuth();
  const teamId = user?.team?._id || user?.team?.id || '';
  const [players, setPlayers] = useState([]);
  const [plan, setPlan] = useState(null);
  const [selectedPlayerId, setSelectedPlayerId] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [dirty, setDirty] = useState(false);
  const [lastSavedAt, setLastSavedAt] = useState('');
  const [library, setLibrary] = useState([]);
  const [planTitle, setPlanTitle] = useState('Matchday plan');
  const [librarySearch, setLibrarySearch] = useState('');
  const [librarySort, setLibrarySort] = useState('recentlyModified');

  const playerMap = useMemo(() => new Map(players.map((player) => [playerIdOf(player), player])), [players]);
  const formation = getFormationDefinition(plan?.formation);
  const manual = isManualFormation(plan?.formation);
  const validationErrors = useMemo(() => (plan ? validateTacticalPlan(plan, players) : []), [plan, players]);
  const pitchEntries = useMemo(() => plan?.pitchPlayers || [], [plan?.pitchPlayers]);
  const benchIds = useMemo(() => plan?.benchPlayerIds || [], [plan?.benchPlayerIds]);
  const selectedPitchPlayer = useMemo(() => {
    if (!selectedPlayerId || !pitchEntries.some((entry) => entry.playerId === selectedPlayerId)) return null;
    return playerMap.get(selectedPlayerId) || null;
  }, [pitchEntries, playerMap, selectedPlayerId]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const response = await api.get('/team/players', { params: { isActive: true } });
      const loadedPlayers = response.data.data.players || [];
      const restored = loadTacticalPlan(teamId, loadedPlayers);
      const restoredLibrary = loadTacticalLibrary(teamId, loadedPlayers);
      setPlayers(loadedPlayers);
      setPlan(restored);
      setLibrary(restoredLibrary);
      setPlanTitle(restoredLibrary[0]?.title || 'Matchday plan');
      setLastSavedAt(restored.updatedAt || '');
      setError('');
    } catch (requestError) {
      setError(requestError.userMessage || 'Unable to load your squad.');
    } finally {
      setLoading(false);
    }
  }, [teamId]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    const warn = (event) => {
      if (!dirty) return;
      event.preventDefault();
      event.returnValue = '';
    };
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [dirty]);

  const mutatePlan = (updater) => {
    setPlan((current) => normalizePlan(updater(current), players, teamId));
    setDirty(true);
    setNotice('');
  };

  const changeFormation = (formationId) => {
    const nextFormation = getFormationDefinition(formationId);
    const hasPlacedPlayers = pitchEntries.length > 0;
    if (hasPlacedPlayers && !window.confirm('Changing formation may move excess players to the bench. Continue?')) return;
    mutatePlan((current) => {
      const currentPitchIds = (current?.pitchPlayers || []).map((entry) => entry.playerId);
      if (isManualFormation(formationId)) {
        const slots = getFormationDefinition('4-3-3').slots;
        return {
          ...current,
          formation: formationId,
          mode: 'manual',
          pitchPlayers: currentPitchIds.slice(0, 11).map((playerId, index) => ({
            playerId,
            slotId: null,
            x: slots[index]?.x || 50,
            y: slots[index]?.y || 50,
          })),
          benchPlayerIds: [...currentPitchIds.slice(11), ...(current?.benchPlayerIds || [])],
        };
      }
      return {
        ...current,
        formation: formationId,
        mode: 'preset',
        pitchPlayers: currentPitchIds.slice(0, nextFormation.playerCount).map((playerId, index) => ({
          playerId,
          slotId: nextFormation.slots[index]?.id,
          x: null,
          y: null,
        })).filter((entry) => entry.slotId),
        benchPlayerIds: [...currentPitchIds.slice(nextFormation.playerCount), ...(current?.benchPlayerIds || [])],
      };
    });
  };

  const placeOnPitch = ({ playerId, slotId = null, point = null, targetPlayerId = '' }) => {
    if (!playerId || !plan) return;
    mutatePlan((current) => {
      const sourceEntry = (current.pitchPlayers || []).find((entry) => entry.playerId === playerId);
      const targetEntry = targetPlayerId ? (current.pitchPlayers || []).find((entry) => entry.playerId === targetPlayerId) : null;
      const occupiedEntry = slotId ? (current.pitchPlayers || []).find((entry) => entry.slotId === slotId) : null;
      const target = targetEntry || occupiedEntry;
      let pitch = (current.pitchPlayers || []).filter((entry) => entry.playerId !== playerId && entry.playerId !== target?.playerId);
      let bench = (current.benchPlayerIds || []).filter((id) => id !== playerId && id !== target?.playerId);
      const destination = manual
        ? { playerId, slotId: null, x: point?.x ?? target?.x ?? sourceEntry?.x ?? 50, y: point?.y ?? target?.y ?? sourceEntry?.y ?? 50 }
        : { playerId, slotId: slotId || target?.slotId || sourceEntry?.slotId || formation.slots[0]?.id, x: null, y: null };
      pitch = [...pitch, destination];
      if (target?.playerId) {
        if (sourceEntry) pitch.push({ ...sourceEntry, playerId: target.playerId });
        else bench = [...bench, target.playerId];
      }
      return { ...current, pitchPlayers: pitch, benchPlayerIds: bench };
    });
    setSelectedPlayerId('');
  };

  const moveToBench = (playerId) => {
    mutatePlan((current) => ({
      ...current,
      pitchPlayers: (current.pitchPlayers || []).filter((entry) => entry.playerId !== playerId),
      benchPlayerIds: [...(current.benchPlayerIds || []).filter((id) => id !== playerId), playerId],
    }));
  };

  const replacePitchPlayer = (sourcePlayerId, benchPlayerId) => {
    if (!sourcePlayerId || !benchPlayerId || sourcePlayerId === benchPlayerId) return;
    mutatePlan((current) => ({
      ...current,
      pitchPlayers: (current.pitchPlayers || []).map((entry) => (entry.playerId === sourcePlayerId ? { ...entry, playerId: benchPlayerId } : entry)),
      benchPlayerIds: [...(current.benchPlayerIds || []).filter((id) => id !== benchPlayerId && id !== sourcePlayerId), sourcePlayerId],
      goalkeeperId: current.goalkeeperId === sourcePlayerId ? benchPlayerId : current.goalkeeperId,
    }));
    setSelectedPlayerId(benchPlayerId);
    setNotice('Replacement suggested and applied on the tactical pitch.');
  };

  const setRole = (field, playerId) => {
    mutatePlan((current) => ({
      ...current,
      [field]: current[field] === playerId ? '' : playerId,
      ...(field === 'captainId' && current.viceCaptainId === playerId ? { viceCaptainId: '' } : {}),
      ...(field === 'viceCaptainId' && current.captainId === playerId ? { captainId: '' } : {}),
    }));
  };

  const clearPitch = () => {
    if (!window.confirm('Clear the tactical pitch and move every player to the bench?')) return;
    mutatePlan((current) => ({
      ...current,
      benchPlayerIds: [...(current.pitchPlayers || []).map((entry) => entry.playerId), ...(current.benchPlayerIds || [])],
      pitchPlayers: [],
      captainId: '',
      viceCaptainId: '',
      goalkeeperId: '',
    }));
  };

  const resetFormation = () => {
    if (!window.confirm('Reset this formation? Players will stay available on the bench.')) return;
    mutatePlan((current) => ({
      ...createEmptyPlan(teamId, players),
      formation: current.formation,
      mode: isManualFormation(current.formation) ? 'manual' : 'preset',
    }));
  };

  const autoArrange = () => {
    if (dirty && pitchEntries.length > 0 && !window.confirm('Auto Arrange will update current pitch placements. Continue?')) return;
    const next = autoArrangeTacticalPlan({ teamId, formation: plan.formation, players, currentPlan: plan });
    setPlan(next);
    setDirty(true);
    setNotice('Players auto-arranged by position.');
  };

  const restoreSaved = () => {
    if (dirty && !window.confirm('Restore the last saved tactical plan and discard unsaved changes?')) return;
    const restored = loadTacticalPlan(teamId, players);
    setPlan(restored);
    setLastSavedAt(restored.updatedAt || '');
    setDirty(false);
    setNotice('Last saved tactical plan restored.');
    setSelectedPlayerId('');
  };

  const save = () => {
    const result = saveTacticalPlan(teamId, plan, players);
    if (!result.ok) {
      setError(result.errors[0]);
      return;
    }
    setPlan(result.plan);
    const item = createLibraryItem(teamId, result.plan, players, planTitle);
    setLibrary((current) => upsertTacticalLibraryItem(teamId, current, item));
    setLastSavedAt(result.plan.updatedAt);
    setDirty(false);
    setError('');
    setNotice('Tactical plan saved on this browser.');
  };

  const loadLibraryItem = (item) => {
    if (dirty && !window.confirm('Load this formation and discard unsaved changes?')) return;
    const loaded = { ...item.plan, updatedAt: item.plan.updatedAt || item.updatedAt };
    setPlan(normalizePlan(loaded, players, teamId));
    setPlanTitle(item.title);
    setLastSavedAt(item.updatedAt || loaded.updatedAt || '');
    setDirty(false);
    setNotice(`Loaded ${item.title}.`);
    const updated = { ...item, lastUsedAt: new Date().toISOString() };
    setLibrary((current) => upsertTacticalLibraryItem(teamId, current, updated));
  };

  const renameLibraryItem = (item) => {
    const title = window.prompt('Rename formation', item.title);
    if (!title?.trim()) return;
    const updated = { ...item, title: title.trim().slice(0, 80), updatedAt: new Date().toISOString() };
    setLibrary((current) => upsertTacticalLibraryItem(teamId, current, updated));
    if (planTitle === item.title) setPlanTitle(updated.title);
  };

  const duplicateLibraryItem = (item) => {
    if (library.length >= 10) {
      setError('You can save up to 10 tactical formations.');
      return;
    }
    const copy = createLibraryItem(teamId, { ...item.plan, favourite: false }, players, `${item.title} copy`);
    setLibrary((current) => upsertTacticalLibraryItem(teamId, current, copy));
    setNotice('Formation duplicated.');
  };

  const toggleFavourite = (item) => {
    const updated = { ...item, favourite: !item.favourite, updatedAt: new Date().toISOString() };
    setLibrary((current) => upsertTacticalLibraryItem(teamId, current, updated));
  };

  const deleteLibraryItem = (item) => {
    if (!window.confirm(`Delete "${item.title}" from your tactical library?`)) return;
    setLibrary((current) => removeTacticalLibraryItem(teamId, current, item.id));
    setNotice('Formation deleted from library.');
  };

  const filteredLibrary = useMemo(() => {
    const needle = librarySearch.trim().toLowerCase();
    const filtered = needle ? library.filter((item) => item.title.toLowerCase().includes(needle) || item.plan.formation.toLowerCase().includes(needle)) : library;
    return [...filtered].sort((a, b) => {
      if (librarySort === 'alphabetical') return a.title.localeCompare(b.title);
      if (librarySort === 'favourite') return Number(b.favourite) - Number(a.favourite) || a.title.localeCompare(b.title);
      if (librarySort === 'recentlyUsed') return new Date(b.lastUsedAt || 0) - new Date(a.lastUsedAt || 0);
      return new Date(b.updatedAt || 0) - new Date(a.updatedAt || 0);
    });
  }, [library, librarySearch, librarySort]);

  if (loading) return <LoadingScreen />;
  if (error && !plan) return <div className="rounded-2xl border border-red-300/20 bg-red-300/10 p-5 text-red-100">{error}</div>;

  return (
    <>
      <Link to="/team/squad" className="inline-flex items-center gap-2 text-sm font-semibold text-emerald-100/50 hover:text-lime-200"><ArrowLeft size={16} /> Back to squad</Link>
      <header className="mt-6 flex flex-col justify-between gap-6 xl:flex-row xl:items-end">
        <div>
          <p className="eyebrow"><TeamIdentity team={user.team} name={user.team?.name || 'My team'} logoClassName="size-5 rounded" /></p>
          <h1 className="page-title">Tactical Board</h1>
          <p className="page-copy">Private formation planning for training, squad rotation, and match discussion. This does not create matches, publish lineups, or update statistics.</p>
        </div>
        <StatusPill dirty={dirty} lastSavedAt={lastSavedAt} />
      </header>

      {(error || notice || validationErrors.length > 0) && (
        <div className={`mt-7 rounded-xl border px-4 py-3 text-sm ${error || validationErrors.length ? 'border-red-300/20 bg-red-300/10 text-red-100' : 'border-lime-300/15 bg-lime-300/[0.07] text-lime-100'}`} role="status" aria-live="polite">
          {error || validationErrors[0] || notice}
        </div>
      )}

      {players.length === 0 ? (
        <EmptyState title="No active squad players yet" message="Add active permanent squad players before opening the tactical board." />
      ) : (
        <div className="mt-8 grid gap-7 xl:grid-cols-[minmax(0,1fr)_360px]">
          <main className="space-y-7">
            <section className="panel">
              <div className="panel-heading">
                <div><h2 className="panel-title">Formation planner</h2><p className="mt-1 text-sm text-emerald-100/45">Choose a preset or Manual mode. Click a bench player, then a slot or pitch area. Dragging works on the manual board.</p></div>
                <span className="count-pill">{pitchEntries.length}/{formation.playerCount} on pitch</span>
              </div>
              <label className="mt-5 block text-sm font-bold text-white">Formation title<input className="field-input mt-2" value={planTitle} maxLength={80} onChange={(event) => { setPlanTitle(event.target.value); setDirty(true); }} /></label>
              <FormationSelector value={plan.formation} onChange={changeFormation} />
              <Toolbar onSave={save} onAutoArrange={autoArrange} onClear={clearPitch} onReset={resetFormation} onRestore={restoreSaved} disabled={validationErrors.length > 0} />
              <TacticalPitch
                plan={plan}
                players={players}
                playerMap={playerMap}
                selectedPlayerId={selectedPlayerId}
                setSelectedPlayerId={setSelectedPlayerId}
                onPlace={placeOnPitch}
                onBench={moveToBench}
                onRole={setRole}
                mutatePlan={mutatePlan}
              />
            </section>
          </main>
          <aside className="space-y-7">
            <TacticalLibraryPanel items={filteredLibrary} total={library.length} search={librarySearch} sort={librarySort} onSearch={setLibrarySearch} onSort={setLibrarySort} onLoad={loadLibraryItem} onRename={renameLibraryItem} onDuplicate={duplicateLibraryItem} onFavourite={toggleFavourite} onDelete={deleteLibraryItem} />
            <BenchPanel players={benchIds.map((id) => playerMap.get(id)).filter(Boolean)} selectedPlayerId={selectedPlayerId} sourcePlayer={selectedPitchPlayer} onSelect={setSelectedPlayerId} onReplace={replacePitchPlayer} onRole={setRole} plan={plan} />
            <RolePanel plan={plan} playerMap={playerMap} />
          </aside>
        </div>
      )}
    </>
  );
}

function StatusPill({ dirty, lastSavedAt }) {
  return <div className="rounded-2xl border border-white/[0.08] bg-white/[0.035] px-4 py-3 text-sm"><p className={`font-bold ${dirty ? 'text-amber-100' : 'text-lime-100'}`}>{dirty ? 'Unsaved changes' : 'Saved'}</p><p className="text-emerald-100/45">{lastSavedAt ? `Last saved at ${new Date(lastSavedAt).toLocaleString()}` : 'No saved plan yet'}</p></div>;
}

function FormationSelector({ value, onChange }) {
  return <label className="mt-5 block text-sm font-bold text-white">Formation<select className="field-input mt-2" value={value} onChange={(event) => onChange(event.target.value)}>{FORMATION_DEFINITIONS.map((formation) => <option key={formation.id} value={formation.id}>{formation.label} — {formation.description}</option>)}</select></label>;
}

function Toolbar({ onSave, onAutoArrange, onClear, onReset, onRestore, disabled }) {
  return <div className="mt-5 flex flex-wrap gap-2"><button className="primary-button" type="button" disabled={disabled} onClick={onSave}><Save size={16} /> Save Tactical Plan</button><button className="secondary-button" type="button" onClick={onAutoArrange}><Sparkles size={16} /> Auto Arrange</button><button className="secondary-button" type="button" onClick={onRestore}><RotateCcw size={16} /> Restore Saved Plan</button><button className="secondary-button" type="button" onClick={onReset}><Move size={16} /> Reset Formation</button><button className="secondary-button border-red-300/20 text-red-100" type="button" onClick={onClear}><Eraser size={16} /> Clear Pitch</button></div>;
}

function TacticalPitch({ plan, players, playerMap, selectedPlayerId, setSelectedPlayerId, onPlace, onBench, onRole, mutatePlan }) {
  const formation = getFormationDefinition(plan.formation);
  const manual = isManualFormation(plan.formation);
  const bySlot = new Map((plan.pitchPlayers || []).map((entry) => [entry.slotId, entry]));
  const onDrop = (event, slot = null) => {
    event.preventDefault();
    const playerId = event.dataTransfer.getData('text/plain');
    if (!playerId) return;
    const point = manual ? pctFromEvent(event, event.currentTarget) : null;
    onPlace({ playerId, slotId: slot?.id || null, point });
  };
  return (
    <div className="mt-6">
      <div
        className="relative min-h-[520px] overflow-hidden rounded-[2rem] border border-lime-300/20 bg-[radial-gradient(circle_at_center,rgba(190,242,100,.12),transparent_45%),linear-gradient(135deg,rgba(21,128,61,.45),rgba(2,6,23,.9))] touch-none"
        aria-label={manual ? 'Manual tactical pitch' : `${formation.label} tactical pitch`}
        onDragOver={(event) => event.preventDefault()}
        onDrop={(event) => manual && onDrop(event)}
        onClick={(event) => {
          if (!manual || !selectedPlayerId || event.target !== event.currentTarget) return;
          onPlace({ playerId: selectedPlayerId, point: pctFromEvent(event, event.currentTarget) });
        }}
      >
        <PitchLines />
        {manual ? (plan.pitchPlayers || []).map((entry) => <PitchCard key={entry.playerId} entry={entry} player={playerMap.get(entry.playerId)} plan={plan} selected={selectedPlayerId === entry.playerId} manual onSelect={setSelectedPlayerId} onBench={onBench} onRole={onRole} mutatePlan={mutatePlan} />) : formation.slots.map((slot) => {
          const entry = bySlot.get(slot.id);
          return (
            <div key={slot.id} role="button" tabIndex={0} className={`absolute -translate-x-1/2 -translate-y-1/2 text-xs text-white/50 focus:outline-none focus:ring-2 focus:ring-lime-200 ${entry ? 'rounded-full border border-transparent bg-transparent p-0' : 'grid size-14 place-items-center rounded-full border border-dashed border-white/20 bg-black/10'}`} style={{ left: `${slot.x}%`, top: `${slot.y}%` }} onDragOver={(event) => event.preventDefault()} onDrop={(event) => onDrop(event, slot)} onClick={() => selectedPlayerId && onPlace({ playerId: selectedPlayerId, slotId: slot.id })} onKeyDown={(event) => { if ((event.key === 'Enter' || event.key === ' ') && selectedPlayerId) onPlace({ playerId: selectedPlayerId, slotId: slot.id }); }} aria-label={`${slot.label} slot`}>
              {entry ? <PitchCard entry={entry} player={playerMap.get(entry.playerId)} plan={plan} selected={selectedPlayerId === entry.playerId} onSelect={setSelectedPlayerId} onBench={onBench} onRole={onRole} /> : <span>{slot.id}</span>}
            </div>
          );
        })}
      </div>
      <ul className="sr-only">{(plan.pitchPlayers || []).map((entry) => <li key={entry.playerId}>{playerMap.get(entry.playerId)?.name || 'Player'} on pitch</li>)}</ul>
      <div className="mt-4 flex flex-wrap gap-2">{players.filter((player) => (plan.pitchPlayers || []).some((entry) => entry.playerId === playerIdOf(player))).map((player) => <button key={playerIdOf(player)} type="button" className={`rounded-full border px-3 py-1 text-xs font-bold ${selectedPlayerId === playerIdOf(player) ? 'border-lime-300 bg-lime-300 text-slate-950' : 'border-white/10 bg-white/[0.04] text-white/70'}`} onClick={() => setSelectedPlayerId(selectedPlayerId === playerIdOf(player) ? '' : playerIdOf(player))}>{player.name}</button>)}</div>
    </div>
  );
}

function PitchLines() {
  return <><div className="absolute inset-4 rounded-[1.5rem] border border-white/20" /><div className="absolute left-1/2 top-1/2 size-24 -translate-x-1/2 -translate-y-1/2 rounded-full border border-white/20" /><div className="absolute left-4 right-4 top-1/2 border-t border-white/15" /><div className="absolute left-1/2 top-4 h-16 w-32 -translate-x-1/2 rounded-b-3xl border border-t-0 border-white/15" /><div className="absolute bottom-4 left-1/2 h-16 w-32 -translate-x-1/2 rounded-t-3xl border border-b-0 border-white/15" /></>;
}

function PitchCard({ entry, player, plan, selected, manual = false, onSelect, onBench, onRole, mutatePlan }) {
  if (!player) return null;
  const playerId = entry.playerId;
  const move = (event) => {
    if (!manual || event.buttons !== 1) return;
    const pitch = event.currentTarget.closest('[aria-label$="tactical pitch"]');
    if (!pitch) return;
    const point = pctFromEvent(event, pitch);
    mutatePlan((current) => ({ ...current, pitchPlayers: current.pitchPlayers.map((item) => item.playerId === playerId ? { ...item, x: point.x, y: point.y } : item) }));
  };
  return (
    <div
      draggable
      onDragStart={(event) => event.dataTransfer.setData('text/plain', playerId)}
      onPointerMove={move}
      className={`group ${manual ? 'absolute -translate-x-1/2 -translate-y-1/2' : ''}`}
      style={manual ? { left: `${entry.x}%`, top: `${entry.y}%` } : undefined}
    >
      <div className={`w-28 text-center transition ${selected ? 'scale-105 text-lime-100' : 'text-white'}`}>
        <button type="button" className="mx-auto block" onClick={(event) => { event.stopPropagation(); onSelect(selected ? '' : playerId); }} aria-label={`Select ${player.name}`}>
          <span className={`relative mx-auto block size-14 overflow-hidden rounded-full border-2 shadow-xl ${selected ? 'border-lime-300 ring-4 ring-lime-300/20' : 'border-white/25'}`}><PlayerAvatar src={playerImageUrl(player)} name={player.name} className="size-full rounded-full" /></span>
          <span className="mt-1 block truncate text-xs font-black">#{player.jerseyNumber || '—'} {player.name}</span>
        </button>
        <div className="mt-1 flex justify-center gap-1 text-[9px] font-black">
          {plan.goalkeeperId === playerId && <span className="rounded-full bg-sky-300 px-1 text-slate-950">GK</span>}
          {plan.captainId === playerId && <span className="rounded-full bg-lime-200 px-1 text-slate-950">C</span>}
          {plan.viceCaptainId === playerId && <span className="rounded-full bg-emerald-200 px-1 text-slate-950">VC</span>}
        </div>
        {selected && <CardActions playerId={playerId} onBench={onBench} onRole={onRole} />}
      </div>
    </div>
  );
}

function CardActions({ playerId, onBench, onRole }) {
  const action = (callback) => (event) => {
    event.stopPropagation();
    callback();
  };
  return <div className="mt-2 grid grid-cols-2 gap-1"><button type="button" aria-label="Captain" className="rounded bg-black/20 px-1 py-1 text-[9px]" onClick={action(() => onRole('captainId', playerId))}>C</button><button type="button" aria-label="Vice Captain" className="rounded bg-black/20 px-1 py-1 text-[9px]" onClick={action(() => onRole('viceCaptainId', playerId))}>VC</button><button type="button" aria-label="Goalkeeper" className="rounded bg-black/20 px-1 py-1 text-[9px]" onClick={action(() => onRole('goalkeeperId', playerId))}>GK</button><button type="button" className="rounded bg-red-500/25 px-1 py-1 text-[9px]" onClick={action(() => onBench(playerId))}>Bench</button></div>;
}

function BenchPanel({ players, selectedPlayerId, sourcePlayer, onSelect, onReplace, onRole, plan }) {
  const [showAll, setShowAll] = useState(false);
  useEffect(() => { setShowAll(false); }, [sourcePlayer?.id, sourcePlayer?._id, sourcePlayer?.playerId]);
  const suggestions = sourcePlayer ? suggestReplacements(sourcePlayer, players) : [];
  const visiblePlayers = sourcePlayer && !showAll ? suggestions : players;
  return (
    <section className="panel xl:sticky xl:top-6">
      <div className="panel-heading">
        <div>
          <h2 className="panel-title">{sourcePlayer ? 'Suggested replacements' : 'Bench'}</h2>
          <p className="mt-1 text-sm text-emerald-100/45">
            {sourcePlayer ? `Natural bench options for ${sourcePlayer.name}.` : 'Unplaced squad players. Click or drag a player to the pitch.'}
          </p>
        </div>
        <span className="count-pill">{players.length}</span>
      </div>
      {sourcePlayer && (
        <div className="mt-4 rounded-2xl border border-lime-300/15 bg-lime-300/[0.06] p-3 text-sm text-lime-50">
          <p className="font-bold">Replacing {sourcePlayer.name}</p>
          {!suggestions.length && <p className="mt-1 text-emerald-100/55">No natural replacement found.</p>}
          <button className="secondary-button mt-3 px-3 py-1.5 text-xs" type="button" onClick={() => setShowAll((current) => !current)}>
            {showAll ? 'Show suggested players' : 'Show All Players'}
          </button>
        </div>
      )}
      <div className="mt-4 max-h-[620px] space-y-3 overflow-y-auto pr-1">
        {visiblePlayers.length ? visiblePlayers.map((player) => {
          const id = playerIdOf(player);
          return (
            <article key={id} draggable onDragStart={(event) => event.dataTransfer.setData('text/plain', id)} className={`rounded-2xl border p-3 ${selectedPlayerId === id ? 'border-lime-300/45 bg-lime-300/[0.09]' : 'border-white/[0.07] bg-black/10'}`}>
              <button type="button" className="flex w-full items-center gap-3 text-left" onClick={() => onSelect(selectedPlayerId === id ? '' : id)}>
                <PlayerAvatar src={playerImageUrl(player)} name={player.name} className="size-12 rounded-xl" />
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-bold text-white">{player.name}</span>
                  <span className="text-xs text-white/45">#{player.jerseyNumber || '—'} · {player.position || 'Position'} · {availabilityLabel(player.availabilityStatus || 'available')}</span>
                </span>
              </button>
              {sourcePlayer && (
                <button className="primary-button mt-3 w-full justify-center px-3 py-1.5 text-xs" type="button" onClick={() => onReplace(playerIdOf(sourcePlayer), id)}>
                  Replace {sourcePlayer.name}
                </button>
              )}
              {selectedPlayerId === id && !sourcePlayer && (
                <div className="mt-3 flex flex-wrap gap-2">
                  <button className="secondary-button px-2 py-1 text-xs" type="button" onClick={() => onRole('captainId', id)}>Captain</button>
                  <button className="secondary-button px-2 py-1 text-xs" type="button" onClick={() => onRole('viceCaptainId', id)}>Vice</button>
                  <button className="secondary-button px-2 py-1 text-xs" type="button" onClick={() => onRole('goalkeeperId', id)}>GK</button>
                </div>
              )}
              <div className="mt-2 flex gap-1 text-[10px] font-black">{plan.captainId === id && <span className="rounded bg-lime-300 px-1 text-slate-950">C</span>}{plan.viceCaptainId === id && <span className="rounded bg-emerald-200 px-1 text-slate-950">VC</span>}{plan.goalkeeperId === id && <span className="rounded bg-sky-300 px-1 text-slate-950">GK</span>}</div>
            </article>
          );
        }) : <p className="rounded-2xl bg-white/[0.025] p-4 text-sm text-emerald-100/40">{sourcePlayer ? 'No natural replacement found. Use Show All Players to view the full bench.' : 'No bench players. Clear or move players back from the pitch.'}</p>}
      </div>
    </section>
  );
}

function TacticalLibraryPanel({ items, total, search, sort, onSearch, onSort, onLoad, onRename, onDuplicate, onFavourite, onDelete }) {
  return (
    <section className="panel">
      <div className="panel-heading">
        <div><h2 className="panel-title">Tactical Library</h2><p className="mt-1 text-sm text-emerald-100/45">Save up to 10 reusable formations.</p></div>
        <span className="count-pill">{total}/10</span>
      </div>
      <label className="mt-4 flex items-center gap-2 rounded-2xl border border-white/10 bg-white/[0.035] px-3 py-2 text-sm text-white/50">
        <Search size={15} /><span className="sr-only">Search tactical formations</span>
        <input className="w-full bg-transparent text-white outline-none" value={search} onChange={(event) => onSearch(event.target.value)} placeholder="Search formations" />
      </label>
      <label className="field-label mt-3">Sort by<select className="field-input mt-2" value={sort} onChange={(event) => onSort(event.target.value)}><option value="recentlyModified">Recently Modified</option><option value="recentlyUsed">Recently Used</option><option value="alphabetical">Alphabetical</option><option value="favourite">Favourite</option></select></label>
      <div className="mt-4 max-h-[520px] space-y-3 overflow-y-auto pr-1">
        {items.length ? items.map((item) => (
          <article key={item.id} className="rounded-2xl border border-white/[0.07] bg-black/10 p-3">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0"><h3 className="truncate font-bold text-white">{item.title}</h3><p className="text-xs text-white/40">{item.plan.formation} · {item.plan.pitchPlayers.length} on pitch</p></div>
              <button type="button" className={`rounded-full p-1 ${item.favourite ? 'text-amber-200' : 'text-white/35'}`} onClick={() => onFavourite(item)} aria-label={item.favourite ? `Remove ${item.title} from favourites` : `Favourite ${item.title}`}><Star size={16} fill={item.favourite ? 'currentColor' : 'none'} /></button>
            </div>
            <FormationMiniPreview item={item} />
            <div className="mt-3 flex flex-wrap gap-2">
              <button type="button" className="primary-button px-3 py-1.5 text-xs" onClick={() => onLoad(item)}>Load</button>
              <button type="button" className="secondary-button px-3 py-1.5 text-xs" onClick={() => onRename(item)}>Rename</button>
              <button type="button" className="secondary-button px-3 py-1.5 text-xs" onClick={() => onDuplicate(item)}><Copy size={13} /> Duplicate</button>
              <button type="button" className="secondary-button border-red-300/20 px-3 py-1.5 text-xs text-red-100" onClick={() => onDelete(item)}><Trash2 size={13} /> Delete</button>
            </div>
          </article>
        )) : <p className="rounded-2xl border border-dashed border-white/10 p-4 text-sm text-white/45">No saved formations yet. Save your current tactical plan to start the library.</p>}
      </div>
    </section>
  );
}

function FormationMiniPreview({ item }) {
  return <div className="relative mt-3 h-24 overflow-hidden rounded-xl border border-lime-300/10 bg-emerald-950/45">{(item.preview?.pitchPlayers || []).slice(0, 11).map((entry, index) => <span key={`${item.id}-${entry.playerId || index}`} className="absolute size-2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-lime-300" style={{ left: `${entry.x || 50}%`, top: `${entry.y || 50}%` }} />)}</div>;
}

function RolePanel({ plan, playerMap }) {
  const name = (id) => playerMap.get(id)?.name || 'Not assigned';
  return <section className="panel"><div className="flex items-center gap-3"><span className="grid size-10 place-items-center rounded-2xl bg-lime-300/10 text-lime-200"><Goal size={18} /></span><div><h2 className="panel-title">Roles</h2><p className="text-sm text-emerald-100/45">One Captain, Vice Captain, and Goalkeeper per tactical plan.</p></div></div><dl className="mt-5 space-y-3 text-sm"><Role label="Captain" value={name(plan.captainId)} /><Role label="Vice Captain" value={name(plan.viceCaptainId)} /><Role label="Goalkeeper" value={name(plan.goalkeeperId)} /></dl><p className="mt-5 flex items-center gap-2 text-xs text-emerald-100/45"><CheckCircle2 size={14} /> Partial tactical plans can be saved.</p></section>;
}

function Role({ label, value }) {
  return <div className="flex items-center justify-between rounded-xl bg-white/[0.035] px-3 py-2"><dt className="text-emerald-100/45">{label}</dt><dd className="font-bold text-white">{value}</dd></div>;
}
