import { CalendarDays, Check, Eye, MapPin, Search, Send, Shield, X } from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import api from '../api/client.js';
import EmptyState from '../components/EmptyState.jsx';
import TeamIdentity from '../components/TeamIdentity.jsx';

const tabs = ['received', 'sent', 'create'];
const matchTypes = ['Friendly', 'Practice', 'League'];
const squadSizes = ['5v5', '7v7', '11v11'];
const initialForm = { challengedTeam: '', matchType: 'Friendly', squadSize: '11v11', venue: '', proposedDate: '', proposedTime: '', message: '' };
const statusClass = {
  Pending: 'status-badge status-neutral',
  Accepted: 'status-badge status-active',
  Declined: 'status-badge status-off',
  Cancelled: 'status-badge border-amber-300/20 bg-amber-300/10 text-amber-100',
};

export default function TeamChallengesPage() {
  const [tab, setTab] = useState('received');
  const [sent, setSent] = useState([]);
  const [received, setReceived] = useState([]);
  const [teams, setTeams] = useState([]);
  const [teamSearch, setTeamSearch] = useState('');
  const [form, setForm] = useState(initialForm);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const loadLists = useCallback(async () => {
    setLoading(true);
    try {
      const [sentResponse, receivedResponse] = await Promise.all([
        api.get('/team/challenges/sent'),
        api.get('/team/challenges/received'),
      ]);
      setSent(sentResponse.data.data.challenges);
      setReceived(receivedResponse.data.data.challenges);
      setError('');
    } catch (requestError) {
      setError(requestError.userMessage);
    } finally {
      setLoading(false);
    }
  }, []);

  const loadTeams = useCallback(async () => {
    try {
      const response = await api.get('/team/challenges/teams', { params: teamSearch.trim() ? { search: teamSearch.trim() } : {} });
      setTeams(response.data.data.teams);
    } catch (requestError) {
      setError(requestError.userMessage);
    }
  }, [teamSearch]);

  useEffect(() => { loadLists(); }, [loadLists]);
  useEffect(() => { if (tab === 'create') loadTeams(); }, [loadTeams, tab]);

  const selectedTeam = useMemo(() => teams.find((team) => team._id === form.challengedTeam), [form.challengedTeam, teams]);
  const update = (field, value) => setForm((current) => ({ ...current, [field]: value }));

  const submit = async (event) => {
    event.preventDefault();
    setSaving(true); setError(''); setMessage('');
    try {
      await api.post('/team/challenges', form);
      setForm(initialForm);
      setTeamSearch('');
      setMessage('Challenge sent.');
      setTab('sent');
      await loadLists();
    } catch (requestError) {
      setError(requestError.userMessage);
    } finally {
      setSaving(false);
    }
  };

  const mutate = async (challenge, action) => {
    setSaving(true); setError(''); setMessage('');
    try {
      await api.patch(`/team/challenges/${challenge._id}/${action}`);
      setMessage(`Challenge ${action === 'accept' ? 'accepted' : action === 'decline' ? 'declined' : 'cancelled'}.`);
      await loadLists();
    } catch (requestError) {
      setError(requestError.userMessage);
    } finally {
      setSaving(false);
    }
  };

  const items = tab === 'sent' ? sent : received;

  return (
    <>
      <header>
        <p className="eyebrow">Team network</p>
        <h1 className="page-title">Challenges</h1>
        <p className="page-copy">Send and manage match challenges with other published FootStream teams.</p>
      </header>

      {(error || message) && <div className={`mt-6 rounded-xl border px-4 py-3 text-sm ${error ? 'border-red-300/20 bg-red-300/10 text-red-100' : 'border-lime-300/20 bg-lime-300/10 text-lime-100'}`}>{error || message}</div>}

      <div className="mt-7 flex gap-2 overflow-x-auto pb-2" role="tablist" aria-label="Challenge tabs">
        {tabs.map((item) => (
          <button key={item} type="button" className={`nav-link shrink-0 capitalize ${tab === item ? 'nav-link-active' : ''}`} onClick={() => setTab(item)}>
            {item === 'create' ? 'Create Challenge' : item}
          </button>
        ))}
      </div>

      {tab === 'create' ? (
        <section className="panel mt-6">
          <div className="panel-heading"><div><p className="eyebrow">Create challenge</p><h2 className="panel-title">Select opponent and proposal</h2></div></div>
          <div className="mb-5 grid gap-3 sm:grid-cols-[1fr_auto]">
            <label className="relative"><span className="sr-only">Search public teams</span><Search className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30" size={16} /><input className="field-input pl-9" value={teamSearch} onChange={(event) => setTeamSearch(event.target.value)} placeholder="Search public active teams" /></label>
            <button type="button" className="secondary-button" onClick={loadTeams}><Search size={16} /> Search Team</button>
          </div>
          <form className="space-y-5" onSubmit={submit}>
            <label className="field-label">Opponent Team<select className="field-input mt-2" required value={form.challengedTeam} onChange={(event) => update('challengedTeam', event.target.value)}><option value="">Select opponent</option>{teams.map((team) => <option key={team._id} value={team._id}>{team.name}</option>)}</select></label>
            {selectedTeam && <div className="rounded-2xl border border-white/[0.07] bg-white/[0.025] p-4"><TeamIdentity team={selectedTeam} logoClassName="size-10 rounded-xl" /><p className="mt-2 text-sm text-white/40">{selectedTeam.city || selectedTeam.homeGround || 'Published FootStream team'}</p></div>}
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Match Type"><select className="field-input mt-2" value={form.matchType} onChange={(event) => update('matchType', event.target.value)}>{matchTypes.map((item) => <option key={item}>{item}</option>)}</select></Field>
              <Field label="Squad Size"><select className="field-input mt-2" value={form.squadSize} onChange={(event) => update('squadSize', event.target.value)}>{squadSizes.map((item) => <option key={item}>{item}</option>)}</select></Field>
              <Field label="Venue"><input className="field-input mt-2" required minLength="2" maxLength="160" value={form.venue} onChange={(event) => update('venue', event.target.value)} /></Field>
              <Field label="Date"><input className="field-input mt-2" required type="date" value={form.proposedDate} onChange={(event) => update('proposedDate', event.target.value)} /></Field>
              <Field label="Time"><input className="field-input mt-2" required type="time" value={form.proposedTime} onChange={(event) => update('proposedTime', event.target.value)} /></Field>
            </div>
            <Field label="Optional Message"><textarea className="field-input mt-2 min-h-28" maxLength="1000" value={form.message} onChange={(event) => update('message', event.target.value)} /></Field>
            <button className="primary-button" disabled={saving}><Send size={17} /> {saving ? 'Sending...' : 'Send Challenge'}</button>
          </form>
        </section>
      ) : (
        <section className="mt-6">
          {loading ? <div className="skeleton h-72" /> : items.length ? (
            <div className="grid gap-4 xl:grid-cols-2">
              {items.map((challenge) => <ChallengeCard key={challenge._id} challenge={challenge} mode={tab} saving={saving} onAction={mutate} />)}
            </div>
          ) : <EmptyState title={`No ${tab} challenges`} message="Challenges will appear here when teams start coordinating fixtures." />}
        </section>
      )}
    </>
  );
}

