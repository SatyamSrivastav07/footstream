import { ExternalLink, Trash2, Trophy, UsersRound } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../api/client.js';
import EmptyState from '../components/EmptyState.jsx';
import PlayerAvatar from '../features/squad/PlayerAvatar.jsx';

const currentYear = new Date().getFullYear();
const defaultForm = {
  tournamentName: '',
  position: '',
  year: currentYear,
  category: 'inter_college',
  description: '',
  certificateUrl: '',
  matchReportLink: '',
  manualPlayers: '',
};

const lines = (value) => String(value || '').split('\n').map((item) => item.trim()).filter(Boolean);
const playerIdOf = (player) => String(player?._id || player?.id || player?.playerId || '');
const playerImageUrl = (player) => player?.photoUrl || (typeof player?.photo === 'string' ? player.photo : player?.photo?.imageUrl || player?.photo?.url || '');

export default function TeamAchievementsPage() {
  const [items, setItems] = useState([]);
  const [players, setPlayers] = useState([]);
  const [selectedPlayers, setSelectedPlayers] = useState([]);
  const [form, setForm] = useState(defaultForm);
  const [file, setFile] = useState(null);
  const [trophyFiles, setTrophyFiles] = useState([]);
  const [celebrationFiles, setCelebrationFiles] = useState([]);
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(true);

  const selectedSet = useMemo(() => new Set(selectedPlayers), [selectedPlayers]);

  const load = async () => {
    const [achievementResponse, playerResponse] = await Promise.all([
      api.get('/team/achievements'),
      api.get('/team/players', { params: { isActive: true } }),
    ]);
    setItems(achievementResponse.data.data.achievements || []);
    setPlayers(playerResponse.data.data.players || []);
  };

  useEffect(() => {
    load()
      .catch(() => setMessage('Unable to load achievements.'))
      .finally(() => setLoading(false));
  }, []);

  const submit = async (event) => {
    event.preventDefault();
    const data = new FormData();
    Object.entries(form).forEach(([key, value]) => {
      if (key === 'manualPlayers') return;
      data.append(key, value);
    });
    data.append('winningSquadRegisteredPlayers', JSON.stringify(selectedPlayers));
    data.append('winningSquadManualPlayers', JSON.stringify(lines(form.manualPlayers).map((name) => ({ name }))));
    if (file) data.append('image', file);
    trophyFiles.forEach((image) => data.append('trophyImages', image));
    celebrationFiles.forEach((image) => data.append('celebrationPhotos', image));
    try {
      await api.post('/team/achievements', data, { headers: { 'Content-Type': 'multipart/form-data' } });
      setForm(defaultForm);
      setSelectedPlayers([]);
      setFile(null);
      setTrophyFiles([]);
      setCelebrationFiles([]);
      setMessage('Achievement added and player trophy cabinets updated.');
      await load();
    } catch (error) {
      setMessage(error.userMessage || 'Unable to add achievement.');
    }
  };

  const remove = async (item) => {
    if (!window.confirm('Delete this achievement and remove linked player trophy entries?')) return;
    await api.delete(`/team/achievements/${item.id}`);
    setItems((current) => current.filter((entry) => entry.id !== item.id));
  };

  const togglePlayer = (playerId) => {
    setSelectedPlayers((current) => (current.includes(playerId) ? current.filter((id) => id !== playerId) : [...current, playerId]));
  };

  return (
    <>
      <header>
        <p className="eyebrow">Team honours</p>
        <h1 className="page-title">Achievements</h1>
        <p className="page-copy">Add trophies, celebration media, and winning squads. Registered squad players automatically receive public Trophy Cabinet entries.</p>
      </header>
      {message && <p className="mt-5 rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-white/70">{message}</p>}
      <form onSubmit={submit} className="panel mt-7 grid gap-4 md:grid-cols-2">
        <Input label="Tournament name" value={form.tournamentName} onChange={(value) => setForm({ ...form, tournamentName: value })} required />
        <Input label="Position / achievement" value={form.position} onChange={(value) => setForm({ ...form, position: value })} required />
        <Input label="Year" type="number" value={form.year} onChange={(value) => setForm({ ...form, year: value })} required />
        <label className="field-label">
          Category
          <select className="field-input mt-2" value={form.category} onChange={(event) => setForm({ ...form, category: event.target.value })}>
            <option value="inter_college">Inter College</option>
            <option value="intra_college">Intra College</option>
          </select>
        </label>
        <label className="field-label">
          Main trophy image upload
          <input className="field-input mt-2" type="file" accept="image/jpeg,image/png,image/webp" onChange={(event) => setFile(event.target.files?.[0] || null)} />
        </label>
        <Input label="Certificate URL optional" value={form.certificateUrl} onChange={(value) => setForm({ ...form, certificateUrl: value })} />
        <Input label="Match report link optional" value={form.matchReportLink} onChange={(value) => setForm({ ...form, matchReportLink: value })} />
        <FilePicker label="Extra trophy images" help="Upload up to 6 extra trophy photos." files={trophyFiles} multiple onChange={setTrophyFiles} />
        <FilePicker label="Celebration photos" help="Upload up to 10 celebration photos." files={celebrationFiles} multiple onChange={setCelebrationFiles} />
        <Textarea label="Manual historical winning-squad players one per line" value={form.manualPlayers} onChange={(value) => setForm({ ...form, manualPlayers: value })} />
        <label className="field-label md:col-span-2">
          Description
          <textarea className="field-input mt-2 min-h-28" value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} />
        </label>
        <section className="md:col-span-2">
          <div className="mb-3 flex items-center justify-between gap-3">
            <div>
              <p className="font-bold text-white">Registered winning squad</p>
              <p className="text-sm text-emerald-100/45">Choose current registered players who should receive this trophy on their public profile.</p>
            </div>
            <span className="count-pill">{selectedPlayers.length} selected</span>
          </div>
          {loading ? (
            <p className="text-sm text-white/45">Loading squad...</p>
          ) : players.length ? (
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {players.map((player) => {
                const id = playerIdOf(player);
                const checked = selectedSet.has(id);
                return (
                  <label key={id} className={`flex cursor-pointer items-center gap-3 rounded-2xl border p-3 ${checked ? 'border-lime-300/45 bg-lime-300/[0.09]' : 'border-white/[0.07] bg-black/10'}`}>
                    <input type="checkbox" checked={checked} onChange={() => togglePlayer(id)} />
                    <PlayerAvatar src={playerImageUrl(player)} name={player.name} className="size-11 rounded-xl" />
                    <span className="min-w-0">
                      <span className="block truncate font-bold text-white">{player.name}</span>
                      <span className="text-xs text-white/45">#{player.jerseyNumber || '—'} · {player.position || 'Position'}</span>
                    </span>
                  </label>
                );
              })}
            </div>
          ) : (
            <p className="rounded-2xl border border-dashed border-white/10 p-4 text-sm text-white/45">No active players found.</p>
          )}
        </section>
        <button className="primary-button w-fit"><Trophy size={16} /> Add achievement</button>
      </form>
      <section className="mt-7">
        {items.length ? (
          <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
            {items.map((item) => <AchievementCard key={item.id} item={item} onRemove={remove} />)}
          </div>
        ) : (
          <EmptyState title="No achievements yet" message="Add your first team achievement." />
        )}
      </section>
    </>
  );
}

