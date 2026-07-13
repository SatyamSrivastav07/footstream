import { CalendarDays, Check, Eye, MapPin, RefreshCcw, Search, Send, Shield, X } from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import api from '../api/client.js';
import EmptyState from '../components/EmptyState.jsx';
import TeamIdentity from '../components/TeamIdentity.jsx';

const tabs = ['received', 'sent', 'create'];
const statusTabs = ['all', 'pending', 'countered', 'accepted', 'declined', 'cancelled'];
const matchTypes = ['Friendly', 'Practice', 'League'];
const squadSizes = ['5v5', '7v7', '11v11'];
const initialForm = { challengedTeam: '', matchType: 'Friendly', squadSize: '11v11', venue: '', proposedDate: '', proposedTime: '', message: '' };
const initialCounter = { venue: '', proposedDate: '', proposedTime: '', message: '' };
const statusClass = {
  pending: 'status-badge status-neutral',
  countered: 'status-badge border-sky-300/20 bg-sky-300/10 text-sky-100',
  accepted: 'status-badge status-active',
  declined: 'status-badge status-off',
  cancelled: 'status-badge border-amber-300/20 bg-amber-300/10 text-amber-100',
};
const displayStatus = (status) => `${status || ''}`.replace(/^\w/, (letter) => letter.toUpperCase());

export default function TeamChallengesPage() {
  const [tab, setTab] = useState('received');
  const [sent, setSent] = useState([]);
  const [received, setReceived] = useState([]);
  const [teams, setTeams] = useState([]);
  const [teamSearch, setTeamSearch] = useState('');
  const [form, setForm] = useState(initialForm);
  const [statusFilter, setStatusFilter] = useState('all');
  const [counterForms, setCounterForms] = useState({});
  const [history, setHistory] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const loadLists = useCallback(async () => {
    setLoading(true);
    try {
      const [sentResponse, receivedResponse] = await Promise.all([
        api.get('/team/challenges/sent', { params: statusFilter === 'all' ? {} : { status: statusFilter } }),
        api.get('/team/challenges/received', { params: statusFilter === 'all' ? {} : { status: statusFilter } }),
      ]);
      setSent(sentResponse.data.data.challenges);
      setReceived(receivedResponse.data.data.challenges);
      setError('');
    } catch (requestError) {
      setError(requestError.userMessage);
    } finally {
      setLoading(false);
    }
  }, [statusFilter]);

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
      setMessage(action === 'accept' || action === 'accept-counter' ? 'Challenge accepted. Fixture created successfully.' : `Challenge ${action === 'decline' ? 'declined' : action === 'reject-counter' ? 'counter rejected' : 'cancelled'}.`);
      await loadLists();
    } catch (requestError) {
      setError(requestError.userMessage);
    } finally {
      setSaving(false);
    }
  };

  const submitCounter = async (challenge, values) => {
    setSaving(true); setError(''); setMessage('');
    try {
      await api.patch(`/team/challenges/${challenge._id}/counter`, values);
      setCounterForms((current) => ({ ...current, [challenge._id]: null }));
      setMessage('Counter proposal sent. Waiting for challenger.');
      await loadLists();
    } catch (requestError) {
      setError(requestError.userMessage);
    } finally {
      setSaving(false);
    }
  };

  const loadHistory = async (challenge) => {
    try {
      const response = await api.get(`/team/challenges/${challenge._id}/history`);
      setHistory((current) => ({ ...current, [challenge._id]: response.data.data.history }));
    } catch (requestError) {
      setError(requestError.userMessage);
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
      {tab !== 'create' && (
        <div className="mt-3 flex gap-2 overflow-x-auto pb-2" aria-label="Challenge status filters">
          {statusTabs.map((item) => (
            <button key={item} type="button" className={`secondary-button shrink-0 capitalize ${statusFilter === item ? 'border-lime-300/40 text-lime-100' : ''}`} onClick={() => setStatusFilter(item)}>
              {item}
            </button>
          ))}
        </div>
      )}

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
              {items.map((challenge) => (
                <ChallengeCard
                  key={challenge._id}
                  challenge={challenge}
                  mode={tab}
                  saving={saving}
                  counterValue={counterForms[challenge._id]}
                  history={history[challenge._id]}
                  onAction={mutate}
                  onCounterChange={(value) => setCounterForms((current) => ({ ...current, [challenge._id]: value }))}
                  onCounterSubmit={submitCounter}
                  onHistory={loadHistory}
                />
              ))}
            </div>
          ) : <EmptyState title={`No ${tab} challenges`} message="Challenges will appear here when teams start coordinating fixtures." />}
        </section>
      )}
    </>
  );
}

