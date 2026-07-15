import { BarChart3, Megaphone, Trash2 } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { io } from 'socket.io-client';
import api, { socketUrl } from '../../api/client.js';

export default function TeamLiveEngagement({ matchId, viewerCount = 0 }) {
  const [announcement, setAnnouncement] = useState(null);
  const [message, setMessage] = useState('');
  const [chat, setChat] = useState([]);
  const [polls, setPolls] = useState([]);
  const [pollQuestion, setPollQuestion] = useState('');
  const [pollOptions, setPollOptions] = useState(['', '']);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    try {
      const [announcementResponse, chatResponse] = await Promise.all([
        api.get(`/team/matches/${matchId}/announcement`),
        api.get(`/public/matches/${matchId}/chat`),
      ]);
      const pollResponse = await api.get(`/team/matches/${matchId}/polls`);
      setAnnouncement(announcementResponse.data.data.announcement);
      setMessage(announcementResponse.data.data.announcement?.message || '');
      setChat(chatResponse.data.data.messages);
      setPolls(pollResponse.data.data.polls);
    } catch (requestError) {
      setError(requestError.userMessage);
    }
  }, [matchId]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    const socket = io(socketUrl, { withCredentials: true, reconnection: true });
    socket.on('connect', () => socket.emit('join-match', { matchId, mode: 'team-engagement' }));
    socket.on('match:chat-message', (payload) => {
      if (!payload?.message?._id) return;
      setChat((current) => current.some((item) => item._id === payload.message._id) ? current : [...current, payload.message]);
    });
    socket.on('match:chat-deleted', (payload) => {
      setChat((current) => current.filter((item) => item._id !== payload?.messageId));
    });
    return () => { socket.emit('leave-match', matchId); socket.disconnect(); };
  }, [matchId]);

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

  const createPoll = async (event) => {
    event.preventDefault();
    setSaving(true);
    setError('');
    try {
      const response = await api.post(`/team/matches/${matchId}/polls`, {
        question: pollQuestion,
        options: pollOptions,
      });
      setPolls((current) => [response.data.data.poll, ...current]);
      setPollQuestion('');
      setPollOptions(['', '']);
      setNotice('Poll draft created.');
    } catch (requestError) {
      setError(requestError.userMessage);
    } finally {
      setSaving(false);
    }
  };

  const updatePollStatus = async (pollId, action) => {
    try {
      const response = await api.patch(`/team/matches/${matchId}/polls/${pollId}/${action}`);
      setPolls((current) => current.map((poll) => poll._id === pollId ? response.data.data.poll : poll));
    } catch (requestError) {
      setError(requestError.userMessage);
    }
  };

  const deletePoll = async (pollId) => {
    try {
      await api.delete(`/team/matches/${matchId}/polls/${pollId}`);
      setPolls((current) => current.filter((poll) => poll._id !== pollId));
    } catch (requestError) {
      setError(requestError.userMessage);
    }
  };

  const setOption = (index, value) => {
    setPollOptions((current) => current.map((option, optionIndex) => optionIndex === index ? value : option));
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
      <div className="mt-6 grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
        <form className="rounded-2xl border border-white/[0.07] bg-black/10 p-4" onSubmit={createPoll}>
          <div className="flex items-center gap-2 text-lime-100"><BarChart3 size={18} /><h3 className="font-semibold">Community poll</h3></div>
          <p className="mt-2 text-xs text-white/45">Polls are for fan engagement only and never affect official results, stats, or awards.</p>
          <input className="field-input mt-4" maxLength="160" value={pollQuestion} onChange={(event) => setPollQuestion(event.target.value)} placeholder="Question, e.g. Who scores next?" />
          <div className="mt-3 space-y-2">
            {pollOptions.map((option, index) => (
              <input key={`option-${index + 1}`} className="field-input" maxLength="80" value={option} onChange={(event) => setOption(index, event.target.value)} placeholder={`Option ${index + 1}`} />
            ))}
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            {pollOptions.length < 6 && <button type="button" className="secondary-button" onClick={() => setPollOptions((current) => [...current, ''])}>Add option</button>}
            {pollOptions.length > 2 && <button type="button" className="secondary-button" onClick={() => setPollOptions((current) => current.slice(0, -1))}>Remove option</button>}
            <button type="submit" className="primary-button" disabled={saving || !pollQuestion.trim() || pollOptions.filter((option) => option.trim()).length < 2}>Create draft</button>
          </div>
        </form>
        <div className="rounded-2xl border border-white/[0.07] bg-black/10 p-4">
          <h3 className="font-semibold text-white">Polls</h3>
          <div className="mt-4 max-h-[28rem] space-y-3 overflow-y-auto">
            {polls.length === 0 ? <p className="text-sm text-white/40">No polls yet.</p> : polls.map((poll) => (
              <article key={poll._id} className="rounded-xl bg-white/[0.035] p-3">
                <div className="flex items-start justify-between gap-3">
                  <p className="font-semibold text-white">{poll.question}</p>
                  <span className={`status-badge ${poll.status === 'open' ? 'status-active' : 'status-neutral'}`}>{poll.status}</span>
                </div>
                <div className="mt-3 space-y-2">
                  {poll.options.map((option) => {
                    const percent = poll.totalVotes ? Math.round((option.votes / poll.totalVotes) * 100) : 0;
                    return (
                      <div key={option._id} className="rounded-lg bg-black/15 p-2">
                        <div className="flex justify-between gap-3 text-sm"><span className="text-white/70">{option.text}</span><span className="text-white/40">{option.votes} · {percent}%</span></div>
                        <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/10"><div className="h-full bg-lime-300" style={{ width: `${percent}%` }} /></div>
                      </div>
                    );
                  })}
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  {poll.status !== 'open' && <button type="button" className="secondary-button text-xs" onClick={() => updatePollStatus(poll._id, 'open')}>Open</button>}
                  {poll.status === 'open' && <button type="button" className="secondary-button text-xs" onClick={() => updatePollStatus(poll._id, 'close')}>Close</button>}
                  <button type="button" className="secondary-button text-xs text-red-100" onClick={() => deletePoll(poll._id)}>Delete</button>
                </div>
              </article>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
