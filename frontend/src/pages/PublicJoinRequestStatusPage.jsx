import { Search } from "lucide-react";
import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import api from "../api/client.js";
import LoadingScreen from "../components/LoadingScreen.jsx";
import PublicBreadcrumbs from "../components/PublicBreadcrumbs.jsx";
import { PublicError } from "../features/public/PublicStates.jsx";
import { statusClass, statusLabel } from "../features/joinRequests/joinRequestConstants.js";
import usePageMetadata from "../hooks/usePageMetadata.js";

export default function PublicJoinRequestStatusPage() {
  const { requestCode } = useParams();
  const navigate = useNavigate();
  const [code, setCode] = useState(requestCode || "");
  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(Boolean(requestCode));
  usePageMetadata({ title: "Join request status | FootStream", description: "Check a FootStream team join request status.", path: requestCode ? `/join-requests/${requestCode}/status` : "/join-requests/status" });

  useEffect(() => {
    if (!requestCode) return;
    setLoading(true);
    api.get(`/public/join-requests/${requestCode}/status`).then((response) => {
      setData(response.data.data);
      setError("");
    }).catch((requestError) => {
      setData(null);
      setError(requestError.userMessage);
    }).finally(() => setLoading(false));
  }, [requestCode]);

  const submit = (event) => {
    event.preventDefault();
    if (code.trim()) navigate(`/join-requests/${code.trim().toUpperCase()}/status`);
  };

  if (loading) return <LoadingScreen />;
  return (
    <>
      <PublicBreadcrumbs items={[{ label: "Join request status" }]} />
      <header>
        <p className="eyebrow">Application status</p>
        <h1 className="page-title">Check your join request</h1>
        <p className="page-copy">Use the public-safe request code from your confirmation screen. Contact details are never shown here.</p>
      </header>
      <form className="mt-7 flex gap-3" onSubmit={submit}>
        <label className="sr-only" htmlFor="request-code">Request code</label>
        <input id="request-code" className="field-input flex-1" value={code} onChange={(event) => setCode(event.target.value)} placeholder="FS-ABC123..." />
        <button className="primary-button"><Search size={17} /> Check</button>
      </form>
      {error && <div className="mt-6"><PublicError message={error} /></div>}
      {data && (
        <section className="panel mt-7">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="eyebrow">{data.team.name}</p>
              <h2 className="panel-title">{data.requestCode}</h2>
            </div>
            <span className={statusClass[data.status]}>{statusLabel(data.status)}</span>
          </div>
          <dl className="mt-6 grid gap-4 sm:grid-cols-2">
            <Info label="Submitted" value={new Date(data.submittedAt).toLocaleString()} />
            <Info label="Reviewed" value={data.reviewedAt ? new Date(data.reviewedAt).toLocaleString() : "Not reviewed yet"} />
            {data.rejectionReason && <Info label="Reason" value={data.rejectionReason} />}
          </dl>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link className="secondary-button" to={`/teams/${data.team.slug}`}>View team</Link>
            {data.createdPlayerPath && <Link className="primary-button" to={data.createdPlayerPath}>View player profile</Link>}
          </div>
        </section>
      )}
    </>
  );
}

function Info({ label, value }) {
  return <div className="rounded-2xl bg-black/10 p-4"><p className="text-xs text-white/35">{label}</p><p className="mt-1 font-semibold">{value}</p></div>;
}
