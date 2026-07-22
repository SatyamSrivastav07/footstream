import { ArrowLeft, Archive, CheckCircle2, Edit3, PauseCircle, RefreshCw, Save, ShieldCheck, UserCog, XCircle } from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import api from '../api/client.js';
import EmptyState from '../components/EmptyState.jsx';
import Modal from '../components/Modal.jsx';
import TeamIdentity from '../components/TeamIdentity.jsx';

const label = (value = '') => value ? value.replace(/([A-Z])/g, ' $1').replace(/^./, (char) => char.toUpperCase()) : '—';
const statusClass = (status) => status === 'approved' ? 'status-active' : ['suspended', 'rejected', 'archived'].includes(status) ? 'status-off' : 'status-neutral';

export default function AdminTeamDetailPage() {
  const { teamId } = useParams();
  const [data, setData] = useState(null);
  const [admins, setAdmins] = useState([]);
  const [form, setForm] = useState({});
  const [selectedAdmin, setSelectedAdmin] = useState('');
  const [action, setAction] = useState(null);
  const [reason, setReason] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [teamResponse, adminResponse] = await Promise.all([
        api.get(`/admin/teams/${teamId}`),
        api.get('/admin/team-admins/assignable'),
      ]);
      const next = teamResponse.data.data;
      setData(next);
      setAdmins(adminResponse.data.data.users || []);
      setSelectedAdmin(next.team.teamAdmin?.id || '');
      setForm({
        name: next.team.name || '',
        shortName: next.team.shortName || '',
        organization: next.team.organization || '',
        teamType: next.team.teamType || '',
        city: next.team.city || '',
        location: next.team.location || '',
        coach: next.team.coach || '',
        homeGround: next.team.homeGround || '',
        founded: next.team.founded || '',
        description: next.team.description || '',
        isPublished: Boolean(next.team.isPublished),
        acceptingJoinRequests: Boolean(next.team.acceptingJoinRequests),
      });
      setError('');
    } catch (requestError) {
      setError(requestError.userMessage || 'Unable to load team.');
    } finally {
      setLoading(false);
    }
  }, [teamId]);

  useEffect(() => { load(); }, [load]);

  const team = data?.team;
  const statusActions = useMemo(() => {
    if (!team) return [];
    if (team.status === 'approved') return [['suspend', 'Suspend', PauseCircle], ['archive', 'Archive', Archive]];
    if (team.status === 'suspended') return [['reactivate', 'Reactivate', RefreshCw], ['archive', 'Archive', Archive]];
    if (['pending', 'changesRequested'].includes(team.status)) return [['approve', 'Approve', CheckCircle2], ['reject', 'Reject', XCircle], ['request-changes', 'Request changes', Edit3]];
    return [];
  }, [team]);

  const saveInfo = async (event) => {
    event.preventDefault();
    setSaving(true); setError(''); setNotice('');
    try {
      const payload = { ...form, founded: form.founded ? Number(form.founded) : null };
      await api.patch(`/admin/teams/${teamId}`, payload);
      setNotice('Team information updated.');
      await load();
    } catch (requestError) {
      setError(requestError.userMessage || 'Unable to update team.');
    } finally {
      setSaving(false);
    }
  };

  const assignAdmin = async (event) => {
    event.preventDefault();
    if (!selectedAdmin) return;
    setSaving(true); setError(''); setNotice('');
    try {
      await api.patch(`/admin/teams/${teamId}/team-admin`, { userId: selectedAdmin });
      setNotice('Team admin assignment updated.');
      await load();
    } catch (requestError) {
      setError(requestError.userMessage || 'Unable to assign team admin.');
    } finally {
      setSaving(false);
    }
  };

  const runAction = async (event) => {
    event.preventDefault();
    if (!action) return;
    const cleanReason = reason.trim();
    if (['reject', 'request-changes', 'suspend'].includes(action) && !cleanReason) {
      setError('Please write a clear reason/message before confirming.');
      return;
    }
    setSaving(true); setError(''); setNotice('');
    try {
      await api.post(`/admin/teams/${teamId}/${action}`, { reason: cleanReason });
      setNotice(`Team ${action.replace('-', ' ')} completed.`);
      setAction(null); setReason('');
      await load();
    } catch (requestError) {
      setError(requestError.userMessage || 'Unable to update team status.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="skeleton h-96" />;
  if (!team) return <EmptyState title="Team unavailable" message={error || 'This team could not be found.'} />;

  return (
    <>
      <Link to="/admin/teams" className="inline-flex items-center gap-2 text-sm font-semibold text-emerald-100/50 hover:text-lime-200"><ArrowLeft size={16} /> Back to all teams</Link>
      <header className="mt-6 flex flex-col justify-between gap-5 md:flex-row md:items-end">
        <div>
          <p className="eyebrow">Team management</p>
          <h1 className="page-title"><TeamIdentity team={team} logoClassName="size-12 rounded-2xl" /></h1>
          <p className="page-copy">{team.organization || team.location || 'Organization not set'} · {team.city || 'City not set'}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <span className={`status-badge ${statusClass(team.status)}`}>{label(team.status)}</span>
          <Link className="secondary-button" to={`/admin/teams/${teamId}/squad`}>View Squad</Link>
          <Link className="secondary-button" to={`/admin/teams/${teamId}/statistics`}>Statistics</Link>
        </div>
      </header>

      {(error || notice) && <div className={`mt-5 rounded-xl border px-4 py-3 text-sm ${error ? 'border-red-300/20 bg-red-300/10 text-red-100' : 'border-lime-300/20 bg-lime-300/10 text-lime-100'}`} role="status">{error || notice}</div>}

      <div className="mt-7 grid gap-6 xl:grid-cols-[1fr_.9fr]">
        <section className="panel">
          <div className="panel-heading"><div><p className="eyebrow">Identity</p><h2 className="panel-title">Safe team information</h2></div></div>
          <form onSubmit={saveInfo} className="grid gap-4 sm:grid-cols-2">
            <Input label="Team name" value={form.name} onChange={(value) => setForm({ ...form, name: value })} required />
            <Input label="Short name" value={form.shortName} onChange={(value) => setForm({ ...form, shortName: value })} />
            <Input label="College / organization" value={form.organization} onChange={(value) => setForm({ ...form, organization: value })} />
            <Input label="Team type" value={form.teamType} onChange={(value) => setForm({ ...form, teamType: value })} />
            <Input label="City" value={form.city} onChange={(value) => setForm({ ...form, city: value })} />
            <Input label="Location" value={form.location} onChange={(value) => setForm({ ...form, location: value })} />
            <Input label="Coach" value={form.coach} onChange={(value) => setForm({ ...form, coach: value })} />
            <Input label="Home ground" value={form.homeGround} onChange={(value) => setForm({ ...form, homeGround: value })} />
            <Input label="Founded" type="number" value={form.founded} onChange={(value) => setForm({ ...form, founded: value })} />
            <label className="field-label sm:col-span-2">Description<textarea className="field-input mt-2 min-h-28" value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} /></label>
            <label className="flex items-center gap-3 rounded-2xl border border-white/10 p-3 text-sm font-semibold"><input type="checkbox" checked={form.isPublished} onChange={(event) => setForm({ ...form, isPublished: event.target.checked })} /> Public profile published</label>
            <label className="flex items-center gap-3 rounded-2xl border border-white/10 p-3 text-sm font-semibold"><input type="checkbox" checked={form.acceptingJoinRequests} onChange={(event) => setForm({ ...form, acceptingJoinRequests: event.target.checked })} /> Accepting join requests</label>
            <button className="primary-button w-fit" disabled={saving || team.status === 'archived'}><Save size={16} /> Save information</button>
          </form>
        </section>

        <aside className="space-y-6">
          <section className="panel">
            <div className="panel-heading"><div><p className="eyebrow">Administration</p><h2 className="panel-title">Team admin</h2></div><UserCog size={20} /></div>
            <dl className="grid gap-3 text-sm">
              <Info label="Current admin" value={team.teamAdmin ? `${team.teamAdmin.name} · ${team.teamAdmin.email}` : 'Unassigned'} />
              <Info label="Created" value={team.createdAt ? new Date(team.createdAt).toLocaleString() : '—'} />
              <Info label="Updated" value={team.updatedAt ? new Date(team.updatedAt).toLocaleString() : '—'} />
              <Info label="Approved" value={team.approvedAt ? new Date(team.approvedAt).toLocaleString() : '—'} />
            </dl>
            <form onSubmit={assignAdmin} className="mt-4 space-y-3">
              <label className="field-label">Assign / replace team admin
                <select className="field-input mt-2" value={selectedAdmin} onChange={(event) => setSelectedAdmin(event.target.value)}>
                  <option value="">Select active team admin</option>
                  {admins.map((admin) => <option key={admin.id} value={admin.id} disabled={!admin.isActive}>{admin.name} · {admin.email}{admin.teamName ? ` · ${admin.teamName}` : ''}</option>)}
                </select>
              </label>
              <p className="text-xs text-amber-100/70">Replacing an admin disables old admin access for this team.</p>
              <button className="secondary-button" disabled={saving || !selectedAdmin || team.status === 'archived'}><ShieldCheck size={16} /> Update admin</button>
            </form>
          </section>

          <section className="panel">
            <div className="panel-heading"><div><p className="eyebrow">Actions</p><h2 className="panel-title">Status controls</h2></div></div>
            <div className="flex flex-wrap gap-2">
              {statusActions.length ? statusActions.map(([key, text, Icon]) => (
                <button key={key} type="button" className={key === 'archive' || key === 'suspend' || key === 'reject' ? 'secondary-button' : 'primary-button'} onClick={() => { setAction(key); setReason(''); }}>
                  <Icon size={16} /> {text}
                </button>
              )) : <p className="text-sm text-white/45">No status actions are available for this state.</p>}
            </div>
            {team.suspensionReason && <p className="mt-4 rounded-xl bg-red-300/10 p-3 text-sm text-red-100">{team.suspensionReason}</p>}
            {team.archiveReason && <p className="mt-4 rounded-xl bg-white/[0.04] p-3 text-sm text-white/55">{team.archiveReason}</p>}
          </section>
        </aside>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        <Summary title="Squad Summary" items={[
          ['Total players', data.squadSummary.totalPlayers],
          ['Active players', data.squadSummary.activePlayers],
          ['Pending join requests', data.squadSummary.pendingJoinRequests],
          ['Captain', data.squadSummary.captain?.name || '—'],
          ['Vice captain', data.squadSummary.viceCaptain?.name || '—'],
          ['Goalkeepers', data.squadSummary.goalkeepersCount],
        ]} />
        <Summary title="Match Summary" items={[
          ['Total matches', data.matchSummary.totalMatches],
          ['Record', `${data.matchSummary.wins}-${data.matchSummary.draws}-${data.matchSummary.losses}`],
          ['Upcoming', data.matchSummary.upcomingMatches],
          ['Live', data.matchSummary.liveMatches],
        ]} />
        <section className="panel">
          <h2 className="panel-title">Recent Activity</h2>
          {data.recentActivity.length ? <div className="mt-4 space-y-3">{data.recentActivity.map((item, index) => <div key={`${item.type}-${item.at}-${index}`} className="rounded-2xl border border-white/10 p-3"><p className="font-bold">{label(item.type)}</p><p className="text-sm text-white/55">{item.message}</p><p className="mt-1 text-xs text-white/35">{new Date(item.at).toLocaleString()}</p></div>)}</div> : <p className="mt-3 text-sm text-white/45">No safe activity has been recorded yet.</p>}
        </section>
      </div>

      <Modal open={Boolean(action)} onClose={() => setAction(null)} title={`${label(action || '')} team`} description={`Confirm this action for ${team.name}.`}>
        <form onSubmit={runAction} className="space-y-4">
          <p className="rounded-xl border border-amber-300/20 bg-amber-300/10 p-3 text-sm text-amber-100">This action preserves historical matches, results, photos, and statistics.</p>
          {['reject', 'request-changes', 'suspend'].includes(action || '') ? (
            <label className="field-label">Reason / message<textarea className="field-input mt-2 min-h-28" required value={reason} onChange={(event) => setReason(event.target.value)} /></label>
          ) : (
            <label className="field-label">Optional reason<textarea className="field-input mt-2 min-h-24" value={reason} onChange={(event) => setReason(event.target.value)} /></label>
          )}
          <div className="flex justify-end gap-3"><button type="button" className="secondary-button" onClick={() => setAction(null)}>Cancel</button><button className="primary-button" disabled={saving}>{saving ? 'Saving…' : 'Confirm'}</button></div>
        </form>
      </Modal>
    </>
  );
}

function Input({ label, value, onChange, type = 'text', required = false }) {
  return <label className="field-label">{label}<input className="field-input mt-2" type={type} value={value} required={required} onChange={(event) => onChange(event.target.value)} /></label>;
}

function Info({ label, value }) {
  return <div><dt className="text-xs uppercase tracking-wider text-white/35">{label}</dt><dd className="mt-1 font-semibold text-emerald-50/75">{value}</dd></div>;
}

function Summary({ title, items }) {
  return <section className="panel"><h2 className="panel-title">{title}</h2><dl className="mt-4 grid gap-3">{items.map(([key, value]) => <Info key={key} label={key} value={value} />)}</dl></section>;
}
