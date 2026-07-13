import { Bell, BellOff, CheckCircle2, HeartHandshake } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import api from '../../api/client.js';
import { pushSupport, subscribeBrowserPush } from '../../utils/pushNotifications.js';

const storageKey = 'footstream_follower_session';
export const getOrCreateFollowerSessionId = () => {
  let id = localStorage.getItem(storageKey);
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem(storageKey, id);
  }
  return id;
};

const preferenceLabels = [
  ['matchReminder', 'Match reminder'],
  ['matchStarted', 'Match started'],
  ['goal', 'Goal alerts'],
  ['halfTime', 'Half-time'],
  ['fullTime', 'Full-time'],
  ['resultPublished', 'Result published'],
];

export default function FollowTeamPanel({ team, fallbackSlug = '' }) {
  const slug = team.slug || fallbackSlug;
  const [followerSessionId] = useState(() => getOrCreateFollowerSessionId());
  const [follow, setFollow] = useState(null);
  const [statusLoading, setStatusLoading] = useState(true);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [busy, setBusy] = useState(false);
  const support = useMemo(() => pushSupport(), []);

  useEffect(() => {
    setStatusLoading(true);
    api.get(`/public/teams/${slug}/follow-status`, { params: { followerSessionId } })
      .then((response) => setFollow(response.data.data.follow || response.data.data))
      .catch((requestError) => setError(requestError.userMessage))
      .finally(() => setStatusLoading(false));
  }, [slug, followerSessionId]);

  const updateFollow = async (request) => {
    setBusy(true); setError(''); setNotice('');
    try {
      const response = await request();
      setFollow(response.data.data.follow);
    } catch (requestError) {
      setError(requestError.userMessage);
    } finally {
      setBusy(false);
    }
  };

  const followTeam = () => updateFollow(() => api.post(`/public/teams/${slug}/follow`, { followerSessionId }));
  const unfollowTeam = () => updateFollow(() => api.delete(`/public/teams/${slug}/follow`, { data: { followerSessionId } }));

  const togglePreference = async (key) => {
    const preferences = { ...(follow?.preferences || {}), [key]: !(follow?.preferences?.[key] !== false) };
    await updateFollow(() => api.patch(`/public/teams/${slug}/follow/preferences`, { followerSessionId, preferences }));
  };

  const enableNotifications = async () => {
    setBusy(true); setError(''); setNotice('');
    try {
      if (!follow?.isFollowing) await api.post(`/public/teams/${slug}/follow`, { followerSessionId });
      const subscription = await subscribeBrowserPush();
      await api.post('/public/push/subscribe', { followerSessionId, subscription: subscription.toJSON() });
      const status = await api.get(`/public/teams/${slug}/follow-status`, { params: { followerSessionId } });
      setFollow(status.data.data.follow || status.data.data);
      setNotice('Browser notifications enabled.');
    } catch (requestError) {
      setError(requestError.userMessage || requestError.message);
    } finally {
      setBusy(false);
    }
  };

  const disableNotifications = async () => {
    setBusy(true); setError(''); setNotice('');
    try {
      await api.delete('/public/push/unsubscribe', { data: { followerSessionId } });
      const status = await api.get(`/public/teams/${slug}/follow-status`, { params: { followerSessionId } });
      setFollow(status.data.data.follow || status.data.data);
      setNotice('Browser notifications disabled for this browser.');
    } catch (requestError) {
      setError(requestError.userMessage);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="rounded-2xl border border-lime-300/15 bg-lime-300/[0.055] p-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="eyebrow">Follow team</p>
          <p className="mt-1 text-sm text-white/60">{follow?.followerCount ?? 0} followers · Follow to receive live match updates of {team.name}</p>
        </div>
        {statusLoading ? (
          <span className="status-badge status-neutral">Checking follow status...</span>
        ) : follow?.following || follow?.isFollowing ? (
          <div className="flex flex-wrap gap-2">
            <span className="status-badge status-active"><CheckCircle2 size={14} /> Following</span>
            <button type="button" className="secondary-button" disabled={busy} onClick={unfollowTeam}>Unfollow</button>
          </div>
        ) : (
          <button type="button" className="primary-button" disabled={busy} onClick={followTeam}><HeartHandshake size={16} /> Follow {team.name}</button>
        )}
      </div>
      {(error || notice) && <div className="mt-3 rounded-xl border border-amber-300/20 bg-amber-300/10 p-3 text-sm text-amber-100">{error || notice}</div>}
      {(follow?.following || follow?.isFollowing) && (
        <div className="mt-4 space-y-3">
          <div className="flex flex-wrap gap-2">
            {!support.supported ? (
              <span className="text-sm text-white/45">Browser push is not supported here.</span>
            ) : follow.notificationsEnabled ? (
              <button type="button" className="secondary-button" disabled={busy} onClick={disableNotifications}><BellOff size={16} /> Disable notifications</button>
            ) : (
              <button type="button" className="primary-button" disabled={busy} onClick={enableNotifications}><Bell size={16} /> Enable notifications</button>
            )}
            {support.permission === 'denied' && <span className="text-sm text-red-200">Notifications are blocked in browser settings.</span>}
          </div>
          <div className="grid gap-2 sm:grid-cols-2">
            {preferenceLabels.map(([key, label]) => (
              <label key={key} className="flex items-center justify-between gap-3 rounded-xl bg-black/10 p-3 text-sm text-white/70">
                <span>{label}</span>
                <input type="checkbox" checked={follow?.preferences?.[key] !== false} onChange={() => togglePreference(key)} />
              </label>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
