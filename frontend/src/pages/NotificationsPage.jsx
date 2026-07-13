import { Bell, CheckCheck } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/client.js';
import EmptyState from '../components/EmptyState.jsx';
import LoadingScreen from '../components/LoadingScreen.jsx';

const typeLabel = (type) => type.replaceAll('_', ' ').replace(/^\w/, (letter) => letter.toUpperCase());

export default function NotificationsPage() {
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const refreshBadge = () => window.dispatchEvent(new Event('footstream:notifications-changed'));

  const load = async () => {
    setLoading(true);
    try {
      const response = await api.get('/notifications');
      setNotifications(response.data.data.notifications);
      setError('');
    } catch (requestError) {
      setError(requestError.userMessage);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const openNotification = async (notification) => {
    setSaving(true);
    try {
      if (!notification.isRead) await api.patch(`/notifications/${notification._id}/read`);
      refreshBadge();
      navigate(notification.actionUrl);
    } catch (requestError) {
      setError(requestError.userMessage);
    } finally {
      setSaving(false);
    }
  };

  const markAllRead = async () => {
    setSaving(true);
    try {
      await api.patch('/notifications/read-all');
      await load();
      refreshBadge();
    } catch (requestError) {
      setError(requestError.userMessage);
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <LoadingScreen />;

  return (
    <>
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="eyebrow">Notification center</p>
          <h1 className="page-title">Notifications</h1>
          <p className="page-copy">Persistent in-app updates for challenges, fixtures, and join requests.</p>
        </div>
        <button type="button" className="secondary-button" disabled={saving || notifications.every((item) => item.isRead)} onClick={markAllRead}>
          <CheckCheck size={16} /> Mark all read
        </button>
      </header>
      {error && <div className="mt-6 rounded-xl border border-red-300/20 bg-red-300/10 p-4 text-red-100">{error}</div>}
      <section className="mt-7">
        {!notifications.length ? <EmptyState title="No notifications" message="Challenge and join-request updates will appear here." /> : (
          <div className="space-y-3">
            {notifications.map((notification) => (
              <button
                key={notification._id}
                type="button"
                className={`w-full rounded-2xl border p-4 text-left transition hover:border-lime-300/25 hover:bg-lime-300/[0.045] ${notification.isRead ? 'border-white/[0.07] bg-white/[0.025]' : 'border-lime-300/20 bg-lime-300/[0.07]'}`}
                disabled={saving}
                onClick={() => openNotification(notification)}
              >
                <div className="flex items-start gap-3">
                  <span className={`mt-1 grid size-9 place-items-center rounded-xl ${notification.isRead ? 'bg-white/5 text-white/45' : 'bg-lime-300/15 text-lime-200'}`}><Bell size={17} /></span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-xs font-black uppercase tracking-[0.18em] text-lime-200/55">{typeLabel(notification.type)}</span>
                    <span className="mt-1 block font-semibold text-white">{notification.title}</span>
                    <span className="mt-1 block text-sm leading-6 text-white/55">{notification.message}</span>
                    <span className="mt-2 block text-xs text-white/35">{new Date(notification.createdAt).toLocaleString()}</span>
                  </span>
                  {!notification.isRead && <span className="mt-2 size-2 rounded-full bg-red-400" aria-label="Unread" />}
                </div>
              </button>
            ))}
          </div>
        )}
      </section>
    </>
  );
}