function ChallengeCard({ challenge, mode, saving, counterValue, history, onAction, onCounterChange, onCounterSubmit, onHistory }) {
  const otherTeam = mode === 'sent' ? challenge.challengedTeam : challenge.challengerTeam;
  const isPending = challenge.status === 'pending';
  const isCountered = challenge.status === 'countered';
  const showCounterForm = counterValue !== undefined && counterValue !== null;
  return (
    <article className="rounded-3xl border border-white/[0.08] bg-white/[0.025] p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="eyebrow">{mode === 'sent' ? 'You challenged' : `${challenge.challengerTeam.name} challenged you`}</p>
          <h2 className="mt-2 font-display text-2xl font-bold"><TeamIdentity team={otherTeam} logoClassName="size-8 rounded-lg" /></h2>
        </div>
        <span className={statusClass[challenge.status] || 'status-badge status-neutral'}>{displayStatus(challenge.status)}</span>
      </div>
      <div className="mt-5 grid gap-3 text-sm text-white/55 sm:grid-cols-2">
        <Info icon={Shield} label="Format" value={`${challenge.matchType} - ${challenge.squadSize}`} />
        <Info icon={MapPin} label="Venue" value={challenge.venue} />
        <Info icon={CalendarDays} label="Date" value={`${new Date(challenge.proposedDate).toLocaleDateString()} - ${challenge.proposedTime}`} />
        <Info icon={Eye} label="Status" value={challenge.status} />
      </div>
      {challenge.message && <p className="mt-5 whitespace-pre-wrap rounded-2xl bg-black/10 p-4 text-sm leading-6 text-white/55">{challenge.message}</p>}
      {challenge.counterProposal && (
        <div className="mt-5 rounded-2xl border border-sky-300/15 bg-sky-300/10 p-4">
          <p className="eyebrow">Counter proposal received</p>
          <div className="mt-3 grid gap-3 text-sm text-white/65 sm:grid-cols-3">
            <Info icon={MapPin} label="Venue" value={challenge.counterProposal.venue} />
            <Info icon={CalendarDays} label="Date" value={`${new Date(challenge.counterProposal.proposedDate).toLocaleDateString()} - ${challenge.counterProposal.proposedTime}`} />
            <Info icon={RefreshCcw} label="Status" value={mode === 'sent' ? 'Your response needed' : 'Waiting for challenger'} />
          </div>
          {challenge.counterProposal.message && <p className="mt-3 whitespace-pre-wrap text-sm text-white/60">{challenge.counterProposal.message}</p>}
        </div>
      )}
      {isPending && (
        <div className="mt-5 flex flex-wrap gap-2">
          {mode === 'received' && <><button type="button" className="primary-button" disabled={saving} onClick={() => onAction(challenge, 'accept')}><Check size={16} /> Accept</button><button type="button" className="secondary-button" disabled={saving} onClick={() => onCounterChange(initialCounter)}><RefreshCcw size={16} /> Suggest Changes</button><button type="button" className="secondary-button border-red-300/20 text-red-100" disabled={saving} onClick={() => onAction(challenge, 'decline')}><X size={16} /> Decline</button></>}
          {mode === 'sent' && <button type="button" className="secondary-button border-amber-300/20 text-amber-100" disabled={saving} onClick={() => onAction(challenge, 'cancel')}><X size={16} /> Cancel</button>}
        </div>
      )}
      {isCountered && mode === 'sent' && (
        <div className="mt-5 flex flex-wrap gap-2">
          <button type="button" className="primary-button" disabled={saving} onClick={() => onAction(challenge, 'accept-counter')}><Check size={16} /> Accept Counter</button>
          <button type="button" className="secondary-button" disabled={saving} onClick={() => onAction(challenge, 'reject-counter')}><X size={16} /> Reject Counter</button>
          <button type="button" className="secondary-button border-amber-300/20 text-amber-100" disabled={saving} onClick={() => onAction(challenge, 'cancel')}><X size={16} /> Cancel</button>
        </div>
      )}
      {isCountered && mode === 'received' && <p className="mt-5 rounded-2xl bg-black/10 p-4 text-sm text-white/55">Waiting for challenger to accept or reject your counter proposal.</p>}
      {showCounterForm && (
        <CounterForm value={counterValue} saving={saving} onCancel={() => onCounterChange(null)} onChange={onCounterChange} onSubmit={(values) => onCounterSubmit(challenge, values)} />
      )}
      {challenge.status === 'accepted' && challenge.createdMatch && (
        <a className="primary-button mt-5 inline-flex" href={`/team/matches/${challenge.createdMatch._id}`}>View Fixture</a>
      )}
      <div className="mt-5">
        <button type="button" className="secondary-button" onClick={() => onHistory(challenge)}>Challenge History</button>
        {history && <Timeline items={history} />}
      </div>
    </article>
  );
}

