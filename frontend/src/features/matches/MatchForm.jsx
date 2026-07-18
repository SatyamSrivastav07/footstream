import { CalendarCheck, ClipboardCheck, Plus, Radio, Search, Trash2 } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import api from '../../api/client.js';
import FootballPitchLineup, { buildFormationSlots } from '../../components/FootballPitchLineup.jsx';
import PlayerAvatar from '../squad/PlayerAvatar.jsx';
import { POSITIONS } from '../squad/constants.js';
import { emptyMatch, FORMAT_FORMATIONS, FORMAT_STARTERS, label, MATCH_FORMATS, MATCH_TYPES, TEAM_SIDES, toLocalInput } from './constants.js';

const lineupEntryKey = (entry, index) => (entry.sourceType === 'temporary' ? `temp:${index}` : `registered:${entry.player || entry.registeredPlayer}`);
const teamLogoUrl = (logo) => (typeof logo === 'string' ? logo : logo?.imageUrl || '');
const playerImageUrl = (player) => player?.photoUrl || (typeof player?.photo === 'string' ? player.photo : player?.photo?.imageUrl || player?.photo?.url || '');
const idOf = (value) => String(value?._id || value?.id || value?.player || value || '');
const positionRank = (position = '') => {
  const key = String(position).toUpperCase();
  if (key === 'GK') return 0;
  if (['LB', 'CB', 'RB'].includes(key)) return 1;
  if (['CDM', 'CM'].includes(key)) return 2;
  if (key === 'CAM') return 3;
  if (['LW', 'RW'].includes(key)) return 4;
  if (['ST', 'CF'].includes(key)) return 5;
  return 6;
};
const horizontalRank = (position = '') => {
  const key = String(position).toUpperCase();
  if (['LB', 'LW'].includes(key)) return -1;
  if (['RB', 'RW'].includes(key)) return 1;
  return 0;
};

const toForm = (match) => {
  if (!match) return { ...emptyMatch, scheduledAt: toLocalInput(new Date(Date.now() + 24 * 60 * 60 * 1000)) };
  const opponentTemporaryPlayers = [...(match.registeredOpponentStartingXI || []), ...(match.registeredOpponentSubstitutes || [])]
    .filter((entry) => entry.sourceType === 'temporary')
    .map((entry, index) => ({ tempKey: `temp:${index}`, name: entry.name || '', position: entry.position || '', jerseyNumber: entry.jerseyNumber ?? '' }));

  return {
    opponentMode: match.registeredOpponentTeam ? 'registered' : 'manual',
    registeredOpponentTeam: match.registeredOpponentTeam?._id || match.registeredOpponentTeam || '',
    opponentName: match.opponent.name,
    tournament: match.tournament || '',
    venue: match.venue,
    matchType: match.matchType,
    teamSide: match.teamSide,
    scheduledAt: toLocalInput(match.scheduledAt),
    matchFormat: match.matchFormat || '11v11',
    matchMode: match.matchMode || 'stream',
    formation: match.formation || '',
    customFormation: match.customFormation || '',
    notes: match.notes || '',
    temporaryPlayers: match.opponent.temporaryPlayers || [],
    startingPlayerIds: match.startingXI.map((entry) => String(entry.player)),
    substitutePlayerIds: match.substitutes.map((entry) => String(entry.player)),
    lineupPlacements: Object.fromEntries((match.startingXI || []).filter((entry) => entry.slotId).map((entry) => [String(entry.player), entry.slotId])),
    opponentTemporaryPlayers,
    opponentStarterKeys: (match.registeredOpponentStartingXI || []).map(lineupEntryKey),
    opponentSubstituteKeys: (match.registeredOpponentSubstitutes || []).map(lineupEntryKey),
  };
};

