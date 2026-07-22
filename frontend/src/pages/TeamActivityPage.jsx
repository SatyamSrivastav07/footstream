import { useEffect, useState } from 'react';
import api from '../api/client.js';
import EmptyState from '../components/EmptyState.jsx';

export default function TeamActivityPage() {
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  useEffect(() => {
    api.get('/team/activity')
      .then((response) => setActivities(response.data.data.activities || []))
      .catch((requestError) => setError(requestError.userMessage || 'Unable to load activity.'))
      .finally(() => setLoading(false));
  }, []);
  return (
    <>
      <header><p className="eyebrow">Team timeline</p><h1 className="page-title">Recent Activity</h1><p className="page-copy">Latest important team actions and collaboration updates.</p></header>
      {error && <p className="mt-5 rounded-xl border border-red-300/20 bg-red-300/10 px-4 py-3 text-sm text-red-100">{error}</p>}
      <section className="panel mt-7">
        {loading ? <div className="skeleton h-72" /> : activities.length ? <div className="space-y-3">{activities.map((item) => <article key={item.id} className="rounded-2xl border border-white/[0.07] bg-white/[0.025] p-4"><p className="font-bold text-white">{item.title}</p><p className="mt-1 text-sm text-white/50">{item.message}</p><time className="mt-2 block text-xs text-white/30">{new Date(item.createdAt).toLocaleString()}</time></article>)}</div> : <EmptyState title="No activity yet" message="Team actions will appear here as the workspace is used." />}
      </section>
    </>
  );
}