function CounterForm({ value, saving, onCancel, onChange, onSubmit }) {
  const update = (field, fieldValue) => onChange({ ...value, [field]: fieldValue });
  return (
    <form className="mt-5 rounded-2xl border border-white/[0.08] bg-black/10 p-4" onSubmit={(event) => { event.preventDefault(); onSubmit(value); }}>
      <p className="eyebrow">Suggest changes</p>
      <div className="mt-4 grid gap-4 sm:grid-cols-3">
        <Field label="Venue"><input className="field-input mt-2" required minLength="2" maxLength="160" value={value.venue} onChange={(event) => update('venue', event.target.value)} /></Field>
        <Field label="Date"><input className="field-input mt-2" required type="date" value={value.proposedDate} onChange={(event) => update('proposedDate', event.target.value)} /></Field>
        <Field label="Time"><input className="field-input mt-2" required type="time" value={value.proposedTime} onChange={(event) => update('proposedTime', event.target.value)} /></Field>
      </div>
      <Field label="Optional Message"><textarea className="field-input mt-2 min-h-24" maxLength="1000" value={value.message} onChange={(event) => update('message', event.target.value)} /></Field>
      <div className="mt-4 flex flex-wrap gap-2">
        <button type="submit" className="primary-button" disabled={saving}><Send size={16} /> Send Counter</button>
        <button type="button" className="secondary-button" disabled={saving} onClick={onCancel}>Cancel</button>
      </div>
    </form>
  );
}

function Timeline({ items }) {
  return (
    <ol className="mt-4 space-y-3 border-l border-white/10 pl-4">
      {items.map((item) => (
        <li key={`${item.action}-${item.createdAt}`} className="text-sm text-white/55">
          <div className="flex flex-wrap items-center gap-2">
            {item.actorTeam && <TeamIdentity team={item.actorTeam} logoClassName="size-6 rounded-md" />}
            <span className="font-semibold text-white/80">{item.action.replaceAll('-', ' ')}</span>
            <span>{new Date(item.createdAt).toLocaleString()}</span>
          </div>
          {item.snapshot && <p className="mt-1 text-white/40">{item.snapshot.venue} - {item.snapshot.proposedTime}</p>}
        </li>
      ))}
    </ol>
  );
}

function Field({ label, children }) {
  return <label className="field-label">{label}{children}</label>;
}

function Info({ icon: Icon, label, value }) {
  return <div className="flex items-start gap-3 rounded-2xl bg-black/10 p-3"><Icon size={16} className="mt-0.5 text-lime-300" /><div><p className="text-[10px] font-bold uppercase tracking-wider text-white/30">{label}</p><p className="mt-1 font-semibold text-white/75">{value}</p></div></div>;
}
