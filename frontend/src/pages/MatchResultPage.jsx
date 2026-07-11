import { ImagePlus, Save, Trash2, X } from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useParams } from 'react-router-dom';
import api from '../api/client.js';
import LoadingScreen from '../components/LoadingScreen.jsx';
import EventTimeline from '../features/live/EventTimeline.jsx';

const categories = ['team', 'action', 'celebration', 'man_of_the_match', 'result', 'other'];

export default function MatchResultPage({ audience = 'team' }) {
  const { matchId } = useParams();
  const editable = audience === 'team';
  const base = `/${audience}/matches/${matchId}`;
  const [bundle, setBundle] = useState(null);
  const [form, setForm] = useState({
    manOfTheMatchPlayerId: '',
    completionNotes: '',
    attendance: '',
  });
  const [files, setFiles] = useState([]);
  const filesRef = useRef(files);
  const [photoMeta, setPhotoMeta] = useState({
    caption: '',
    category: 'other',
  });
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const load = useCallback(async () => {
    try {
      const response = await api.get(`${base}/result`);
      const value = response.data.data;
      setBundle(value);
      setForm({
        manOfTheMatchPlayerId: value.match.manOfTheMatch?.player || '',
        completionNotes: value.match.completionNotes || '',
        attendance: value.match.attendance ?? '',
      });
      setError('');
    } catch (requestError) {
      setError(requestError.userMessage);
    }
  }, [base]);
  useEffect(() => {
    load();
  }, [load]);
  useEffect(() => { filesRef.current = files; }, [files]);
  useEffect(() => () => filesRef.current.forEach((file) => URL.revokeObjectURL(file.preview)), []);
  const squad = useMemo(() => (bundle ? [...bundle.match.startingXI, ...bundle.match.substitutes] : []), [bundle]);
  if (!bundle && !error) return <LoadingScreen />;
  if (!bundle) return <div className="text-red-200">{error}</div>;
  const save = async (event) => {
    event.preventDefault();
    try {
      await api.patch(`${base}/result`, {
        ...form,
        attendance: form.attendance === '' ? null : Number(form.attendance),
        manOfTheMatchPlayerId: form.manOfTheMatchPlayerId || null,
      });
      setNotice('Result details saved.');
      await load();
    } catch (requestError) {
      setError(requestError.userMessage);
    }
  };
  const addFiles = (event) => {
    const selected = [...event.target.files];
    setFiles((current) => [...current, ...selected.slice(0, Math.max(0, 10 - current.length)).map((file) => ({ file, preview: URL.createObjectURL(file) }))]);
    event.target.value = '';
  };
  const removeSelectedFile = (index) => setFiles((current) => current.filter((item, itemIndex) => { if (itemIndex === index) URL.revokeObjectURL(item.preview); return itemIndex !== index; }));
  const upload = async () => {
    const data = new FormData();
    files.forEach(({ file }) => data.append('photos', file));
    data.append('caption', photoMeta.caption);
    data.append('category', photoMeta.category);
    try {
      await api.post(`${base}/photos`, data, {
        headers: { 'Content-Type': 'multipart/form-data' },
        onUploadProgress: (e) => setProgress(e.total ? Math.round((e.loaded / e.total) * 100) : 0),
      });
      files.forEach((file) => URL.revokeObjectURL(file.preview));
      setFiles([]);
      setProgress(0);
      setNotice('Photos uploaded.');
      await load();
    } catch (requestError) {
      setError(requestError.userMessage);
    }
  };
  const removePhoto = async (photoId) => {
    if (!window.confirm('Delete this photo from Cloudinary and the gallery?')) return;
    try {
      await api.delete(`${base}/photos/${photoId}`);
      setNotice('Photo deleted.');
      await load();
    } catch (requestError) {
      setError(requestError.userMessage);
    }
  };
  const editPhoto = async (photoId, values) => {
    try {
      await api.patch(`${base}/photos/${photoId}`, values);
      setNotice('Photo details updated.');
      await load();
    } catch (requestError) {
      setError(requestError.userMessage);
    }
  };
  return (
    <>
      <header>
        <p className="eyebrow">Full time · verified result</p>
        <h1 className="page-title">
          {bundle.match.team?.name || 'Our team'} {bundle.result.finalTeamScore}–{bundle.result.finalOpponentScore} {bundle.match.opponent.name}
        </h1>
        <p className="page-copy">
          {new Date(bundle.match.scheduledAt).toLocaleString()} · {bundle.match.venue} · {bundle.match.tournament || 'No tournament'}
        </p>
      </header>
      {(error || notice) && (
        <div className={`mt-6 rounded-xl border p-4 ${error ? 'border-red-300/20 bg-red-300/10 text-red-100' : 'border-lime-300/20 bg-lime-300/10 text-lime-100'}`}>{error || notice}</div>
      )}
      <section className="mt-8 grid gap-5 xl:grid-cols-[.8fr_1.2fr]">
        <article className="panel">
          <p className="eyebrow">Outcome</p>
          <div className="mt-4 flex items-end gap-4">
            <span className="font-display text-7xl font-black text-lime-300">{bundle.result.finalTeamScore}</span>
            <span className="pb-2 text-3xl text-white/30">–</span>
            <span className="font-display text-7xl font-black">{bundle.result.finalOpponentScore}</span>
          </div>
          <span className="status-badge status-active mt-5 uppercase">{bundle.result.outcome}</span>
          {bundle.match.manOfTheMatch && (
            <div className="mt-7 border-t border-white/[0.07] pt-6">
              <p className="text-xs font-bold uppercase tracking-wider text-white/35">Man of the Match</p>
              <p className="mt-2 text-xl font-semibold">{bundle.match.manOfTheMatch.name}</p>
              <p className="text-sm text-white/40">
                {bundle.match.manOfTheMatch.position} · #{bundle.match.manOfTheMatch.jerseyNumber || '—'}
              </p>
            </div>
          )}
        </article>
        <article className="panel">
          <h2 className="panel-title">Final details</h2>
          {editable ? (
            <form className="mt-5 space-y-4" onSubmit={save}>
              <label className="field-label">
                Man of the Match
                <select className="field-input mt-2" value={form.manOfTheMatchPlayerId} onChange={(e) => setForm({ ...form, manOfTheMatchPlayerId: e.target.value })}>
                  <option value="">Not selected</option>
                  {squad.map((player) => (
                    <option key={player.player} value={player.player}>
                      {player.name}
                    </option>
                  ))}
                </select>
              </label>
              <label className="field-label">
                Attendance
                <input className="field-input mt-2" type="number" min="0" value={form.attendance} onChange={(e) => setForm({ ...form, attendance: e.target.value })} />
              </label>
              <label className="field-label">
                Completion notes
                <textarea className="field-input mt-2 min-h-28" maxLength="2000" value={form.completionNotes} onChange={(e) => setForm({ ...form, completionNotes: e.target.value })} />
              </label>
              <button className="primary-button" type="submit">
                <Save size={16} /> Save details
              </button>
            </form>
          ) : (
            <div className="mt-5 space-y-4 text-sm text-white/60">
              <p>
                <strong className="text-white">Attendance:</strong> {bundle.match.attendance ?? 'Not recorded'}
              </p>
              <p className="whitespace-pre-wrap">
                <strong className="text-white">Notes:</strong> {bundle.match.completionNotes || 'No completion notes.'}
              </p>
            </div>
          )}
        </article>
      </section>
      <section className="panel mt-6">
        <div className="panel-heading">
          <div>
            <p className="eyebrow">Match day</p>
            <h2 className="panel-title">Photo gallery</h2>
          </div>
          <span className="count-pill">{bundle.photos.length}/20</span>
        </div>
        {editable && (
          <div className="mb-6 rounded-2xl border border-dashed border-lime-300/20 bg-lime-300/[0.03] p-4">
            <div className="grid gap-3 md:grid-cols-[1fr_180px_auto]">
              <input className="field-input" placeholder="Shared caption" value={photoMeta.caption} onChange={(e) => setPhotoMeta({ ...photoMeta, caption: e.target.value })} />
              <select className="field-input" value={photoMeta.category} onChange={(e) => setPhotoMeta({ ...photoMeta, category: e.target.value })}>
                {categories.map((category) => (
                  <option key={category}>{category}</option>
                ))}
              </select>
              <label className="secondary-button cursor-pointer">
                <ImagePlus size={16} /> Choose photos
                <input className="sr-only" type="file" accept="image/jpeg,image/png,image/webp" multiple onChange={addFiles} />
              </label>
            </div>
            {files.length > 0 && (
              <>
                <div className="mt-4 grid grid-cols-3 gap-3 sm:grid-cols-5">
                  {files.map((item, index) => (
                    <div className="relative aspect-square overflow-hidden rounded-xl" key={`${item.file.name}-${index}`}>
                      <img className="size-full object-cover" src={item.preview} alt="Upload preview" />
                      <button className="absolute right-1 top-1 rounded-full bg-black/70 p-1" type="button" onClick={() => removeSelectedFile(index)}>
                        <X size={14} />
                      </button>
                    </div>
                  ))}
                </div>
                <button className="primary-button mt-4" type="button" onClick={upload}>
                  Upload {files.length} photo{files.length === 1 ? '' : 's'}
                  {progress ? ` · ${progress}%` : ''}
                </button>
              </>
            )}
          </div>
        )}
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {bundle.photos.map((photo) => (
            <figure className="group overflow-hidden rounded-2xl border border-white/[0.07] bg-white/[0.02]" key={photo._id}>
              <div className="relative aspect-[4/3]">
                <img className="size-full object-cover" src={photo.imageUrl} alt={photo.caption || 'Match photo'} />
                {editable && (
                  <button type="button" className="absolute right-3 top-3 rounded-xl bg-black/70 p-2 text-red-200" onClick={() => removePhoto(photo._id)} aria-label="Delete photo">
                    <Trash2 size={16} />
                  </button>
                )}
              </div>
              <figcaption className="p-4">
                {editable ? (
                  <PhotoMetaEditor photo={photo} onSave={editPhoto} />
                ) : (
                  <>
                    <span className="status-badge status-neutral">{photo.category.replaceAll('_', ' ')}</span>
                    <p className="mt-2 text-sm text-white/60">{photo.caption || photo.originalName}</p>
                  </>
                )}
              </figcaption>
            </figure>
          ))}
          {bundle.photos.length === 0 && <p className="text-sm text-white/40">No match photos have been uploaded.</p>}
        </div>
      </section>
      <section className="panel mt-6">
        <h2 className="panel-title">Starting XI and substitutes</h2>
        <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {squad.map((player, index) => (
            <div className="list-card" key={player.player}>
              <span className="font-display text-xl font-bold text-lime-300">{player.jerseyNumber || '—'}</span>
              <div>
                <p className="font-semibold">{player.name}</p>
                <p className="text-xs text-white/40">
                  {index < 11 ? 'Starter' : 'Substitute'} · {player.position}
                </p>
              </div>
            </div>
          ))}
        </div>
      </section>
      <section className="panel mt-6">
        <h2 className="panel-title">Match events</h2>
        <div className="mt-5">
          <EventTimeline events={bundle.events} />
        </div>
      </section>
    </>
  );
}

function PhotoMetaEditor({ photo, onSave }) {
  const [values, setValues] = useState({
    caption: photo.caption || '',
    category: photo.category,
  });
  return (
    <div className="space-y-2">
      <select className="field-input py-2" value={values.category} onChange={(event) => setValues({ ...values, category: event.target.value })}>
        {categories.map((category) => (
          <option key={category}>{category}</option>
        ))}
      </select>
      <input className="field-input py-2" maxLength="500" placeholder="Caption" value={values.caption} onChange={(event) => setValues({ ...values, caption: event.target.value })} />
      <button type="button" className="secondary-button w-full py-2" onClick={() => onSave(photo._id, values)}>
        <Save size={14} /> Save photo details
      </button>
    </div>
  );
}
