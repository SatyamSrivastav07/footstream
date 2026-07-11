import { Clipboard, Eye, Radio, Trash2 } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import api from '../../api/client.js';
import Modal from '../../components/Modal.jsx';

const emptyForm = {
  sourceUrl: '',
  title: '',
  scheduledLiveAt: '',
  isEnabled: false,
};
const localInputValue = (value) => {
  if (!value) return '';
  const date = new Date(value);
  return new Date(date.getTime() - date.getTimezoneOffset() * 60_000)
    .toISOString()
    .slice(0, 16);
};

export default function MatchStreamManager({ matchId, matchStatus }) {
  const [stream, setStream] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const locked = matchStatus === 'cancelled';
  const load = useCallback(async () => {
    try {
      const response = await api.get(`/team/matches/${matchId}/stream`);
      setStream(response.data.data.stream);
      setError('');
    } catch (requestError) {
      setError(requestError.userMessage);
    } finally {
      setLoading(false);
    }
  }, [matchId]);
  useEffect(() => {
    load();
  }, [load]);
  const edit = () => {
    setForm(
      stream
        ? {
            sourceUrl: stream.sourceUrl,
            title: stream.title || '',
            scheduledLiveAt: localInputValue(stream.scheduledLiveAt),
            isEnabled: stream.isEnabled,
          }
        : emptyForm,
    );
    setError('');
    setOpen(true);
  };
  const save = async (event) => {
    event.preventDefault();
    setSaving(true);
    setError('');
    try {
      const response = await api.put(`/team/matches/${matchId}/stream`, {
        ...form,
        scheduledLiveAt: form.scheduledLiveAt
          ? new Date(form.scheduledLiveAt).toISOString()
          : null,
      });
      setStream(response.data.data.stream);
      setOpen(false);
      setNotice('YouTube stream configuration saved.');
    } catch (requestError) {
      setError(requestError.userMessage);
    } finally {
      setSaving(false);
    }
  };
  const toggle = async () => {
    setSaving(true);
    setError('');
    try {
      const response = await api.patch(
        `/team/matches/${matchId}/stream/status`,
        { isEnabled: !stream.isEnabled },
      );
      setStream(response.data.data.stream);
      setNotice(
        `Public playback ${stream.isEnabled ? 'disabled' : 'enabled'}.`,
      );
    } catch (requestError) {
      setError(requestError.userMessage);
    } finally {
      setSaving(false);
    }
  };
  const remove = async () => {
    if (!window.confirm('Remove this YouTube stream configuration?')) return;
    setSaving(true);
    setError('');
    try {
      await api.delete(`/team/matches/${matchId}/stream`);
      setStream(null);
      setNotice('Stream configuration removed.');
    } catch (requestError) {
      setError(requestError.userMessage);
    } finally {
      setSaving(false);
    }
  };
  const copyLink = async () => {
    const link = `${window.location.origin}/live/${matchId}`;
    try {
      await navigator.clipboard.writeText(link);
      setNotice('Public live link copied.');
    } catch {
      window.prompt('Copy the public live link:', link);
    }
  };

  return (
    <>
      <section className="panel mt-6">
        <div className="panel-heading">
          <div>
            <p className="eyebrow">YouTube playback</p>
            <h2 className="panel-title">Match stream</h2>
          </div>
          {stream && (
            <span
              className={`status-badge ${stream.isEnabled ? 'status-active' : 'status-neutral'}`}
            >
              {stream.isEnabled ? 'Enabled' : 'Disabled'}
            </span>
          )}
        </div>
        {(error || notice) && (
          <div
            className={`mb-4 rounded-xl border p-3 text-sm ${error ? 'border-red-300/20 bg-red-300/10 text-red-100' : 'border-lime-300/20 bg-lime-300/10 text-lime-100'}`}
          >
            {error || notice}
          </div>
        )}
        {loading ? (
          <div className="skeleton h-24" />
        ) : !stream ? (
          <div className="rounded-2xl border border-dashed border-white/10 p-6 text-center">
            <p className="text-sm text-white/45">
              No YouTube stream is configured for this match.
            </p>
            <button
              type="button"
              className="primary-button mt-4"
              disabled={locked}
              onClick={edit}
            >
              <Radio size={16} /> Add YouTube stream
            </button>
          </div>
        ) : (
          <div className="grid gap-5 lg:grid-cols-[1fr_1.15fr]">
            <div>
              <p className="font-semibold text-white">
                {stream.title || 'YouTube match stream'}
              </p>
              <p className="mt-2 break-all text-sm text-white/45">
                Video ID: {stream.videoId}
              </p>
              {stream.scheduledLiveAt && (
                <p className="mt-2 text-sm text-white/45">
                  Scheduled: {new Date(stream.scheduledLiveAt).toLocaleString()}
                </p>
              )}
              <div className="mt-5 flex flex-wrap gap-2">
                <button
                  type="button"
                  className="secondary-button"
                  disabled={saving || locked}
                  onClick={edit}
                >
                  <Eye size={16} /> Edit stream
                </button>
                <button
                  type="button"
                  className="secondary-button"
                  disabled={saving || locked}
                  onClick={toggle}
                >
                  {stream.isEnabled ? 'Disable' : 'Enable'} playback
                </button>
                <button
                  type="button"
                  className="secondary-button"
                  onClick={copyLink}
                >
                  <Clipboard size={16} /> Copy live link
                </button>
                <button
                  type="button"
                  className="icon-button text-red-200"
                  disabled={saving}
                  onClick={remove}
                  aria-label="Remove stream"
                >
                  <Trash2 size={17} />
                </button>
              </div>
            </div>
            <div className="aspect-video overflow-hidden rounded-2xl border border-white/10 bg-black">
              <iframe
                className="size-full"
                src={stream.embedUrl}
                title={stream.title || 'YouTube stream preview'}
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                allowFullScreen
                loading="lazy"
              />
            </div>
          </div>
        )}
      </section>
      <Modal
        open={open}
        onClose={() => !saving && setOpen(false)}
        title={stream ? 'Edit YouTube stream' : 'Add YouTube stream'}
        description="Paste a supported YouTube watch, short, live, or embed URL."
      >
        <form className="space-y-4" onSubmit={save}>
          {error && (
            <div className="rounded-xl border border-red-300/20 bg-red-300/10 p-3 text-sm text-red-100">
              {error}
            </div>
          )}
          <label className="field-label">
            YouTube URL
            <input
              className="field-input mt-2"
              type="url"
              required
              maxLength="2048"
              placeholder="https://www.youtube.com/watch?v=..."
              value={form.sourceUrl}
              onChange={(event) =>
                setForm({ ...form, sourceUrl: event.target.value })
              }
            />
          </label>
          <label className="field-label">
            Stream title
            <input
              className="field-input mt-2"
              maxLength="160"
              value={form.title}
              onChange={(event) =>
                setForm({ ...form, title: event.target.value })
              }
            />
          </label>
          <label className="field-label">
            Scheduled live time
            <input
              className="field-input mt-2"
              type="datetime-local"
              value={form.scheduledLiveAt}
              onChange={(event) =>
                setForm({ ...form, scheduledLiveAt: event.target.value })
              }
            />
          </label>
          <label className="flex items-center gap-3 text-sm text-white/70">
            <input
              type="checkbox"
              checked={form.isEnabled}
              onChange={(event) =>
                setForm({ ...form, isEnabled: event.target.checked })
              }
            />{' '}
            Enable public playback
          </label>
          <div className="flex justify-end gap-3">
            <button
              type="button"
              className="secondary-button"
              disabled={saving}
              onClick={() => setOpen(false)}
            >
              Cancel
            </button>
            <button type="submit" className="primary-button" disabled={saving}>
              {saving ? 'Saving…' : 'Save stream'}
            </button>
          </div>
        </form>
      </Modal>
    </>
  );
}
