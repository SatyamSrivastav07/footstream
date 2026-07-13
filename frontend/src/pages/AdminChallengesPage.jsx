import { CalendarDays, MapPin, Shield } from 'lucide-react';
import { useEffect, useState } from 'react';
import api from '../api/client.js';
import EmptyState from '../components/EmptyState.jsx';
import LoadingScreen from '../components/LoadingScreen.jsx';
import TeamIdentity from '../components/TeamIdentity.jsx';

const statusClass = {
  Pending: 'status-badge status-neutral',
  Accepted: 'status-badge status-active',
  Declined: 'status-badge status-off',
  Cancelled: 'status-badge border-amber-300/20 bg-amber-300/10 text-amber-100',
};

export default function AdminChallengesPage() {
  const [challenges, setChallenges] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    api.get('/admin/challenges')
      .then((response) => {
        setChallenges(response.data.data.challenges);
        setError('');
      })
      .catch((requestError) => setError(requestError.userMessage))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <LoadingScreen />;

  return (
    <>
      <header>
        <p className="eyebrow">Read-only oversight</p>
        <h1 className="page-title">Team challenges</h1>
        <p className="page-copy">Monitor challenge activity without accepting, declining, cancelling, or creating fixtures.</p>
      </header>
      {error && <div className="mt-6 rounded-xl border border-red-300/20 bg-red-300/10 p-4 text-red-100">{error}</div>}
      <section className="mt-7">
        {!error && challenges.length === 0 ? <EmptyState title="No challenges yet" message="Team challenge activity will appear here." /> : (
          <div className="grid gap-4 xl:grid-cols-2">
            {challenges.map((challenge) => (
              <article className="rounded-3xl border border-white/[0.08] bg-white/[0.025] p-5" key={challenge._id}>
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-3">
                      <TeamIdentity team={challenge.challengerTeam} logoClassName="size-8 rounded-lg" />
                      <span className="text-white/30">vs</span>
                      <TeamIdentity team={challenge.challengedTeam} logoClassName="size-8 rounded-lg" />
                    </div>
                  </div>
                  <span className={statusClass[challenge.status]}>{challenge.status}</span>
                </div>
                <div className="mt-5 grid gap-3 text-sm text-white/55 sm:grid-cols-3">
                  <Info icon={Shield} label="Format" value={`${challenge.matchType} - ${challenge.squadSize}`} />
                  <Info icon={MapPin} label="Venue" value={challenge.venue} />
                  <Info icon={CalendarDays} label="Date" value={`${new Date(challenge.proposedDate).toLocaleDateString()} - ${challenge.proposedTime}`} />
                </div>
                {challenge.message && <p className="mt-5 rounded-2xl bg-black/10 p-4 text-sm text-white/55">{challenge.message}</p>}
              </article>
            ))}
          </div>
        )}
      </section>
    </>
  );
}

function Info({ icon: Icon, label, value }) {
  return <div className="flex items-start gap-3 rounded-2xl bg-black/10 p-3"><Icon size={16} className="mt-0.5 text-lime-300" /><div><p className="text-[10px] font-bold uppercase tracking-wider text-white/30">{label}</p><p className="mt-1 font-semibold text-white/75">{value}</p></div></div>;
}
