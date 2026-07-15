import { Search } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import api from '../api/client.js';
import usePageMetadata from '../hooks/usePageMetadata.js';

export default function PublicTeamRegistrationStatusPage() {
  const { requestCode } = useParams();
  const navigate = useNavigate();
  const [code, setCode] = useState(requestCode || '');
  const [request, setRequest] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(Boolean(requestCode));
  usePageMetadata({ title: 'Team Registration Status | FootStream', description: 'Check a FootStream team registration request status.', path: requestCode ? `/team-registration-status/${requestCode}` : '/team-registration-status' });
  useEffect(() => {
    if (!requestCode) return;
    setLoading(true);
    api.get(`/public/team-registration-requests/${requestCode}/status`).then((response) => {
      setRequest(response.data.data.request); setError('');
    }).catch((requestError) => { setRequest(null); setError(requestError.userMessage); }).finally(() => setLoading(false));
  }, [requestCode]);
  const submit = (event) => {
    event.preventDefault();
    if (code.trim()) navigate(`/team-registration-status/${code.trim().toUpperCase()}`);
  };
  return <main className="mx-auto max-w-3xl">
    <p className="eyebrow">Private request lookup</p><h1 className="page-title">Team registration status</h1><p className="page-copy">Enter the private request code shown after submitting your Register Your Team request.</p>
    <form onSubmit={submit} className="mt-6 flex gap-3 rounded-2xl border border-white/[0.07] bg-white/[0.025] p-4"><input className="field-input" value={code} onChange={(event) => setCode(event.target.value)} placeholder="FSTR-..." /><button className="primary-button"><Search size={16} /> Check</button></form>
    {loading && <div className="skeleton mt-8 h-40" />}
    {error && <div className="mt-8 rounded-xl border border-red-300/20 bg-red-300/10 p-4 text-red-100">{error}</div>}
    {request && <section className="mt-8 rounded-3xl border border-white/[0.08] bg-white/[0.025] p-6"><p className="eyebrow">{request.status}</p><h2 className="font-display text-3xl font-bold">{request.teamName}</h2><p className="mt-2 text-white/45">{request.city}, {request.country}</p><dl className="mt-5 grid gap-3 sm:grid-cols-2"><Info label="Request code" value={request.requestCode} /><Info label="Submitted" value={new Date(request.submittedAt).toLocaleString()} />{request.reviewedAt && <Info label="Reviewed" value={new Date(request.reviewedAt).toLocaleString()} />}{request.rejectionReason && <Info label="Reason" value={request.rejectionReason} />}</dl></section>}
  </main>;
}

function Info({ label, value }) { return <div><dt className="text-xs uppercase tracking-wider text-white/35">{label}</dt><dd className="mt-1 font-semibold">{value}</dd></div>; }
