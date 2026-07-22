import { ArrowLeft, ExternalLink, ShieldCheck, UserX } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import api from '../api/client.js';
import LoadingScreen from '../components/LoadingScreen.jsx';
import Modal from '../components/Modal.jsx';
import PlayerAvatar from '../features/squad/PlayerAvatar.jsx';
import { ACADEMIC_YEARS, AVAILABILITY, POSITIONS, PREFERRED_FEET, statusClass, statusLabel } from '../features/joinRequests/joinRequestConstants.js';

export default function TeamJoinRequestDetailsPage() {
  const { requestId } = useParams();
  const [request, setRequest] = useState(null);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [approveOpen, setApproveOpen] = useState(false);
  const [rejectOpen, setRejectOpen] = useState(false);
  const load = useCallback(async () => {
    try {
      const response = await api.get(`/team/join-requests/${requestId}`);
      setRequest(response.data.data.request);
      setError('');
    } catch (requestError) {
      setError(requestError.userMessage);
    }
  }, [requestId]);
  useEffect(() => { load(); }, [load]);
  if (!request && !error) return <LoadingScreen />;
  if (!request) return <div className="text-red-200">{error}</div>;
  return (
    <>
      <Link className="inline-flex items-center gap-2 text-sm text-lime-200" to="/team/join-requests"><ArrowLeft size={16} /> Back to requests</Link>
      <header className="mt-6 flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
        <div><p className="eyebrow">{request.requestCode}</p><h1 className="page-title">{request.applicantName}</h1><p className="page-copy">Review applicant details and decide whether to add this player to your squad.</p></div>
        <span className={statusClass[request.status]}>{statusLabel(request.status)}</span>
      </header>
      {(error || notice) && <div className={`mt-6 rounded-xl border px-4 py-3 text-sm ${error ? 'border-red-300/20 bg-red-300/10 text-red-100' : 'border-lime-300/20 bg-lime-300/10 text-lime-100'}`}>{error || notice}</div>}
      <section className="mt-7 grid gap-6 xl:grid-cols-[.8fr_1.2fr]">
        <article className="panel">
          <PlayerAvatar src={request.photoUrl} name={request.applicantName} className="aspect-square w-full rounded-3xl" />
          {request.status === 'pending' && <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-1"><button className="primary-button" onClick={() => setApproveOpen(true)}><ShieldCheck size={17} /> Approve & Add to Squad</button><button className="secondary-button border-red-300/20 text-red-100" onClick={() => setRejectOpen(true)}><UserX size={17} /> Reject</button></div>}
          {request.createdPlayer && <Link className="primary-button mt-5 w-full" to={`/team/players/${request.createdPlayer}/statistics`}>View created player</Link>}
        </article>
        <article className="panel">
          <div className="grid gap-4 sm:grid-cols-2">
            <Info label="Position" value={request.position} />
            <Info label="Age" value={request.age || 'Not listed'} />
            <Info label="Academic year" value={request.academicYear || 'Not listed'} />
            <Info label="Preferred foot" value={request.preferredFoot || 'Not listed'} />
            <Info label="Email" value={request.email} />
            <Info label="Phone" value={request.phone} />
            <Info label="Submitted" value={new Date(request.createdAt).toLocaleString()} />
            <Info label="Reviewed" value={request.reviewedAt ? new Date(request.reviewedAt).toLocaleString() : 'Not reviewed'} />
          </div>
          {request.highlightsUrl && <a className="secondary-button mt-5 w-fit" href={request.highlightsUrl} target="_blank" rel="noopener noreferrer">Highlights <ExternalLink size={15} /></a>}
          <Long label="Short Bio" value={request.shortBio} />
          <Long label="Previous Experience" value={request.previousExperience} />
          <Long label="Motivation" value={request.motivation} />
          {request.rejectionReason && <Long label="Rejection Reason" value={request.rejectionReason} />}
        </article>
      </section>
      <ApproveModal open={approveOpen} request={request} onClose={() => setApproveOpen(false)} onDone={async () => { setApproveOpen(false); setNotice('Request approved and player added.'); await load(); }} />
      <RejectModal open={rejectOpen} request={request} onClose={() => setRejectOpen(false)} onDone={async () => { setRejectOpen(false); setNotice('Request rejected.'); await load(); }} />
    </>
  );
}

function ApproveModal({ open, request, onClose, onDone }) {
  const [form, setForm] = useState({ name: request.applicantName, position: request.position, age: request.age || '', academicYear: request.academicYear || '', preferredFoot: request.preferredFoot || '', jerseyNumber: '', availabilityStatus: 'available', isCaptain: false, isViceCaptain: false });
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  useEffect(() => { if (open) setForm({ name: request.applicantName, position: request.position, age: request.age || '', academicYear: request.academicYear || '', preferredFoot: request.preferredFoot || '', jerseyNumber: '', availabilityStatus: 'available', isCaptain: false, isViceCaptain: false }); }, [open, request]);
  const update = (field, value) => setForm((current) => ({ ...current, [field]: value }));
  const submit = async (event) => {
    event.preventDefault();
    setSaving(true); setError('');
    try {
      await api.patch(`/team/join-requests/${request._id}/approve`, { ...form, jerseyNumber: Number(form.jerseyNumber), age: form.age === '' ? null : Number(form.age), academicYear: form.academicYear || null, preferredFoot: form.preferredFoot || null });
      await onDone();
    } catch (requestError) { setError(requestError.userMessage); }
    finally { setSaving(false); }
  };
  return <Modal open={open} onClose={onClose} title="Approve join request" description="Assign official squad details. The applicant never chooses the jersey number."><form className="space-y-4" onSubmit={submit}>{error && <p className="rounded-xl bg-red-300/10 p-3 text-sm text-red-100">{error}</p>}<div className="grid gap-3 sm:grid-cols-2"><Field label="Name"><input className="field-input mt-2" value={form.name} onChange={(e) => update('name', e.target.value)} /></Field><Field label="Official Jersey Number"><input className="field-input mt-2" type="number" min="1" max="99" value={form.jerseyNumber} onChange={(e) => update('jerseyNumber', e.target.value)} required /></Field><Field label="Position"><select className="field-input mt-2" value={form.position} onChange={(e) => update('position', e.target.value)}>{POSITIONS.map((item) => <option key={item}>{item}</option>)}</select></Field><Field label="Availability"><select className="field-input mt-2" value={form.availabilityStatus} onChange={(e) => update('availabilityStatus', e.target.value)}>{AVAILABILITY.map((item) => <option key={item}>{item}</option>)}</select></Field><Field label="Age"><input className="field-input mt-2" type="number" min="14" max="60" value={form.age} onChange={(e) => update('age', e.target.value)} /></Field><Field label="Academic year"><select className="field-input mt-2" value={form.academicYear} onChange={(e) => update('academicYear', e.target.value)}><option value="">Not specified</option>{ACADEMIC_YEARS.map((item) => <option key={item}>{item}</option>)}</select></Field><Field label="Preferred foot"><select className="field-input mt-2" value={form.preferredFoot} onChange={(e) => update('preferredFoot', e.target.value)}><option value="">Not specified</option>{PREFERRED_FEET.map((item) => <option key={item}>{item}</option>)}</select></Field></div><div className="grid gap-3 sm:grid-cols-2"><Check label="Captain" checked={form.isCaptain} onChange={(value) => update('isCaptain', value)} /><Check label="Vice Captain" checked={form.isViceCaptain} onChange={(value) => update('isViceCaptain', value)} /></div><button className="primary-button w-full" disabled={saving}>{saving ? 'Approving...' : 'Approve & Add to Squad'}</button></form></Modal>;
}

function RejectModal({ open, request, onClose, onDone }) {
  const [reason, setReason] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  useEffect(() => { if (open) { setReason(''); setError(''); } }, [open]);
  const submit = async (event) => {
    event.preventDefault();
    setSaving(true); setError('');
    try { await api.patch(`/team/join-requests/${request._id}/reject`, { rejectionReason: reason.trim() }); await onDone(); }
    catch (requestError) { setError(requestError.userMessage); }
    finally { setSaving(false); }
  };
  return <Modal open={open} onClose={onClose} title="Reject join request" description="No player will be created. Applicant photo storage is cleaned up."><form className="space-y-4" onSubmit={submit}>{error && <p className="rounded-xl bg-red-300/10 p-3 text-sm text-red-100">{error}</p>}<Field label="Reason (optional)"><textarea className="field-input mt-2 min-h-28" value={reason} onChange={(e) => setReason(e.target.value)} /></Field><button className="primary-button w-full bg-red-300 text-red-950 hover:bg-red-200" disabled={saving}>{saving ? 'Rejecting...' : 'Reject request'}</button></form></Modal>;
}

function Info({ label, value }) { return <div className="rounded-2xl bg-black/10 p-4"><p className="text-xs text-white/35">{label}</p><p className="mt-1 font-semibold">{value}</p></div>; }
function Long({ label, value }) { if (!value) return null; return <section className="mt-6"><p className="text-xs font-bold uppercase tracking-wider text-lime-200/50">{label}</p><p className="mt-2 whitespace-pre-wrap text-sm leading-7 text-white/55">{value}</p></section>; }
function Field({ label, children }) { return <label className="field-label">{label}{children}</label>; }
function Check({ label, checked, onChange }) { return <label className="flex items-center gap-3 rounded-xl border border-white/10 bg-black/10 px-4 py-3 text-sm font-semibold"><input type="checkbox" className="size-4 accent-lime-300" checked={checked} onChange={(e) => onChange(e.target.checked)} />{label}</label>; }
