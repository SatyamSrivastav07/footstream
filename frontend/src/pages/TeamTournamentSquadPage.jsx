import { Camera, CheckCircle2, Crown, Lock, Shield, Trash2, Unlock, Upload, UserPlus } from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import EmptyState from '../components/EmptyState.jsx';
import { tournamentApi, unwrapData } from '../features/tournaments/api.js';
import { StatusBadge, TournamentLogo, imageUrl } from '../features/tournaments/TournamentUi.jsx';
import { TOURNAMENT_PARTICIPANT_TYPE, formatTournamentLabel, startersForMatchFormat } from '../features/tournaments/constants.js';

const positions = ['GK', 'RB', 'CB', 'LB', 'CDM', 'CM', 'CAM', 'RW', 'LW', 'CF', 'ST'];

export default function TeamTournamentSquadPage() {
  const { tournamentId, participantId } = useParams();
  const [tournament, setTournament] = useState(null);
  const [squad, setSquad] = useState(null);
  const [eligible, setEligible] = useState([]);
  const [history, setHistory] = useState([]);
  const [manual, setManual] = useState({ name: '', position: 'CM', jersey: '', isGoalkeeper: false });
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const participant = squad?.participant;
  const locked = squad?.status === 'locked';
  const readOnly = ['submitted', 'approved', 'locked'].includes(squad?.status);
  const canUseRegisteredPlayers = participant?.participantType !== TOURNAMENT_PARTICIPANT_TYPE.EXTERNAL_TEAM;

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [tournamentResponse, squadResponse, historyResponse] = await Promise.all([
        tournamentApi.getHosted(tournamentId),
        tournamentApi.createSquad(tournamentId, participantId),
        tournamentApi.squadHistory(tournamentId, participantId).catch(() => ({ data: { data: { history: [] } } })),
      ]);
      const nextSquad = unwrapData(squadResponse).squad;
      setTournament(unwrapData(tournamentResponse).tournament);
      setSquad(nextSquad);
      setHistory(unwrapData(historyResponse).history || []);
      setError('');
    } catch (requestError) {
      setError(requestError.userMessage);
    } finally {
      setLoading(false);
    }
  }, [participantId, tournamentId]);

  const loadEligible = useCallback(async () => {
    if (!participant || !canUseRegisteredPlayers) return;
    try {
      const response = await tournamentApi.eligiblePlayers(tournamentId, participantId, { search });
      setEligible(unwrapData(response).players || []);
    } catch (requestError) {
      setError(requestError.userMessage);
    }
  }, [canUseRegisteredPlayers, participant, participantId, search, tournamentId]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => { loadEligible(); }, [loadEligible]);

  const run = async (callback) => {
    setSaving(true);
    setError('');
    try {
      await callback();
      await load();
      await loadEligible();
    } catch (requestError) {
      setError(requestError.userMessage);
    } finally {
      setSaving(false);
    }
  };

  const addManual = () => run(async () => {
    await tournamentApi.addManualSquadPlayer(tournamentId, participantId, { ...manual, jersey: manual.jersey || undefined });
    setManual({ name: '', position: 'CM', jersey: '', isGoalkeeper: false });
  });

  const action = (name) => ({
    submit: () => tournamentApi.submitSquad(tournamentId, participantId),
    approve: () => tournamentApi.approveSquad(tournamentId, participantId),
    lock: () => tournamentApi.lockSquad(tournamentId, participantId),
    unlock: () => tournamentApi.unlockSquad(tournamentId, participantId),
  }[name]);

  const countLabel = useMemo(() => `${squad?.playerCount || squad?.players?.length || 0}/${tournament?.maximumSquad || '-'}`, [squad, tournament]);
  const minimumSquad = useMemo(
    () => startersForMatchFormat(tournament?.matchFormat, tournament?.playersOnField) || tournament?.minimumSquad || '-',
    [tournament],
  );

  if (loading) return <div className="skeleton h-96" />;
  if (error && !squad) return <ErrorBox error={error} onRetry={load} />;
  if (!squad) return <EmptyState title="Squad unavailable" message="This participant squad could not be loaded." />;

  return (
    <>
      <header className="flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
        <div className="flex items-center gap-4">
          <TournamentLogo tournament={tournament} className="size-16" />
          <div>
            <p className="eyebrow">Tournament squad</p>
            <h1 className="page-title">{participant?.displayName || 'Participant'}</h1>
            <p className="page-copy">{formatTournamentLabel(participant?.participantType)} · {countLabel} players · minimum {minimumSquad}</p>
          </div>
        </div>
        <Link className="secondary-button" to={`/team/tournaments/${tournamentId}`}>Back to Tournament</Link>
      </header>

      {error && <div className="mt-6 rounded-2xl border border-red-300/20 bg-red-300/10 p-4 text-red-100" role="alert">{error}</div>}

      <section className="mt-7 grid gap-4 lg:grid-cols-4">
        <Info title="Status" value={<StatusBadge tone={locked ? 'lime' : 'neutral'}>{formatTournamentLabel(squad.status)}</StatusBadge>} />
        <Info title="Captain" value={squad.captain?.name || 'Required'} />
        <Info title="Vice Captain" value={squad.viceCaptain?.name || 'Optional'} />
        <Info title="Goalkeeper" value={(squad.players || []).some((player) => player.goalkeeper || player.position === 'GK') ? 'Selected' : 'Optional'} />
      </section>

      <section className="mt-7 rounded-3xl border border-white/[0.08] bg-white/[0.035] p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="eyebrow">Workflow</p>
            <h2 className="font-display text-3xl font-black">Squad actions</h2>
          </div>
          <div className="flex flex-wrap gap-2">
            {squad.status === 'draft' || squad.status === 'rejected' ? <button type="button" className="secondary-button" disabled={saving} onClick={() => run(action('submit'))}><CheckCircle2 size={16} /> Submit</button> : null}
            {squad.status === 'submitted' ? <button type="button" className="secondary-button" disabled={saving} onClick={() => run(action('approve'))}><Shield size={16} /> Approve</button> : null}
            {squad.status === 'approved' ? <button type="button" className="primary-button" disabled={saving} onClick={() => run(action('lock'))}><Lock size={16} /> Lock Squad</button> : null}
            {squad.status === 'locked' ? <button type="button" className="secondary-button" disabled={saving} onClick={() => run(action('unlock'))}><Unlock size={16} /> Unlock</button> : null}
          </div>
        </div>
        {readOnly && <p className="mt-4 text-sm text-amber-100/75">Player edits are disabled while this squad is {squad.status}. Unlock or return to draft workflow before changing players.</p>}
      </section>

      {canUseRegisteredPlayers && (
        <section className="mt-7 rounded-3xl border border-white/[0.08] bg-white/[0.035] p-6">
          <h2 className="font-display text-2xl font-black">Eligible registered players</h2>
          <p className="mt-1 text-sm text-white/45">Use registered players from the eligible pool, then add manual tournament-only players below if needed.</p>
          <div className="mt-4 flex gap-3"><input className="field-input" placeholder="Search players" value={search} onChange={(event) => setSearch(event.target.value)} /><button type="button" className="secondary-button" onClick={loadEligible}>Search</button></div>
          <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {eligible.map((player) => <button key={player.id} type="button" disabled={readOnly || player.alreadySelected || player.allocatedToAnotherIntraTeam || saving} onClick={() => run(() => tournamentApi.addRegisteredSquadPlayer(tournamentId, participantId, { playerId: player.id }))} className="rounded-2xl border border-white/10 p-4 text-left disabled:cursor-not-allowed disabled:opacity-45"><strong>{player.name}</strong><p className="text-sm text-white/45">{player.position} · #{player.jerseyNumber || '-'}</p>{player.allocatedToAnotherIntraTeam && <p className="text-xs text-amber-200">Allocated to another intra team</p>}</button>)}
            {!eligible.length && <p className="rounded-2xl border border-dashed border-white/10 p-4 text-sm text-white/50">No eligible registered players found. You can still add manual tournament-only players below.</p>}
          </div>
        </section>
      )}

      <section className="mt-7 rounded-3xl border border-white/[0.08] bg-white/[0.035] p-6">
        <h2 className="font-display text-2xl font-black">Add manual player</h2>
        <p className="mt-1 text-sm text-white/45">Use this for guest, trialist, replacement, or not-yet-registered tournament players. This does not create a permanent FootStream player.</p>
          <div className="mt-4 grid gap-3 md:grid-cols-[1fr_120px_100px_auto_auto]">
            <input className="field-input" placeholder="Player name" value={manual.name} disabled={readOnly} onChange={(event) => setManual({ ...manual, name: event.target.value })} />
            <select className="field-input" value={manual.position} disabled={readOnly} onChange={(event) => setManual({ ...manual, position: event.target.value })}>{positions.map((position) => <option key={position}>{position}</option>)}</select>
            <input className="field-input" placeholder="Jersey" value={manual.jersey} disabled={readOnly} onChange={(event) => setManual({ ...manual, jersey: event.target.value })} />
            <label className="flex items-center gap-2 text-sm text-white/60"><input type="checkbox" checked={manual.isGoalkeeper} disabled={readOnly} onChange={(event) => setManual({ ...manual, isGoalkeeper: event.target.checked })} /> GK</label>
            <button type="button" className="primary-button" disabled={readOnly || !manual.name.trim() || saving} onClick={addManual}><UserPlus size={16} /> Add</button>
          </div>
      </section>

      <section className="mt-7 grid gap-4 lg:grid-cols-2">
        {(squad.players || []).length === 0 ? <EmptyState title="No squad players" message="Add players to start building this tournament squad." /> : squad.players.map((player) => (
          <SquadPlayerCard key={player.id} player={player} readOnly={readOnly} saving={saving} onAction={run} tournamentId={tournamentId} participantId={participantId} />
        ))}
      </section>

      <section className="mt-8">
        <h2 className="mb-4 font-display text-2xl font-black">Squad audit history</h2>
        <div className="space-y-3">{history.length ? history.map((item) => <div key={item.id} className="rounded-2xl border border-white/10 p-4"><p className="font-bold">{formatTournamentLabel(item.action)}</p><p className="text-sm text-white/55">{item.safeMessage}</p></div>) : <EmptyState title="No squad history" message="Squad events will appear here." />}</div>
      </section>
    </>
  );
}

function SquadPlayerCard({ player, readOnly, saving, onAction, tournamentId, participantId }) {
  const fileRef = useRef(null);
  const photo = imageUrl(player.photo);
  const upload = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const form = new FormData();
    form.append('image', file);
    await onAction(() => tournamentApi.uploadSquadPlayerPhoto(tournamentId, participantId, player.id, form));
  };
  return <article className="rounded-2xl border border-white/10 p-4">
    <div className="flex items-start gap-4">
      {photo ? <img src={photo} alt="" className="size-14 rounded-xl bg-black/20 object-contain" /> : <div className="grid size-14 place-items-center rounded-xl bg-lime-300/10 font-black text-lime-100">{player.name.slice(0, 2).toUpperCase()}</div>}
      <div className="min-w-0 flex-1">
        <p className="truncate font-bold">{player.name}</p>
        <p className="text-sm text-white/45">{player.position} · #{player.jersey || '-'}</p>
        <div className="mt-2 flex flex-wrap gap-2 text-xs">{player.captain && <StatusBadge tone="lime">Captain</StatusBadge>}{player.viceCaptain && <StatusBadge>Vice</StatusBadge>}{player.goalkeeper && <StatusBadge>GK</StatusBadge>}<StatusBadge>{formatTournamentLabel(player.sourceType)}</StatusBadge></div>
      </div>
    </div>
    {!readOnly && <div className="mt-4 flex flex-wrap gap-2">
      <button className="secondary-button" type="button" disabled={saving} onClick={() => onAction(() => tournamentApi.setCaptain(tournamentId, participantId, player.id))}><Crown size={15} /> Captain</button>
      <button className="secondary-button" type="button" disabled={saving} onClick={() => onAction(() => tournamentApi.setViceCaptain(tournamentId, participantId, player.id))}>Vice</button>
      <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp" className="sr-only" onChange={upload} />
      {player.sourceType === 'manual_player' && <button className="secondary-button" type="button" disabled={saving} onClick={() => fileRef.current?.click()}><Camera size={15} /> Photo</button>}
      {player.sourceType === 'manual_player' && photo && <button className="secondary-button" type="button" disabled={saving} onClick={() => onAction(() => tournamentApi.removeSquadPlayerPhoto(tournamentId, participantId, player.id))}><Upload size={15} /> Remove Photo</button>}
      <button className="secondary-button border-red-300/20 text-red-100" type="button" disabled={saving} onClick={() => onAction(() => tournamentApi.removeSquadPlayer(tournamentId, participantId, player.id))}><Trash2 size={15} /> Remove</button>
    </div>}
  </article>;
}

function Info({ title, value }) { return <div className="rounded-2xl border border-white/[0.08] bg-white/[0.035] p-5"><p className="eyebrow">{title}</p><div className="mt-2 font-bold">{value}</div></div>; }
function ErrorBox({ error, onRetry }) { return <div className="rounded-2xl border border-red-300/20 bg-red-300/10 p-5 text-red-100"><p>{error}</p><button className="secondary-button mt-4" type="button" onClick={onRetry}>Retry</button></div>; }