function ChallengeCard({ challenge, mode, saving, onAction }) {
  const otherTeam = mode === 'sent' ? challenge.challengedTeam : challenge.challengerTeam;
  return (
    <article className="rounded-3xl border border-white/[0.08] bg-white/[0.025] p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="eyebrow">{mode === 'sent' ? 'You challenged' : `${challenge.challengerTeam.name} challenged you`}</p>
          <h2 className="mt-2 font-display text-2xl font-bold"><TeamIdentity team={otherTeam} logoClassName="size-8 rounded-lg" /></h2>
        </div>
        <span className={statusClass[challenge.status]}>{challenge.status}</span>
      </div>
      <div className="mt-5 grid gap-3 text-sm text-white/55 sm:grid-cols-2">
        <Info icon={Shield} label="Format" value={`${challenge.matchType} - ${challenge.squadSize}`} />
        <Info icon={MapPin} label="Venue" value={challenge.venue} />
        <Info icon={CalendarDays} label="Date" value={`${new Date(challenge.proposedDate).toLocaleDateString()} - ${challenge.proposedTime}`} />
        <Info icon={Eye} label="Status" value={challenge.status} />
      </div>
      {challenge.message && <p className="mt-5 whitespace-pre-wrap rounded-2xl bg-black/10 p-4 text-sm leading-6 text-white/55">{challenge.message}</p>}
      {challenge.status === 'Pending' && (
        <div className="mt-5 flex flex-wrap gap-2">
          {mode === 'received' && <><button type="button" className="primary-button" disabled={saving} onClick={() => onAction(challenge, 'accept')}><Check size={16} /> Accept</button><button type="button" className="secondary-button border-red-300/20 text-red-100" disabled={saving} onClick={() => onAction(challenge, 'decline')}><X size={16} /> Decline</button></>}
          {mode === 'sent' && <button type="button" className="secondary-button border-amber-300/20 text-amber-100" disabled={saving} onClick={() => onAction(challenge, 'cancel')}><X size={16} /> Cancel</button>}
        </div>
      )}
    </article>
  );
}

function Field({ label, children }) {
  return <label className="field-label">{label}{children}</label>;
}

function Info({ icon: Icon, label, value }) {
  return <div className="flex items-start gap-3 rounded-2xl bg-black/10 p-3"><Icon size={16} className="mt-0.5 text-lime-300" /><div><p className="text-[10px] font-bold uppercase tracking-wider text-white/30">{label}</p><p className="mt-1 font-semibold text-white/75">{value}</p></div></div>;
}
