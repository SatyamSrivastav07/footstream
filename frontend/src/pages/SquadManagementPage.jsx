import { Activity, Plus, Search, ShieldAlert, UserCheck, UsersRound, UserX } from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import api from '../api/client.js';
import EmptyState from '../components/EmptyState.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import PlayerCard from '../features/squad/PlayerCard.jsx';
import PlayerFormModal from '../features/squad/PlayerFormModal.jsx';
import { AVAILABILITY, POSITIONS, availabilityLabel } from '../features/squad/constants.js';

const initialFilters = { search: '', position: '', availabilityStatus: '', isActive: 'true' };

export default function SquadManagementPage() {
  const { user } = useAuth();
  const [players, setPlayers] = useState([]);
  const [filters, setFilters] = useState(initialFilters);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [editor, setEditor] = useState({ open: false, player: null });

  const loadPlayers = useCallback(async () => {
    try {
      const response = await api.get('/team/players');
      setPlayers(response.data.data.players);
      setError('');
    } catch (requestError) { setError(requestError.userMessage); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { loadPlayers(); }, [loadPlayers]);

  const filtered = useMemo(() => players.filter((player) => {
    const searchMatch = player.name.toLowerCase().includes(filters.search.trim().toLowerCase());
    const positionMatch = !filters.position || player.position === filters.position;
    const availabilityMatch = !filters.availabilityStatus || player.availabilityStatus === filters.availabilityStatus;
    const activeMatch = filters.isActive === '' || String(player.isActive) === filters.isActive;
    return searchMatch && positionMatch && availabilityMatch && activeMatch;
  }), [players, filters]);

  const activePlayers = players.filter((player) => player.isActive);
  const counts = Object.fromEntries(AVAILABILITY.map((status) => [status, activePlayers.filter((player) => player.availabilityStatus === status).length]));

  const savePlayer = async (payload) => {
    if (editor.player) await api.patch(`/team/players/${editor.player._id}`, payload);
    else await api.post('/team/players', payload);
    setEditor({ open: false, player: null });
    setNotice(editor.player ? 'Player card updated.' : 'Player added to the permanent squad.');
    await loadPlayers();
  };

  const updateAvailability = async (player, availabilityStatus) => {
    try {
      await api.patch(`/team/players/${player._id}/status`, { availabilityStatus });
      setNotice(`${player.name} is now ${availabilityStatus}.`); await loadPlayers();
    } catch (requestError) { setError(requestError.userMessage); }
  };

  const deactivate = async (player) => {
    if (!window.confirm(`Deactivate ${player.name}? The player will remain in historical records.`)) return;
    try {
      await api.delete(`/team/players/${player._id}`);
      setNotice(`${player.name} was deactivated.`); await loadPlayers();
    } catch (requestError) { setError(requestError.userMessage); }
  };

  const reactivate = async (player) => {
    try {
      await api.patch(`/team/players/${player._id}/status`, { isActive: true });
      setNotice(`${player.name} returned to the active squad.`); await loadPlayers();
    } catch (requestError) { setError(requestError.userMessage); }
  };

  return (
    <>
      <header className="flex flex-col justify-between gap-6 md:flex-row md:items-end">
        <div><p className="eyebrow">{user.team?.name || 'My team'}</p><h1 className="page-title">Permanent squad</h1><p className="page-copy">Keep every player card, role, and availability status accurate in one place.</p></div>
        <button type="button" className="primary-button w-fit" onClick={() => setEditor({ open: true, player: null })}><Plus size={17} /> Add player</button>
      </header>

      {(error || notice) && <div className={`mt-7 rounded-xl border px-4 py-3 text-sm ${error ? 'border-red-300/20 bg-red-300/10 text-red-100' : 'border-lime-300/15 bg-lime-300/[0.07] text-lime-100'}`} role="status">{error || notice}</div>}

      <section className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-5" aria-label="Squad summary">
        <Summary label="Active players" value={activePlayers.length} icon={UsersRound} accent="lime" />
        <Summary label="Available" value={counts.available} icon={UserCheck} accent="emerald" />
        <Summary label="Injured" value={counts.injured} icon={Activity} accent="orange" />
        <Summary label="Suspended" value={counts.suspended} icon={ShieldAlert} accent="red" />
        <Summary label="Unavailable" value={counts.unavailable} icon={UserX} accent="neutral" />
      </section>

      <section className="mt-7 rounded-2xl border border-white/[0.07] bg-white/[0.025] p-4">
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-[1fr_180px_210px_170px]">
          <label className="relative"><span className="sr-only">Search players</span><Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-emerald-100/30" size={17} /><input className="field-input pl-10" placeholder="Search squad by name" value={filters.search} onChange={(e) => setFilters({ ...filters, search: e.target.value })} /></label>
          <Filter value={filters.position} onChange={(value) => setFilters({ ...filters, position: value })}><option value="">All positions</option>{POSITIONS.map((position) => <option key={position}>{position}</option>)}</Filter>
          <Filter value={filters.availabilityStatus} onChange={(value) => setFilters({ ...filters, availabilityStatus: value })}><option value="">All availability</option>{AVAILABILITY.map((status) => <option key={status} value={status}>{availabilityLabel(status)}</option>)}</Filter>
          <Filter value={filters.isActive} onChange={(value) => setFilters({ ...filters, isActive: value })}><option value="">All records</option><option value="true">Active only</option><option value="false">Inactive only</option></Filter>
        </div>
      </section>

      <section className="mt-7">
        {loading ? <SquadLoader /> : filtered.length === 0 ? <EmptyState title={players.length === 0 ? 'Your squad is ready to be built' : 'No players match these filters'} message={players.length === 0 ? 'Add the first permanent player card for your team.' : 'Adjust or clear the filters to see more squad members.'} /> : (
          <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
            {filtered.map((player) => <PlayerCard key={player._id} player={player} onEdit={(selected) => setEditor({ open: true, player: selected })} onStatusChange={updateAvailability} onDeactivate={deactivate} onReactivate={reactivate} />)}
          </div>
        )}
      </section>

      <PlayerFormModal open={editor.open} player={editor.player} onClose={() => setEditor({ open: false, player: null })} onSave={savePlayer} />
    </>
  );
}

function Summary({ label, value, icon: Icon, accent }) {
  const colors = { lime: 'text-lime-200 bg-lime-300/10', emerald: 'text-emerald-200 bg-emerald-300/10', orange: 'text-orange-200 bg-orange-300/10', red: 'text-red-200 bg-red-300/10', neutral: 'text-white/50 bg-white/[0.05]' };
  return <article className="rounded-2xl border border-white/[0.07] bg-white/[0.025] p-4"><div className={`grid size-9 place-items-center rounded-xl ${colors[accent]}`}><Icon size={17} /></div><p className="mt-4 font-display text-3xl font-bold text-white">{value}</p><p className="mt-1 text-xs font-semibold text-emerald-100/40">{label}</p></article>;
}

function Filter({ value, onChange, children }) {
  return <label><span className="sr-only">Squad filter</span><select className="field-input" value={value} onChange={(e) => onChange(e.target.value)}>{children}</select></label>;
}

function SquadLoader() {
  return <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3" aria-label="Loading squad"><div className="skeleton h-[28rem]" /><div className="skeleton h-[28rem]" /><div className="skeleton h-[28rem]" /></div>;
}