export default function MatchForm({ initialMatch, teamName, saving, serverError, serverFieldErrors = {}, onSubmit }) {
  const [form, setForm] = useState(() => toForm(initialMatch));
  const [players, setPlayers] = useState([]);
  const [opponentTeams, setOpponentTeams] = useState([]);
  const [opponentPlayers, setOpponentPlayers] = useState([]);
  const [loadingPlayers, setLoadingPlayers] = useState(true);
  const [loadingOpponentTeams, setLoadingOpponentTeams] = useState(false);
  const [loadingOpponentPlayers, setLoadingOpponentPlayers] = useState(false);
  const [playerError, setPlayerError] = useState('');
  const [opponentSearch, setOpponentSearch] = useState('');
  const [debouncedOpponentSearch, setDebouncedOpponentSearch] = useState('');
  const [opponentError, setOpponentError] = useState('');
  const [errors, setErrors] = useState({});
  const [dirty, setDirty] = useState(false);
  const [starterSearch, setStarterSearch] = useState('');
  const [starterPosition, setStarterPosition] = useState('');
  const [subSearch, setSubSearch] = useState('');
  const [dismissedServerError, setDismissedServerError] = useState(false);
  const [selectedPitchPlayerId, setSelectedPitchPlayerId] = useState('');

  const matchFormat = form.matchFormat || '11v11';
  const canEditDetails = initialMatch?.permissions?.canEditDetails !== false;
  const requiredStarters = FORMAT_STARTERS[matchFormat] || 11;
  const compatibleFormations = FORMAT_FORMATIONS[matchFormat] || FORMAT_FORMATIONS['11v11'];
  const displayedServerError = dismissedServerError ? '' : serverError;

  useEffect(() => setDismissedServerError(false), [serverError]);

  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedOpponentSearch(opponentSearch.trim()), 300);
    return () => window.clearTimeout(timer);
  }, [opponentSearch]);

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
      } catch (error) {
        setPlayerError(error.userMessage);
      } finally {
        setLoadingPlayers(false);
      }
    };
    load();
  }, [initialMatch]);

  useEffect(() => {
    if (!canEditDetails || form.opponentMode !== 'registered') {
      setOpponentTeams([]);
      setOpponentError('');
      return;
    }
    let active = true;
    const loadTeams = async () => {
      setLoadingOpponentTeams(true);
      try {
        const response = await api.get('/team/opponents', { params: debouncedOpponentSearch ? { search: debouncedOpponentSearch } : {} });
        if (!active) return;
        setOpponentTeams(response.data.data.teams);
        setOpponentError('');
      } catch (error) {
        if (active) setOpponentError(error.userMessage);
      } finally {
        if (active) setLoadingOpponentTeams(false);
      }
    };
    loadTeams();
    return () => { active = false; };
  }, [canEditDetails, form.opponentMode, debouncedOpponentSearch]);

  useEffect(() => {
    if (!canEditDetails || form.opponentMode !== 'registered' || !form.registeredOpponentTeam) {
      setOpponentPlayers([]);
      setLoadingOpponentPlayers(false);
      return;
    }
    let active = true;
    const loadOpponentPlayers = async () => {
      setLoadingOpponentPlayers(true);
      try {
        const response = await api.get(`/team/opponents/${form.registeredOpponentTeam}/players`);
        if (!active) return;
        setOpponentPlayers(response.data.data.players);
        setOpponentError('');
      } catch (error) {
        if (active) {
          setOpponentPlayers([]);
          setOpponentError(error.userMessage);
        }
      } finally {
        if (active) setLoadingOpponentPlayers(false);
      }
    };
    loadOpponentPlayers();
    return () => { active = false; };
  }, [canEditDetails, form.opponentMode, form.registeredOpponentTeam]);

  useEffect(() => {
    const warn = (event) => {
      if (dirty) {
        event.preventDefault();
        event.returnValue = '';
      }
    };
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [dirty]);

  const update = (field, value) => {
    setDirty(true);
    setDismissedServerError(true);
    setForm((current) => ({ ...current, [field]: value }));
  };

  const availableStarters = useMemo(() => players.filter((player) =>
    player.name.toLowerCase().includes(starterSearch.toLowerCase()) && (!starterPosition || player.position === starterPosition),
  ), [players, starterSearch, starterPosition]);

  const availableSubs = useMemo(() => players.filter((player) =>
    !form.startingPlayerIds.includes(player._id) && player.name.toLowerCase().includes(subSearch.toLowerCase()),
  ), [players, form.startingPlayerIds, subSearch]);

  const toggleStarter = (id) => {
    if (!form.startingPlayerIds.includes(id) && form.startingPlayerIds.length >= requiredStarters) return;
    setDirty(true);
    setForm((current) => ({
      ...current,
      startingPlayerIds: current.startingPlayerIds.includes(id) ? current.startingPlayerIds.filter((value) => value !== id) : [...current.startingPlayerIds, id],
      substitutePlayerIds: current.substitutePlayerIds.filter((value) => value !== id),
      lineupPlacements: current.startingPlayerIds.includes(id)
        ? Object.fromEntries(Object.entries(current.lineupPlacements || {}).filter(([playerId]) => playerId !== id))
        : current.lineupPlacements || {},
    }));
  };

  const toggleSubstitute = (id) => {
    setDirty(true);
    setForm((current) => ({
      ...current,
      substitutePlayerIds: current.substitutePlayerIds.includes(id) ? current.substitutePlayerIds.filter((value) => value !== id) : [...current.substitutePlayerIds, id],
      lineupPlacements: Object.fromEntries(Object.entries(current.lineupPlacements || {}).filter(([playerId]) => playerId !== id)),
    }));
  };

  const addTemporaryPlayer = () => update('temporaryPlayers', [...form.temporaryPlayers, { name: '', position: '', jerseyNumber: '' }]);
  const updateTemporary = (index, field, value) => update('temporaryPlayers', form.temporaryPlayers.map((player, playerIndex) => (playerIndex === index ? { ...player, [field]: value } : player)));
  const removeTemporary = (index) => update('temporaryPlayers', form.temporaryPlayers.filter((_, playerIndex) => playerIndex !== index));

  const setOpponentMode = (value) => {
    setDirty(true);
    setDismissedServerError(true);
    setOpponentPlayers([]);
    setOpponentError('');
    setForm((current) => ({
      ...current,
      opponentMode: value,
      registeredOpponentTeam: value === 'registered' ? current.registeredOpponentTeam : '',
      opponentStarterKeys: [],
      opponentSubstituteKeys: [],
      opponentTemporaryPlayers: [],
    }));
  };

  const selectOpponentTeam = (teamId) => {
    const team = opponentTeams.find((item) => item._id === teamId);
    setDirty(true);
    setDismissedServerError(true);
    setOpponentPlayers([]);
    setOpponentError('');
    setForm((current) => ({
      ...current,
      registeredOpponentTeam: teamId,
      opponentName: team?.name || current.opponentName,
      opponentStarterKeys: [],
      opponentSubstituteKeys: [],
    }));
  };

  const updateMatchFormat = (value) => {
    if (Object.keys(form.lineupPlacements || {}).length > 0 && !window.confirm('Changing match format can reset pitch placements. Continue?')) return;
    setDirty(true);
    setDismissedServerError(true);
    setForm((current) => ({
      ...current,
      matchFormat: value,
      formation: FORMAT_FORMATIONS[value]?.includes(current.formation) ? current.formation : '',
      customFormation: FORMAT_FORMATIONS[value]?.includes(current.formation) ? current.customFormation : '',
      lineupPlacements: {},
    }));
  };

  const updateFormation = (value) => {
    const slots = buildFormationSlots({ formation: value, customFormation: form.customFormation });
    const validSlots = new Set(slots.map((slot) => slot.slotId));
    const currentPlacements = form.lineupPlacements || {};
    const willDrop = Object.values(currentPlacements).some((slotId) => !validSlots.has(slotId));
    if (willDrop && !window.confirm('Changing formation will reset placements that no longer fit. Continue?')) return;
    setDirty(true);
    setDismissedServerError(true);
    setForm((current) => ({
      ...current,
      formation: value,
      customFormation: value === 'custom' ? current.customFormation : '',
      lineupPlacements: Object.fromEntries(Object.entries(current.lineupPlacements || {}).filter(([, slotId]) => validSlots.has(slotId))),
    }));
  };

  const selectedStarterSnapshots = useMemo(() => form.startingPlayerIds
    .map((id) => players.find((player) => player._id === id))
    .filter(Boolean)
    .map((player) => ({
    id: player._id,
    player: player._id,
    name: player.name,
    position: player.position,
    jersey: player.jerseyNumber,
    jerseyNumber: player.jerseyNumber,
    photoUrl: playerImageUrl(player),
    photo: player.photo,
    slotId: form.lineupPlacements?.[player._id] || '',
    isCaptain: player.isCaptain,
  })), [form.startingPlayerIds, form.lineupPlacements, players]);

  const autoPlaceStarters = () => {
    const slots = buildFormationSlots({ formation: form.formation, customFormation: form.customFormation });
    if (!slots.length) return;
    const outfieldSlots = slots.filter((slot) => slot.slotId !== 'GK').sort((a, b) => a.lineIndex - b.lineIndex || a.x - b.x);
    const starters = [...selectedStarterSnapshots].sort((a, b) =>
      positionRank(a.position) - positionRank(b.position) ||
      horizontalRank(a.position) - horizontalRank(b.position) ||
      (a.jerseyNumber || 999) - (b.jerseyNumber || 999) ||
      a.name.localeCompare(b.name));
    const next = {};
    const goalkeeper = starters.find((player) => String(player.position || '').toUpperCase() === 'GK') || starters[0];
    if (goalkeeper) next[goalkeeper.id] = 'GK';
    starters.filter((player) => player.id !== goalkeeper?.id).forEach((player, index) => {
      if (outfieldSlots[index]) next[player.id] = outfieldSlots[index].slotId;
    });
    setDirty(true);
    setSelectedPitchPlayerId('');
    setForm((current) => ({ ...current, lineupPlacements: next }));
  };

  const assignPitchSlot = (slot, currentPlayer, draggedPlayerId = '') => {
    const playerToPlace = draggedPlayerId || selectedPitchPlayerId;
    if (!playerToPlace) {
      if (currentPlayer) setSelectedPitchPlayerId(idOf(currentPlayer));
      return;
    }
    setDirty(true);
    setForm((current) => {
      const currentPlacements = current.lineupPlacements || {};
      const sourceSlot = currentPlacements[playerToPlace] || '';
      const targetPlayerId = currentPlayer ? idOf(currentPlayer) : '';
      const next = { ...currentPlacements };
      Object.keys(next).forEach((playerId) => { if (next[playerId] === slot.slotId) delete next[playerId]; });
      next[playerToPlace] = slot.slotId;
      if (targetPlayerId && sourceSlot) next[targetPlayerId] = sourceSlot;
      else if (targetPlayerId) delete next[targetPlayerId];
      return { ...current, lineupPlacements: next };
    });
    setSelectedPitchPlayerId('');
  };

  const toggleOpponentStarter = (key) => {
    if (!form.opponentStarterKeys.includes(key) && form.opponentStarterKeys.length >= requiredStarters) return;
    setDirty(true);
    setForm((current) => ({
      ...current,
      opponentStarterKeys: current.opponentStarterKeys.includes(key) ? current.opponentStarterKeys.filter((value) => value !== key) : [...current.opponentStarterKeys, key],
      opponentSubstituteKeys: current.opponentSubstituteKeys.filter((value) => value !== key),
    }));
  };

  const toggleOpponentSubstitute = (key) => {
    setDirty(true);
    setForm((current) => ({
      ...current,
      opponentSubstituteKeys: current.opponentSubstituteKeys.includes(key) ? current.opponentSubstituteKeys.filter((value) => value !== key) : [...current.opponentSubstituteKeys, key],
      opponentStarterKeys: current.opponentStarterKeys.filter((value) => value !== key),
    }));
  };

  const addOpponentTemporaryPlayer = () => update('opponentTemporaryPlayers', [...(form.opponentTemporaryPlayers || []), { tempKey: `temp:${Date.now()}:${form.opponentTemporaryPlayers?.length || 0}`, name: '', position: '', jerseyNumber: '' }]);
  const updateOpponentTemporary = (index, field, value) => update('opponentTemporaryPlayers', form.opponentTemporaryPlayers.map((player, playerIndex) => (playerIndex === index ? { ...player, [field]: value } : player)));
  const removeOpponentTemporary = (index) => {
    const key = form.opponentTemporaryPlayers[index]?.tempKey;
    update('opponentTemporaryPlayers', form.opponentTemporaryPlayers.filter((_, playerIndex) => playerIndex !== index));
    setForm((current) => ({
      ...current,
      opponentStarterKeys: current.opponentStarterKeys.filter((value) => value !== key),
      opponentSubstituteKeys: current.opponentSubstituteKeys.filter((value) => value !== key),
    }));
  };

  const validate = () => {
    const next = {};
    if (canEditDetails && form.opponentName.trim().length < 2) next.opponent = 'Enter an opponent name.';
    if (canEditDetails && form.venue.trim().length < 2) next.venue = 'Enter a venue.';
    if (canEditDetails && (!form.scheduledAt || new Date(form.scheduledAt) <= new Date())) next.scheduledAt = 'Choose a future date and kickoff time.';
    if (form.formation === 'custom' && !form.customFormation.trim()) next.customFormation = 'Describe the custom formation.';
    if (form.startingPlayerIds.length !== requiredStarters) next.startingPlayerIds = `Select exactly ${requiredStarters} starters for ${matchFormat}.`;
    if (canEditDetails && form.opponentMode !== 'registered' && form.temporaryPlayers.some((player) => player.name.trim().length < 2)) next.temporaryPlayers = 'Every temporary opponent player needs a name.';
    if (canEditDetails && form.opponentMode === 'registered') {
      if (!form.registeredOpponentTeam) next.registeredOpponentTeam = 'Choose a registered opponent team.';
      if (form.opponentStarterKeys.length !== requiredStarters) next.opponentLineup = `Select exactly ${requiredStarters} opponent starters for ${matchFormat}.`;
      if (form.opponentTemporaryPlayers.some((player) => player.name.trim().length < 2)) next.opponentTemporaryPlayers = 'Every temporary opponent player needs a name.';
    }
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const submit = (event) => {
    event.preventDefault();
    if (saving) return;
    if (!validate()) return;
    const payload = {
      formation: form.formation || null,
      customFormation: form.formation === 'custom' ? form.customFormation.trim() : '',
      startingPlayerIds: form.startingPlayerIds,
      substitutePlayerIds: form.substitutePlayerIds,
      lineupPlacements: form.lineupPlacements || {},
    };
    payload.matchFormat = matchFormat;
    if (canEditDetails) {
      const registeredOpponentPayload = (key) => {
        if (key.startsWith('registered:')) return { sourceType: 'registered', playerId: key.replace('registered:', '') };
        const player = form.opponentTemporaryPlayers.find((item) => item.tempKey === key);
        return {
          sourceType: 'temporary',
          name: player.name.trim(),
          position: player.position.trim(),
          jerseyNumber: player.jerseyNumber === '' ? null : Number(player.jerseyNumber),
        };
      };
      Object.assign(payload, {
        opponentMode: form.opponentMode || 'manual',
        tournament: form.tournament.trim(),
        venue: form.venue.trim(),
        matchType: form.matchType,
        matchMode: form.matchMode || 'stream',
        teamSide: form.teamSide,
        scheduledAt: new Date(form.scheduledAt).toISOString(),
        notes: form.notes.trim(),
      });
      if (form.opponentMode === 'registered') {
        Object.assign(payload, {
          registeredOpponentTeam: form.registeredOpponentTeam,
          opponentLineup: {
            starting: form.opponentStarterKeys.map(registeredOpponentPayload),
            substitutes: form.opponentSubstituteKeys.map(registeredOpponentPayload),
          },
        });
      } else {
        Object.assign(payload, {
          opponent: {
            name: form.opponentName.trim(),
            temporaryPlayers: form.temporaryPlayers.map((player) => ({
              name: player.name.trim(),
              position: player.position.trim(),
              jerseyNumber: player.jerseyNumber === '' ? null : Number(player.jerseyNumber),
            })),
          },
        });
      }
    }
    setDirty(false);
    onSubmit(payload);
  };

  const fieldError = (field) => errors[field] || serverFieldErrors[field];
  const selected = (ids) => ids.map((id) => players.find((player) => player._id === id)).filter(Boolean);
  const opponentByKey = (key) => {
    if (key.startsWith('registered:')) return opponentPlayers.find((player) => player._id === key.replace('registered:', ''));
    return form.opponentTemporaryPlayers.find((player) => player.tempKey === key);
  };
  const selectedOpponent = (keys) => keys.map(opponentByKey).filter(Boolean);

  return (
    <form onSubmit={submit} className="space-y-7" noValidate>
      {(displayedServerError || playerError) && <div className="rounded-xl border border-red-300/20 bg-red-300/10 px-4 py-3 text-sm text-red-100" role="alert">{displayedServerError || playerError}</div>}

      <section className="panel">
        <SectionHeader number="01" title="Match details" copy="Schedule the fixture and record the opponent without creating another team." />
        {!canEditDetails && <p className="mt-4 rounded-xl border border-lime-300/15 bg-lime-300/[0.06] p-3 text-sm text-lime-100">This registered-opponent fixture is shared. You can edit only your own lineup and formation.</p>}
        {canEditDetails && <MatchModeCards value={form.matchMode || 'stream'} onChange={(value) => update('matchMode', value)} />}
        <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {canEditDetails && <Field label="Opponent type"><select className="field-input mt-2" value={form.opponentMode || 'manual'} onChange={(event) => setOpponentMode(event.target.value)}><option value="manual">Manual / External Team</option><option value="registered">Registered Team</option></select></Field>}
          {(!canEditDetails || form.opponentMode !== 'registered') && <Field label="Opponent name" error={fieldError('opponent')}><input className="field-input mt-2" value={form.opponentName} disabled={!canEditDetails} onChange={(event) => update('opponentName', event.target.value)} /></Field>}
          <Field label="Tournament"><input className="field-input mt-2" value={form.tournament} disabled={!canEditDetails} onChange={(event) => update('tournament', event.target.value)} /></Field>
          <Field label="Venue" error={fieldError('venue')}><input className="field-input mt-2" value={form.venue} disabled={!canEditDetails} onChange={(event) => update('venue', event.target.value)} /></Field>
          <Field label="Match type"><select className="field-input mt-2" value={form.matchType} disabled={!canEditDetails} onChange={(event) => update('matchType', event.target.value)}>{MATCH_TYPES.map((type) => <option key={type} value={type}>{label(type)}</option>)}</select></Field>
          <Field label="Match Format" error={fieldError('matchFormat')}>
            <select className="field-input mt-2" value={matchFormat} disabled={!canEditDetails} onChange={(event) => updateMatchFormat(event.target.value)}>{MATCH_FORMATS.map((format) => <option key={format} value={format}>{format}</option>)}</select>
          </Field>
          <Field label="Team side"><select className="field-input mt-2" value={form.teamSide} disabled={!canEditDetails} onChange={(event) => update('teamSide', event.target.value)}>{TEAM_SIDES.map((side) => <option key={side} value={side}>{label(side)}</option>)}</select></Field>
          <Field label="Kickoff" error={fieldError('scheduledAt')}><input className="field-input mt-2" type="datetime-local" value={form.scheduledAt} disabled={!canEditDetails} onChange={(event) => update('scheduledAt', event.target.value)} /></Field>
          <Field label="Formation"><select className="field-input mt-2" value={form.formation} onChange={(event) => updateFormation(event.target.value)}><option value="">Not specified</option>{compatibleFormations.map((formation) => <option key={formation} value={formation}>{label(formation)}</option>)}</select></Field>
          {form.formation === 'custom' && <Field label="Custom formation" error={fieldError('customFormation')}><input className="field-input mt-2" value={form.customFormation} onChange={(event) => update('customFormation', event.target.value)} placeholder="2-3-2-3" /></Field>}
          <Field label="Notes" className="sm:col-span-2 xl:col-span-3"><textarea className="field-input mt-2 min-h-24 resize-y" maxLength="2000" value={form.notes} disabled={!canEditDetails} onChange={(event) => update('notes', event.target.value)} /></Field>
        </div>
        {canEditDetails && form.opponentMode === 'registered' && <RegisteredOpponentPicker teams={opponentTeams} selectedTeamId={form.registeredOpponentTeam} search={opponentSearch} loading={loadingOpponentTeams} error={fieldError('registeredOpponentTeam')} onSearch={(value) => { setDismissedServerError(true); setOpponentSearch(value); }} onSelect={selectOpponentTeam} />}
        {canEditDetails && form.opponentMode === 'registered' && <RegisteredOpponentLineup error={opponentError || fieldError('opponentLineup') || fieldError('opponentTemporaryPlayers')} loading={loadingOpponentPlayers} players={opponentPlayers} selectedTeamId={form.registeredOpponentTeam} temporaryPlayers={form.opponentTemporaryPlayers} starterKeys={form.opponentStarterKeys} substituteKeys={form.opponentSubstituteKeys} requiredStarters={requiredStarters} matchFormat={matchFormat} onStarter={toggleOpponentStarter} onSubstitute={toggleOpponentSubstitute} onAddTemporary={addOpponentTemporaryPlayer} onUpdateTemporary={updateOpponentTemporary} onRemoveTemporary={removeOpponentTemporary} />}
        {canEditDetails && form.opponentMode !== 'registered' && <ManualOpponentPlayers players={form.temporaryPlayers} error={fieldError('temporaryPlayers')} onAdd={addTemporaryPlayer} onUpdate={updateTemporary} onRemove={removeTemporary} />}
      </section>

      <section className="panel">
        <SectionHeader number="02" title="Starting lineup" copy={`Only active and available permanent squad members can be selected. ${matchFormat} requires ${requiredStarters} starters.`} count={`${form.startingPlayerIds.length}/${requiredStarters}`} />
        {fieldError('startingPlayerIds') && <p className="mt-4 text-sm text-red-200">{fieldError('startingPlayerIds')}</p>}
        <PlayerFilters search={starterSearch} setSearch={setStarterSearch} position={starterPosition} setPosition={setStarterPosition} />
        {loadingPlayers ? <div className="skeleton mt-5 h-48" /> : <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">{availableStarters.map((player) => <SelectablePlayer key={player._id} player={player} selected={form.startingPlayerIds.includes(player._id)} disabled={!form.startingPlayerIds.includes(player._id) && form.startingPlayerIds.length >= requiredStarters} onClick={() => toggleStarter(player._id)} />)}</div>}
        <div className="mt-7">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h3 className="font-display text-xl font-bold text-white">Formation pitch</h3>
              <p className="mt-1 text-sm text-emerald-100/45">Select a starter below, then click a pitch slot. Substitutions inherit this slot during live display.</p>
            </div>
            <span className="count-pill">{selectedStarterSnapshots.filter((player) => player.slotId).length}/{selectedStarterSnapshots.length} placed</span>
          </div>
          <div className="mb-4 flex flex-wrap gap-2">
            <button type="button" className="secondary-button px-3 py-2 text-xs" onClick={autoPlaceStarters} disabled={!form.formation || selectedStarterSnapshots.length === 0}>Auto-place selected XI</button>
          </div>
          <FootballPitchLineup
            formation={form.formation}
            customFormation={form.customFormation}
            starters={selectedStarterSnapshots}
            goalkeeper={selectedStarterSnapshots.find((player) => player.position === 'GK')}
            captain={selectedStarterSnapshots.find((player) => player.isCaptain)}
            selectedPlayerId={selectedPitchPlayerId}
            editable={Boolean(form.formation)}
            onSlotSelect={assignPitchSlot}
            onSlotDrop={assignPitchSlot}
          />
          {selectedStarterSnapshots.length > 0 && <div className="mt-4 flex flex-wrap gap-2">
            {selectedStarterSnapshots.map((player) => <button key={player.id} type="button" className={`rounded-full border px-3 py-1 text-xs font-bold ${selectedPitchPlayerId === player.id ? 'border-lime-300 bg-lime-300 text-slate-950' : 'border-white/10 bg-white/[0.04] text-white/70'}`} onClick={() => setSelectedPitchPlayerId((current) => current === player.id ? '' : player.id)}>{player.name}{player.slotId ? ` · ${player.slotId}` : ''}</button>)}
          </div>}
        </div>
      </section>

      <section className="panel">
        <SectionHeader number="03" title="Substitutes" copy="Optional selections from eligible players outside the Starting XI." count={`${form.substitutePlayerIds.length} selected`} />
        <div className="relative mt-5 max-w-md"><Search className="absolute left-3 top-1/2 -translate-y-1/2 text-emerald-100/30" size={16} /><input className="field-input pl-9" value={subSearch} onChange={(event) => setSubSearch(event.target.value)} placeholder="Search eligible substitutes" /></div>
        <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">{availableSubs.map((player) => <SelectablePlayer key={player._id} player={player} selected={form.substitutePlayerIds.includes(player._id)} onClick={() => toggleSubstitute(player._id)} />)}</div>
      </section>

      <section className="rounded-3xl border border-lime-300/15 bg-lime-300/[0.055] p-6">
        <SectionHeader number="04" title="Review & save" copy="Confirm the fixture and selected match-day squad." />
        <dl className="mt-6 grid gap-4 text-sm sm:grid-cols-2 lg:grid-cols-4"><Summary label="Fixture" value={`${teamName} vs ${form.opponentName || 'Opponent'}`} /><Summary label="Kickoff" value={form.scheduledAt ? new Date(form.scheduledAt).toLocaleString() : 'Not set'} /><Summary label="Match Format" value={matchFormat} /><Summary label="Formation" value={form.formation === 'custom' ? form.customFormation || 'Custom' : form.formation || 'Not set'} /><Summary label="Squad" value={`${form.startingPlayerIds.length} starters · ${form.substitutePlayerIds.length} substitutes`} /></dl>
        <div className="mt-5 grid gap-4 md:grid-cols-2"><SelectedNames title="Starting XI" players={selected(form.startingPlayerIds)} /><SelectedNames title="Substitutes" players={selected(form.substitutePlayerIds)} /></div>
        {canEditDetails && form.opponentMode === 'registered' && <div className="mt-5 grid gap-4 md:grid-cols-2"><SelectedNames title="Opponent starters" players={selectedOpponent(form.opponentStarterKeys)} /><SelectedNames title="Opponent substitutes" players={selectedOpponent(form.opponentSubstituteKeys)} /></div>}
        <button type="submit" className="primary-button mt-6 w-full sm:w-auto" disabled={saving || loadingPlayers}><CalendarCheck size={17} /> {saving ? 'Saving match…' : initialMatch ? 'Save scheduled match' : 'Schedule match'}</button>
      </section>
    </form>
  );
}

function MatchModeCards({ value, onChange }) {
  const options = [
    { value: 'stream', title: 'Stream Match', copy: 'Live timer, live scoreboard, realtime events and streaming.', icon: Radio },
    { value: 'direct', title: 'Direct Input Result', copy: 'Enter the complete result after the match ends.', icon: ClipboardCheck },
  ];
  return (
    <fieldset className="mt-6">
      <legend className="text-sm font-bold text-white">How do you want to manage this match?</legend>
      <div className="mt-3 grid gap-3 md:grid-cols-2">
        {options.map((option) => {
          const selected = value === option.value;
          const Icon = option.icon;
          return (
            <button
              key={option.value}
              type="button"
              className={`flex items-start gap-3 rounded-2xl border p-4 text-left transition ${selected ? 'border-lime-300/45 bg-lime-300/[0.09]' : 'border-white/[0.08] bg-black/10 hover:border-white/20'}`}
              aria-pressed={selected}
              onClick={() => onChange(option.value)}
            >
              <span className={`mt-1 grid size-5 place-items-center rounded-full border ${selected ? 'border-lime-300 bg-lime-300 text-emerald-950' : 'border-white/20 text-transparent'}`}>✓</span>
              <span className="grid size-11 shrink-0 place-items-center rounded-2xl bg-white/[0.04] text-lime-200"><Icon size={18} /></span>
              <span>
                <span className="block font-display text-lg font-bold text-white">{option.title}</span>
                <span className="mt-1 block text-sm leading-6 text-emerald-100/45">{option.copy}</span>
              </span>
            </button>
          );
        })}
      </div>
    </fieldset>
  );
}

function SectionHeader({ number, title, copy, count }) {
  return <div className="flex items-start justify-between gap-4"><div className="flex gap-4"><span className="font-display text-xl font-black text-lime-300/40">{number}</span><div><h2 className="font-display text-2xl font-bold text-white">{title}</h2><p className="mt-1 text-sm text-emerald-100/40">{copy}</p></div></div>{count && <span className="count-pill shrink-0">{count}</span>}</div>;
}

function Field({ label: text, error, children, className = '' }) {
  return <label className={`field-label ${className}`}>{text}{children}{error && <span className="mt-1 block text-xs text-red-200">{error}</span>}</label>;
}

function PlayerFilters({ search, setSearch, position, setPosition }) {
  return <div className="mt-5 grid gap-3 sm:grid-cols-[1fr_180px]"><label className="relative"><span className="sr-only">Search starters</span><Search className="absolute left-3 top-1/2 -translate-y-1/2 text-emerald-100/30" size={16} /><input className="field-input pl-9" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search available players" /></label><select className="field-input" aria-label="Filter starters by position" value={position} onChange={(event) => setPosition(event.target.value)}><option value="">All positions</option>{POSITIONS.map((value) => <option key={value}>{value}</option>)}</select></div>;
}

function SelectablePlayer({ player, selected, disabled, onClick }) {
  return <button type="button" disabled={disabled} onClick={onClick} className={`flex items-center gap-3 rounded-2xl border p-3 text-left transition ${selected ? 'border-lime-300/35 bg-lime-300/[0.09]' : 'border-white/[0.07] bg-black/10 hover:border-white/15'}`}><PlayerAvatar src={playerImageUrl(player)} name={player.name} className="size-12 shrink-0 rounded-xl" /><span className="min-w-0 flex-1"><span className="block truncate font-semibold text-white">{player.name}</span><span className="mt-1 block text-xs text-emerald-100/40">#{player.jerseyNumber || '—'} · {player.position}</span></span><span className={`grid size-6 place-items-center rounded-full border text-xs font-black ${selected ? 'border-lime-300 bg-lime-300 text-emerald-950' : 'border-white/15 text-transparent'}`}>✓</span></button>;
}

function Summary({ label: text, value }) {
  return <div><dt className="text-[10px] font-bold uppercase tracking-wider text-emerald-100/35">{text}</dt><dd className="mt-1 font-semibold text-white/80">{value}</dd></div>;
}

function SelectedNames({ title, players }) {
  return <div className="rounded-2xl border border-white/[0.07] bg-black/10 p-4"><p className="text-xs font-bold uppercase tracking-wider text-lime-200/60">{title}</p><p className="mt-2 text-sm leading-6 text-emerald-50/60">{players.length ? players.map((player) => player.name).join(', ') : 'None selected'}</p></div>;
}

function RegisteredOpponentPicker({ teams, selectedTeamId, search, loading, error, onSearch, onSelect }) {
  return (
    <div className="mt-6 rounded-2xl border border-white/[0.07] bg-black/10 p-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <Field label="Search registered opponent" error={error} className="min-w-64 flex-1">
          <span className="relative mt-2 block">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-emerald-100/30" size={16} />
            <input className="field-input pl-9" value={search} onChange={(event) => onSearch(event.target.value)} placeholder="Search active published teams" />
          </span>
        </Field>
        {loading && <span className="count-pill">Searching...</span>}
      </div>
      {!loading && teams.length === 0 && <p className="mt-4 rounded-xl bg-white/[0.025] p-3 text-sm text-emerald-100/45">No registered opponents found.</p>}
      <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {teams.map((team) => {
          const selected = selectedTeamId === team._id;
          const logo = teamLogoUrl(team.logo);
          return (
            <button key={team._id} type="button" onClick={() => onSelect(team._id)} className={`flex items-center gap-3 rounded-2xl border p-3 text-left transition ${selected ? 'border-lime-300/40 bg-lime-300/[0.09]' : 'border-white/[0.07] bg-white/[0.025] hover:border-white/15'}`}>
              {logo ? <img src={logo} alt="" className="size-11 rounded-xl object-cover" loading="lazy" /> : <span className="grid size-11 place-items-center rounded-xl bg-lime-300/10 text-sm font-black text-lime-200">{(team.shortName || team.name || '?').slice(0, 2).toUpperCase()}</span>}
              <span className="min-w-0 flex-1"><span className="block truncate font-semibold text-white">{team.name}</span><span className="mt-1 block truncate text-xs text-emerald-100/40">{[team.shortName, team.city].filter(Boolean).join(' · ') || 'Registered team'}</span></span>
              <span className={`grid size-6 place-items-center rounded-full border text-xs font-black ${selected ? 'border-lime-300 bg-lime-300 text-emerald-950' : 'border-white/15 text-transparent'}`}>✓</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function RegisteredOpponentLineup({ error, loading, players, selectedTeamId, temporaryPlayers = [], starterKeys = [], substituteKeys = [], requiredStarters, matchFormat, onStarter, onSubstitute, onAddTemporary, onUpdateTemporary, onRemoveTemporary }) {
  const entries = [...players.map((player) => ({ key: `registered:${player._id}`, sourceType: 'registered', ...player })), ...temporaryPlayers.map((player) => ({ key: player.tempKey, sourceType: 'temporary', photoUrl: '', ...player }))];
  return (
    <div className="mt-6 border-t border-white/[0.07] pt-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div><h3 className="font-semibold text-white">Registered opponent lineup</h3><p className="mt-1 text-xs text-emerald-100/40">Select exactly {requiredStarters} opponent starters for {matchFormat}. Registered and temporary players can be mixed.</p></div>
        <span className="count-pill">{starterKeys.length}/{requiredStarters} starters</span>
      </div>
      {error && <p className="mt-3 text-xs text-red-200">{error}</p>}
      <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
        <p className="text-xs text-emerald-100/40">{selectedTeamId ? 'The active opponent squad loads automatically after selection.' : 'Select a registered opponent to load its squad.'}</p>
        <button type="button" className="secondary-button" onClick={onAddTemporary}><Plus size={15} /> Add temporary player</button>
      </div>
      {temporaryPlayers.length > 0 && <div className="mt-4 space-y-3">{temporaryPlayers.map((player, index) => <div key={player.tempKey} className="grid gap-2 rounded-xl bg-white/[0.025] p-3 sm:grid-cols-[1fr_130px_100px_auto]"><input className="field-input" aria-label={`Temporary opponent ${index + 1} name`} placeholder="Guest name" value={player.name} onChange={(event) => onUpdateTemporary(index, 'name', event.target.value)} /><input className="field-input" aria-label={`Temporary opponent ${index + 1} position`} placeholder="Position" value={player.position} onChange={(event) => onUpdateTemporary(index, 'position', event.target.value)} /><input className="field-input" aria-label={`Temporary opponent ${index + 1} jersey`} type="number" min="1" max="99" placeholder="#" value={player.jerseyNumber} onChange={(event) => onUpdateTemporary(index, 'jerseyNumber', event.target.value)} /><button type="button" className="icon-button" onClick={() => onRemoveTemporary(index)} aria-label={`Remove temporary opponent ${index + 1}`}><Trash2 size={16} /></button></div>)}</div>}
      {loading ? <div className="skeleton mt-5 h-44" /> : <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-3">{entries.map((player) => { const starter = starterKeys.includes(player.key); const substitute = substituteKeys.includes(player.key); return <article key={player.key} className="rounded-2xl border border-white/[0.07] bg-black/10 p-3"><div className="flex items-center gap-3"><PlayerAvatar src={playerImageUrl(player)} name={player.name} className="size-11 shrink-0 rounded-xl" /><div className="min-w-0 flex-1"><p className="truncate font-semibold text-white">{player.name || 'Temporary player'}</p><p className="text-xs text-white/40">#{player.jerseyNumber || '—'} · {player.position || 'Position'} · <span className="text-lime-200">{player.sourceType === 'registered' ? 'Registered' : 'Temporary'}</span></p></div></div><div className="mt-3 grid grid-cols-2 gap-2"><button type="button" className={starter ? 'primary-button justify-center py-2 text-xs' : 'secondary-button justify-center py-2 text-xs'} disabled={!starter && starterKeys.length >= requiredStarters} onClick={() => onStarter(player.key)}>Starter</button><button type="button" className={substitute ? 'primary-button justify-center py-2 text-xs' : 'secondary-button justify-center py-2 text-xs'} onClick={() => onSubstitute(player.key)}>Sub</button></div></article>; })}</div>}
    </div>
  );
}

function ManualOpponentPlayers({ players, error, onAdd, onUpdate, onRemove }) {
  return (
    <div className="mt-6 border-t border-white/[0.07] pt-5">
      <div className="flex items-center justify-between gap-3"><div><h3 className="font-semibold text-white">Temporary opponent players</h3><p className="mt-1 text-xs text-emerald-100/40">Optional names stored only on this match.</p></div><button type="button" className="secondary-button px-3" onClick={onAdd}><Plus size={15} /> Add name</button></div>
      {error && <p className="mt-3 text-xs text-red-200">{error}</p>}
      <div className="mt-4 space-y-3">{players.map((player, index) => <div key={`${player.name}-${index}`} className="grid gap-2 rounded-xl bg-white/[0.025] p-3 sm:grid-cols-[1fr_130px_100px_auto]"><input className="field-input" aria-label={`Opponent player ${index + 1} name`} placeholder="Player name" value={player.name} onChange={(event) => onUpdate(index, 'name', event.target.value)} /><input className="field-input" aria-label={`Opponent player ${index + 1} position`} placeholder="Position" value={player.position} onChange={(event) => onUpdate(index, 'position', event.target.value)} /><input className="field-input" aria-label={`Opponent player ${index + 1} jersey number`} type="number" min="1" max="99" placeholder="#" value={player.jerseyNumber} onChange={(event) => onUpdate(index, 'jerseyNumber', event.target.value)} /><button type="button" className="icon-button" onClick={() => onRemove(index)} aria-label={`Remove opponent player ${index + 1}`}><Trash2 size={16} /></button></div>)}</div>
    </div>
  );
}
