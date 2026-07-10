import { Building2, Eye, Plus, ShieldCheck, UserCheck, UserX, Users } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../api/client.js';
import EmptyState from '../components/EmptyState.jsx';
import Modal from '../components/Modal.jsx';

const initialTeam = { name: '', location: '', description: '' };
const initialAdmin = { name: '', email: '', password: '', teamId: '' };

export default function SuperAdminDashboard() {
  const [teams, setTeams] = useState([]);
  const [admins, setAdmins] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [modal, setModal] = useState(null);
  const [teamForm, setTeamForm] = useState(initialTeam);
  const [adminForm, setAdminForm] = useState(initialAdmin);
  const [submitting, setSubmitting] = useState(false);

  const loadData = useCallback(async () => {
    try {
      const [teamResponse, adminResponse] = await Promise.all([
        api.get('/admin/teams'),
        api.get('/admin/team-admins'),
      ]);
      setTeams(teamResponse.data.data.teams);
      setAdmins(adminResponse.data.data.users);
      setError('');
    } catch (requestError) {
      setError(requestError.userMessage);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const createTeam = async (event) => {
    event.preventDefault();
    setSubmitting(true); setError('');
    try {
      await api.post('/admin/teams', teamForm);
      setTeamForm(initialTeam); setModal(null); setNotice('Team created successfully.');
      await loadData();
    } catch (requestError) { setError(requestError.userMessage); }
    finally { setSubmitting(false); }
  };

  const createAdmin = async (event) => {
    event.preventDefault();
    setSubmitting(true); setError('');
    try {
      await api.post('/admin/team-admins', adminForm);
      setAdminForm(initialAdmin); setModal(null); setNotice('Team administrator created successfully.');
      await loadData();
    } catch (requestError) { setError(requestError.userMessage); }
    finally { setSubmitting(false); }
  };

  const toggleStatus = async (admin) => {
    setError('');
    try {
      await api.patch(`/admin/team-admins/${admin._id}/status`, { isActive: !admin.isActive });
      setNotice(`${admin.name} has been ${admin.isActive ? 'disabled' : 'enabled'}.`);
      await loadData();
    } catch (requestError) { setError(requestError.userMessage); }
  };

  const activeAdmins = admins.filter((admin) => admin.isActive).length;

  return (
    <>
      <header className="flex flex-col justify-between gap-6 md:flex-row md:items-end">
        <div>
          <p className="eyebrow">Organization overview</p>
          <h1 className="page-title">Control room</h1>
          <p className="page-copy">Create clubs, issue administrator access, and keep every team accountable.</p>
        </div>
        <div className="flex flex-wrap gap-3">
          <button type="button" className="secondary-button" onClick={() => { setError(''); setModal('admin'); }} disabled={teams.length === 0}><Users size={17} /> Add team admin</button>
          <button type="button" className="primary-button" onClick={() => { setError(''); setModal('team'); }}><Plus size={17} /> Create team</button>
        </div>
      </header>

      {(error || notice) && <div className={`mt-7 rounded-xl border px-4 py-3 text-sm ${error ? 'border-red-300/20 bg-red-300/10 text-red-100' : 'border-lime-300/15 bg-lime-300/[0.07] text-lime-100'}`} role="status">{error || notice}</div>}

      <section className="mt-9 grid gap-4 sm:grid-cols-3" aria-label="Overview metrics">
        <Metric label="Managed teams" value={teams.length} icon={Building2} accent="lime" />
        <Metric label="Team administrators" value={admins.length} icon={ShieldCheck} accent="emerald" />
        <Metric label="Active access" value={activeAdmins} icon={UserCheck} accent="blue" />
      </section>

      <div className="mt-9 grid gap-6 xl:grid-cols-[1fr_1.08fr]">
        <section className="panel">
          <div className="panel-heading"><div><p className="eyebrow">Clubs</p><h2 className="panel-title">Team registry</h2></div><span className="count-pill">{teams.length}</span></div>
          {loading ? <TableLoader /> : teams.length === 0 ? <EmptyState title="No teams yet" message="Create your first team to begin issuing team-admin access." /> : (
            <div className="space-y-3">
              {teams.map((team) => (
                <article key={team._id} className="list-card">
                  <div className="grid size-11 shrink-0 place-items-center rounded-xl bg-lime-300/10 font-display text-lg font-bold text-lime-200">{team.name.slice(0, 2).toUpperCase()}</div>
                  <div className="min-w-0 flex-1"><h3 className="truncate font-semibold text-white">{team.name}</h3><p className="mt-1 truncate text-xs text-emerald-100/45">{team.location || 'Location not set'} · {team.adminCount} admin{team.adminCount === 1 ? '' : 's'}</p></div>
                  <span className="status-badge status-neutral">Private</span>
                  <Link to={`/admin/teams/${team._id}/squad`} className="icon-button" aria-label={`View ${team.name} squad`} title="View squad"><Eye size={17} /></Link>
                </article>
              ))}
            </div>
          )}
        </section>

        <section className="panel">
          <div className="panel-heading"><div><p className="eyebrow">Access</p><h2 className="panel-title">Team administrators</h2></div><span className="count-pill">{activeAdmins} active</span></div>
          {loading ? <TableLoader /> : admins.length === 0 ? <EmptyState title="No team admins yet" message="Once a team exists, issue secure access to its administrator." /> : (
            <div className="space-y-3">
              {admins.map((admin) => (
                <article key={admin._id} className="list-card">
                  <div className="grid size-11 shrink-0 place-items-center rounded-full bg-emerald-400/10 text-sm font-bold text-emerald-200">{admin.name.slice(0, 2).toUpperCase()}</div>
                  <div className="min-w-0 flex-1"><h3 className="truncate font-semibold text-white">{admin.name}</h3><p className="mt-1 truncate text-xs text-emerald-100/45">{admin.team?.name || 'Unassigned'} · {admin.email}</p></div>
                  <span className={`status-badge ${admin.isActive ? 'status-active' : 'status-off'}`}>{admin.isActive ? 'Active' : 'Disabled'}</span>
                  <button type="button" onClick={() => toggleStatus(admin)} className="icon-button" title={admin.isActive ? 'Disable administrator' : 'Enable administrator'} aria-label={`${admin.isActive ? 'Disable' : 'Enable'} ${admin.name}`}>
                    {admin.isActive ? <UserX size={17} /> : <UserCheck size={17} />}
                  </button>
                </article>
              ))}
            </div>
          )}
        </section>
      </div>

      <Modal open={modal === 'team'} onClose={() => setModal(null)} title="Create a team" description="Set up the club before assigning its administrator.">
        <form onSubmit={createTeam} className="space-y-4">
          <FormError error={error} />
          <label className="field-label">Team name<input className="field-input mt-2" required minLength="2" maxLength="100" value={teamForm.name} onChange={(e) => setTeamForm({ ...teamForm, name: e.target.value })} placeholder="Northfield FC" /></label>
          <label className="field-label">Location<input className="field-input mt-2" maxLength="160" value={teamForm.location} onChange={(e) => setTeamForm({ ...teamForm, location: e.target.value })} placeholder="Bengaluru, Karnataka" /></label>
          <label className="field-label">Description<textarea className="field-input mt-2 min-h-24 resize-y" maxLength="1000" value={teamForm.description} onChange={(e) => setTeamForm({ ...teamForm, description: e.target.value })} placeholder="A short introduction to the team" /></label>
          <div className="flex justify-end gap-3 pt-2"><button type="button" className="secondary-button" onClick={() => setModal(null)}>Cancel</button><button type="submit" className="primary-button" disabled={submitting}>{submitting ? 'Creating…' : 'Create team'}</button></div>
        </form>
      </Modal>

      <Modal open={modal === 'admin'} onClose={() => setModal(null)} title="Issue team access" description="Create an administrator account and bind it to one team.">
        <form onSubmit={createAdmin} className="space-y-4">
          <FormError error={error} />
          <label className="field-label">Full name<input className="field-input mt-2" required minLength="2" value={adminForm.name} onChange={(e) => setAdminForm({ ...adminForm, name: e.target.value })} placeholder="Aarav Sharma" /></label>
          <label className="field-label">Email address<input className="field-input mt-2" type="email" required value={adminForm.email} onChange={(e) => setAdminForm({ ...adminForm, email: e.target.value })} placeholder="admin@club.com" /></label>
          <label className="field-label">Initial password<input className="field-input mt-2" type="password" required minLength="10" maxLength="128" value={adminForm.password} onChange={(e) => setAdminForm({ ...adminForm, password: e.target.value })} placeholder="10+ chars, uppercase, lowercase, number" /></label>
          <label className="field-label">Assigned team<select className="field-input mt-2" required value={adminForm.teamId} onChange={(e) => setAdminForm({ ...adminForm, teamId: e.target.value })}><option value="">Select a team</option>{teams.map((team) => <option key={team._id} value={team._id}>{team.name}</option>)}</select></label>
          <div className="flex justify-end gap-3 pt-2"><button type="button" className="secondary-button" onClick={() => setModal(null)}>Cancel</button><button type="submit" className="primary-button" disabled={submitting}>{submitting ? 'Creating…' : 'Create admin'}</button></div>
        </form>
      </Modal>
    </>
  );
}

function Metric({ label, value, icon: Icon, accent }) {
  return <article className="metric-card"><div className={`metric-icon metric-${accent}`}><Icon size={20} /></div><div><p className="text-sm text-emerald-100/45">{label}</p><p className="font-display text-3xl font-bold tracking-tight text-white">{value}</p></div></article>;
}

function TableLoader() {
  return <div className="space-y-3" aria-label="Loading"><div className="skeleton h-16" /><div className="skeleton h-16" /><div className="skeleton h-16" /></div>;
}

function FormError({ error }) {
  return error ? <div className="rounded-xl border border-red-300/20 bg-red-300/10 px-4 py-3 text-sm text-red-100" role="alert">{error}</div> : null;
}
