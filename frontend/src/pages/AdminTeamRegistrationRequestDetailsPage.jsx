import { ArrowLeft, CheckCircle, XCircle } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import api from '../api/client.js';
import EmptyState from '../components/EmptyState.jsx';

export default function AdminTeamRegistrationRequestDetailsPage() {
  const { requestId } = useParams();
  const [request, setRequest] = useState(null);
  const [approval, setApproval] = useState({ teamName: '', slug: '', adminName: '', adminEmail: '', temporaryPassword: '' });
  const [rejectionReason, setRejectionReason] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const load = useCallback(async () => {
    setLoading(true);
    try {
      const response = await api.get(`/admin/team-registration-requests/${requestId}`);
      const next = response.data.data.request;
      setRequest(next);
      setApproval((current) => ({
        ...current,
        teamName: current.teamName || next.teamName || '',
        slug: current.slug || (next.teamName || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, ''),
        adminName: current.adminName || next.representativeName || '',
        adminEmail: current.adminEmail || next.email || '',
      }));
      setError('');
    } catch (requestError) { setError(requestError.userMessage); }
    finally { setLoading(false); }
  }, [requestId]);
  useEffect(() => { load(); }, [load]);
  const approve = async (event) => {
    event.preventDefault(); setSaving(true); setError('');
    try {
      await api.patch(`/admin/team-registration-requests/${requestId}/approve`, approval);
      setNotice('Team and admin account created.');
      setApproval((current) => ({ ...current, temporaryPassword: '' }));
      await load();
    } catch (requestError) { setError(requestError.userMessage); }
    finally { setSaving(false); }
  };
  const reject = async (event) => {
    event.preventDefault(); setSaving(true); setError('');
    try {
      await api.patch(`/admin/team-registration-requests/${requestId}/reject`, { rejectionReason });
      setNotice('Request rejected.');
      await load();
    } catch (requestError) { setError(requestError.userMessage); }
    finally { setSaving(false); }
  };
  if (loading) return <div className="skeleton h-96" />;
  if (!request) return <EmptyState title="Request unavailable" message={error || 'Team registration request could not be loaded.'} />;
  const pending = request.status === 'pending';
  return <><Link to="/admin/team-requests" className="inline-flex items-center gap-2 text-sm font-semibold text-emerald-100/50 hover:text-lime-200"><ArrowLeft size={16} /> Back to team requests</Link>
    <header className="mt-6"><p className="eyebrow">{request.status}</p><h1 className="page-title">{request.teamName}</h1><p className="page-copy">{request.city}, {request.country} · submitted by {request.representativeName}</p></header>
    {error && <div className="mt-5 rounded-xl border border-red-300/20 bg-red-300/10 p-4 text-red-100">{error}</div>}
    {notice && <div className="mt-5 rounded-xl border border-lime-300/20 bg-lime-300/10 p-4 text-lime-100">{notice}</div>}
    <div className="mt-6 grid gap-6 xl:grid-cols-[1fr_.9fr]">
      <section className="panel"><div className="grid gap-4 sm:grid-cols-2"><Info label="Short name" value={request.shortName || '—'} /><Info label="Request code" value={request.requestCode} /><Info label="Representative" value={`${request.representativeName} · ${request.roleInTeam}`} /><Info label="Email" value={request.email} /><Info label="Phone" value={request.phone} /><Info label="Submitted" value={new Date(request.submittedAt).toLocaleString()} /><Info label="Instagram" value={request.instagramUrl || '—'} /><Info label="Website" value={request.websiteUrl || '—'} /></div><p className="mt-5 text-white/60">{request.description || request.message || 'No additional message.'}</p><div className="mt-5 grid gap-4 sm:grid-cols-2">{request.logoUrl && <img src={request.logoUrl} alt="" className="h-36 rounded-2xl object-cover" />}{request.coverUrl && <img src={request.coverUrl} alt="" className="h-36 rounded-2xl object-cover" />}</div>{request.rejectionReason && <p className="mt-5 rounded-xl bg-red-300/10 p-3 text-red-100">{request.rejectionReason}</p>}</section>
      <section className="space-y-5">{pending ? <><form onSubmit={approve} className="panel space-y-3"><h2 className="panel-title">Approve and create team</h2><Input label="Final team name" value={approval.teamName} onChange={(value) => setApproval({ ...approval, teamName: value })} /><Input label="Slug" value={approval.slug} onChange={(value) => setApproval({ ...approval, slug: value })} /><Input label="Admin full name" value={approval.adminName} onChange={(value) => setApproval({ ...approval, adminName: value })} /><Input label="Admin email" type="email" value={approval.adminEmail} onChange={(value) => setApproval({ ...approval, adminEmail: value })} /><Input label="Temporary password" type="password" value={approval.temporaryPassword} onChange={(value) => setApproval({ ...approval, temporaryPassword: value })} /><button className="primary-button" disabled={saving}><CheckCircle size={16} /> Approve</button></form><form onSubmit={reject} className="panel space-y-3"><h2 className="panel-title">Reject request</h2><textarea className="field-input min-h-28" value={rejectionReason} onChange={(event) => setRejectionReason(event.target.value)} placeholder="Safe rejection reason" /><button className="secondary-button" disabled={saving}><XCircle size={16} /> Reject</button></form></> : <div className="panel"><h2 className="panel-title">Review complete</h2><p className="mt-2 text-white/55">Created team: {request.createdTeam || '—'}</p><p className="mt-1 text-white/55">Created admin: {request.createdAdmin || '—'}</p></div>}</section>
    </div>
  </>;
}

function Info({ label, value }) { return <div><dt className="text-xs uppercase tracking-wider text-white/35">{label}</dt><dd className="mt-1 font-semibold">{value}</dd></div>; }
function Input({ label, value, onChange, type = 'text' }) { return <label className="field-label">{label}<input className="field-input" type={type} value={value} onChange={(event) => onChange(event.target.value)} required /></label>; }