function AchievementCard({ item, onRemove }) {
  const trophyImage = item.trophyImages?.[0]?.imageUrl || item.trophyImage;
  const squadCount = (item.winningSquad?.registeredPlayers?.length || 0) + (item.winningSquad?.manualPlayers?.length || 0);
  return (
    <article className="panel">
      {trophyImage && <img className="mb-4 aspect-video w-full rounded-2xl bg-black/20 object-contain p-1" src={trophyImage} alt={`${item.tournamentName} trophy`} loading="lazy" />}
      <p className="eyebrow">{item.category === 'intra_college' ? 'Intra College' : 'Inter College'}</p>
      <h2 className="panel-title">{item.tournamentName}</h2>
      <p className="mt-2 text-lime-200">{item.position} · {item.year}</p>
      <p className="mt-3 text-sm text-white/50">{item.description || 'No description'}</p>
      <p className="mt-4 flex items-center gap-2 text-sm text-white/45"><UsersRound size={15} /> {squadCount} winning-squad players</p>
      <div className="mt-4 flex flex-wrap gap-2">
        {item.matchReportLink && <a className="secondary-button" href={item.matchReportLink} target="_blank" rel="noopener noreferrer">Report <ExternalLink size={14} /></a>}
        <Link className="secondary-button" to={`/teams/${item.teamSlug}/achievements/${item.id}`} target="_blank">Public page</Link>
        <button className="secondary-button border-red-300/20 text-red-100" type="button" onClick={() => onRemove(item)}><Trash2 size={15} /> Delete</button>
      </div>
    </article>
  );
}

function Input({ label, value, onChange, type = 'text', required = false }) {
  return <label className="field-label">{label}<input className="field-input mt-2" type={type} value={value} required={required} onChange={(event) => onChange(event.target.value)} /></label>;
}

function Textarea({ label, value, onChange }) {
  return <label className="field-label">{label}<textarea className="field-input mt-2 min-h-24" value={value} onChange={(event) => onChange(event.target.value)} /></label>;
}

function FilePicker({ label, help, files, onChange, multiple = false }) {
  return (
    <label className="field-label">
      {label}
      <input
        className="field-input mt-2"
        type="file"
        accept="image/jpeg,image/png,image/webp"
        multiple={multiple}
        onChange={(event) => onChange(Array.from(event.target.files || []))}
      />
      <span className="mt-2 block text-xs text-emerald-100/45">
        {files.length ? `${files.length} selected` : help}
      </span>
    </label>
  );
}
