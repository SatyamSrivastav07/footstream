import { Megaphone, Trash2 } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import api from '../../api/client.js';

export default function TeamLiveEngagement({ matchId, viewerCount = 0 }) {
  const [announcement, setAnnouncement] = useState(null);
  const [message, setMessage] = useState('');
  const [chat, setChat] = useState([]);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    try {
      const [announcementResponse, chatResponse] = await Promise.all([
        api.get(`/team/matches/${matchId}/announcement`),
        api.get(`/public/matches/${matchId}/chat`),
      ]);
      setAnnouncement(announcementResponse.data.data.announcement);
      setMessage(announcementResponse.data.data.announcement?.message || '');
      setChat(chatResponse.data.data.messages);
    } catch (requestError) {
      setError(requestError.userMessage);
    }
  }, [matchId]);

  useEffect(() => { load(); }, [load]);

  const save = async (event) => {
    event.preventDefault();
    setSaving(true);
    setError('');
    try {
      const response = await api.put(`/team/matches/${matchId}/announcement`, { message });
      setAnnouncement(response.data.data.announcement);
      setNotice('Announcement updated.');
    } catch (requestError) {
      setError(requestError.userMessage);
    } finally {
      setSaving(false);
    }
  };

  const removeAnnouncement = async () => {
    setSaving(true);
    try {
      await api.delete(`/team/matches/${matchId}/announcement`);
      setAnnouncement(null);
      setMessage('');
      setNotice('Announcement removed.');
    } catch (requestError) {
      setError(requestError.userMessage);
    } finally {
      setSaving(false);
    }
  };

  const deleteMessage = async (messageId) => {
    try {
      await api.delete(`/team/matches/${matchId}/chat/${messageId}`);
      setChat((current) => current.filter((item) => item._id !== messageId));
    } catch (requestError) {
      setError(requestError.userMessage);
    }
  };

  return (
    <section className="panel mt-6">
      <div className="panel-heading">
        <div><p className="eyebrow">Engagement</p><h2 className="panel-title">Announcement and chat moderation</h2></div>
        <span className="status-badge status-active">{viewerCount} watching</span>
      </div>
      {(error || notice) && <div className="mb-4 rounded-xl border border-amber-300/20 bg-amber-300/10 p-3 text-sm text-amber-100">{error || notice}</div>}
      <div className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
        <form className="rounded-2xl border border-white/[0.07] bg-black/10 p-4" onSubmit={save}>
          <div className="flex items-center gap-2 text-lime-100"><Megaphone size={18} /><h3 className="font-semibold">Team announcement</h3></div>
          <textarea className="field-input mt-4 min-h-28" maxLength="240" value={message} onChange={(event) => setMessage(event.target.value)} placeholder="Pin a short update above public chat." />
          <div className="mt-3 flex flex-wrap gap-2">
            <button type="submit" className="primary-button" disabled={saving || !message.trim()}>{announcement ? 'Update announcement' : 'Publish announcement'}</button>
            {announcement && <button type="button" className="secondary-button" disabled={saving} onClick={removeAnnouncement}>Remove</button>}
          </div>
        </form>
        <div className="rounded-2xl border border-white/[0.07] bg-black/10 p-4">
          <h3 className="font-semibold text-white">Public chat moderation</h3>
          <div className="mt-4 max-h-96 space-y-3 overflow-y-auto">
            {chat.length === 0 ? <p className="text-sm text-white/40">No visible chat messages.</p> : chat.map((item) => (
              <article key={item._id} className="flex items-start justify-between gap-3 rounded-xl bg-white/[0.035] p-3">
                <div className="min-w-0"><p className="truncate text-sm font-bold text-white">{item.displayName}</p><p className="mt-1 break-words text-sm text-white/60">{item.message}</p></div>
                <button type="button" className="icon-button text-red-200" onClick={() => deleteMessage(item._id)} aria-label={`Delete message by ${item.displayName}`}><Trash2 size={16} /></button>
              </article>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
