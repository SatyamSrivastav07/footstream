import { AlertTriangle, CheckCircle2, Clock, Eye, MessageSquareText, Send, ShieldCheck, XCircle } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import api from "../api/client.js";
import EmptyState from "../components/EmptyState.jsx";
import LoadingScreen from "../components/LoadingScreen.jsx";
import TeamIdentity from "../components/TeamIdentity.jsx";

const statusStyles = {
  pending: "border-amber-300/20 bg-amber-300/10 text-amber-100",
  accepted: "border-lime-300/20 bg-lime-300/10 text-lime-100",
  changes_requested: "border-sky-300/20 bg-sky-300/10 text-sky-100",
  rejected: "border-red-300/20 bg-red-300/10 text-red-100",
  changes_rejected: "border-orange-300/20 bg-orange-300/10 text-orange-100",
  cancelled: "border-white/10 bg-white/[0.05] text-white/55",
  expired: "border-white/10 bg-white/[0.05] text-white/55",
  re_verification_required: "border-fuchsia-300/20 bg-fuchsia-300/10 text-fuchsia-100",
};

const statusLabel = (value = "") => value.replaceAll("_", " ").replace(/\b\w/g, (letter) => letter.toUpperCase());

const formatDate = (value) => (value ? new Date(value).toLocaleString() : "Not scheduled");

export default function TeamCollaborationsPage() {
  const { collaborationId } = useParams();
  const [collaborations, setCollaborations] = useState([]);
  const [selected, setSelected] = useState(null);
  const [filter, setFilter] = useState("all");
  const [loading, setLoading] = useState(true);
  const [detailLoading, setDetailLoading] = useState(Boolean(collaborationId));
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [message, setMessage] = useState("");
  const [reason, setReason] = useState("");
  const [busyAction, setBusyAction] = useState("");

  const loadList = useCallback(async () => {
    try {
      const response = await api.get("/team/collaborations");
      setCollaborations(response.data.data.collaborations || []);
      setError("");
    } catch (requestError) {
      setError(requestError.userMessage);
    } finally {
      setLoading(false);
    }
  }, []);

  const loadDetail = useCallback(async () => {
    if (!collaborationId) {
      setSelected(null);
      setDetailLoading(false);
      return;
    }
    setDetailLoading(true);
    try {
      const response = await api.get(`/team/collaborations/${collaborationId}`);
      setSelected(response.data.data.collaboration);
      setError("");
    } catch (requestError) {
      setError(requestError.userMessage);
    } finally {
      setDetailLoading(false);
    }
  }, [collaborationId]);

  useEffect(() => { loadList(); }, [loadList]);
  useEffect(() => { loadDetail(); }, [loadDetail]);

  const visible = useMemo(() => collaborations.filter((item) => filter === "all" || item.status === filter), [collaborations, filter]);
  const active = selected || visible[0] || null;

  const runAction = async (action, body = {}) => {
    if (!active?.matchId) return;
    const cleanBody = {
      ...body,
      ...(Object.hasOwn(body, "reason") ? { reason: String(body.reason || "").trim() } : {}),
      ...(Object.hasOwn(body, "message") ? { message: String(body.message || "").trim() } : {}),
    };
    if (action === "request-changes" && !cleanBody.message) {
      setError("Please explain what should be corrected.");
      return;
    }
    setBusyAction(action);
    setNotice("");
    setError("");
    try {
      const response = await api.patch(`/team/matches/${active.matchId}/collaboration/${action}`, cleanBody);
      setSelected(response.data.data.collaboration);
      setNotice("Verification updated successfully.");
      setMessage("");
      setReason("");
      await loadList();
      window.dispatchEvent(new Event("footstream:notifications-changed"));
    } catch (requestError) {
      setError(requestError.userMessage);
    } finally {
      setBusyAction("");
    }
  };

  if (loading) return <LoadingScreen />;

  return (
    <>
      <header className="flex flex-col justify-between gap-5 md:flex-row md:items-end">
        <div>
          <p className="eyebrow">Collaborative match verification</p>
          <h1 className="page-title">Match Verification</h1>
          <p className="page-copy">Review registered-opponent match results. Host stats stay published immediately; opponent stats count only after accepted verification.</p>
        </div>
        <span className="count-pill">{collaborations.length} requests</span>
      </header>

      {(error || notice) && (
        <div className={`mt-6 rounded-xl border px-4 py-3 text-sm ${error ? "border-red-300/20 bg-red-300/10 text-red-100" : "border-lime-300/15 bg-lime-300/[0.07] text-lime-100"}`} role="status">
          {error || notice}
        </div>
      )}

      <div className="mt-7 grid gap-6 xl:grid-cols-[420px_1fr]">
        <aside className="panel">
          <div className="panel-heading">
            <div>
              <p className="eyebrow">Requests</p>
              <h2 className="panel-title">Verification inbox</h2>
            </div>
            <select className="field-input max-w-44" value={filter} onChange={(event) => setFilter(event.target.value)} aria-label="Filter verification requests">
              <option value="all">All</option>
              <option value="pending">Pending</option>
              <option value="changes_requested">Changes requested</option>
              <option value="accepted">Accepted</option>
              <option value="rejected">Rejected</option>
              <option value="changes_rejected">Changes rejected</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>
          {!visible.length ? (
            <div className="mt-5">
              <EmptyState title="No verification requests" message="Completed registered-opponent matches will appear here." />
            </div>
          ) : (
            <div className="mt-5 space-y-3">
              {visible.map((item) => (
                <Link
                  key={item.id}
                  to={`/team/collaborations/${item.id}`}
                  className={`block rounded-2xl border p-4 transition hover:border-lime-300/25 hover:bg-lime-300/[0.045] ${active?.id === item.id ? "border-lime-300/25 bg-lime-300/[0.07]" : "border-white/[0.07] bg-black/10"}`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-xs font-black uppercase tracking-[0.18em] text-lime-200/55">{item.role === "host" ? "You hosted" : "Review needed"}</p>
                      <p className="mt-2 truncate font-display text-lg font-bold text-white">{item.hostTeam.name || "Host"} vs {item.opponentTeam.name || item.match.opponentName || "Opponent"}</p>
                      <p className="mt-1 text-xs text-emerald-100/45">{formatDate(item.match.scheduledAt)}</p>
                    </div>
                    <StatusBadge status={item.status} />
                  </div>
                </Link>
              ))}
            </div>
          )}
        </aside>

        <section className="panel min-h-[540px]">
          {detailLoading ? <LoadingScreen /> : active ? (
            <CollaborationReview
              collaboration={active}
              message={message}
              reason={reason}
              busyAction={busyAction}
              onMessage={setMessage}
              onReason={setReason}
              onAction={runAction}
            />
          ) : (
            <EmptyState title="Select a verification request" message="Open a completed registered-opponent match request to review it." />
          )}
        </section>
      </div>
    </>
  );
}

function StatusBadge({ status }) {
  const Icon = status === "accepted" ? CheckCircle2 : status === "rejected" ? XCircle : status === "changes_requested" ? MessageSquareText : status === "pending" ? Clock : AlertTriangle;
  return (
    <span className={`inline-flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-1 text-[11px] font-black uppercase tracking-[0.14em] ${statusStyles[status] || "border-white/10 bg-white/[0.04] text-white/55"}`}>
      <Icon size={13} /> {statusLabel(status)}
    </span>
  );
}

function CollaborationReview({ collaboration, message, reason, busyAction, onMessage, onReason, onAction }) {
  const isOpponent = collaboration.role === "opponent";
  const isHost = collaboration.role === "host";
  const canOpponentReview = isOpponent && ["pending", "changes_requested", "re_verification_required"].includes(collaboration.status);
  const canHostRespond = isHost && collaboration.status === "changes_requested";
  const canHostCancel = isHost && ["pending", "changes_requested", "changes_rejected"].includes(collaboration.status);

  return (
    <div>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="eyebrow">Review screen</p>
          <h2 className="panel-title">Match verification details</h2>
          <p className="mt-2 text-sm text-emerald-100/45">{collaboration.badge}</p>
        </div>
        <StatusBadge status={collaboration.status} />
      </div>

      <div className="mt-7 grid gap-4 md:grid-cols-2">
        <InfoCard label="Host team">
          <TeamIdentity team={collaboration.hostTeam} name={collaboration.hostTeam.name || "Host team"} logoClassName="size-9 rounded-xl" />
        </InfoCard>
        <InfoCard label="Opponent team">
          <TeamIdentity team={collaboration.opponentTeam} name={collaboration.opponentTeam.name || "Opponent team"} logoClassName="size-9 rounded-xl" />
        </InfoCard>
        <InfoCard label="Kickoff">{formatDate(collaboration.match.scheduledAt)}</InfoCard>
        <InfoCard label="Venue">{collaboration.match.venue || "Not set"}</InfoCard>
        <InfoCard label="Match type">{statusLabel(collaboration.match.matchType || "match")}</InfoCard>
        <InfoCard label="Mode">{collaboration.match.matchMode === "direct" ? "Direct Result" : "Stream Match"}</InfoCard>
        {collaboration.match.result && (
          <InfoCard label="Final score">
            {collaboration.match.result.finalTeamScore ?? 0} - {collaboration.match.result.finalOpponentScore ?? 0}
          </InfoCard>
        )}
      </div>

      <div className="mt-7 rounded-2xl border border-white/[0.07] bg-black/10 p-4">
        <div className="flex items-center gap-2 text-sm font-semibold text-white">
          <ShieldCheck size={16} className="text-lime-200" /> Statistics behavior
        </div>
        <p className="mt-2 text-sm leading-6 text-emerald-100/50">
          Host statistics are published immediately when the result is saved. Opponent-side team/player statistics appear after the opponent accepts this verification.
        </p>
      </div>

      {collaboration.changeRequests?.length > 0 && (
        <div className="mt-7">
          <p className="eyebrow">Change requests</p>
          <div className="mt-3 space-y-3">
            {collaboration.changeRequests.map((request, index) => (
              <article key={`${request.requestedAt}-${index}`} className="rounded-2xl border border-white/[0.07] bg-white/[0.025] p-4">
                <p className="text-sm leading-6 text-white/70">{request.message}</p>
                <p className="mt-2 text-xs text-emerald-100/35">Requested {formatDate(request.requestedAt)} · Host response: {statusLabel(request.hostResponse)}</p>
              </article>
            ))}
          </div>
        </div>
      )}

      <div className="mt-7 space-y-4">
        {canOpponentReview && (
          <>
            <div className="grid gap-3 md:grid-cols-2">
              <button type="button" className="primary-button justify-center" disabled={Boolean(busyAction)} onClick={() => onAction("accept")}>
                <CheckCircle2 size={16} /> Accept verification
              </button>
              <button type="button" className="secondary-button justify-center text-red-100" disabled={Boolean(busyAction)} onClick={() => onAction("reject", { reason })}>
                <XCircle size={16} /> Reject
              </button>
            </div>
            <label className="field-label">
              Request changes
              <textarea className="field-input mt-2 min-h-28" value={message} onChange={(event) => onMessage(event.target.value)} placeholder="Explain what should be corrected." />
            </label>
            <button type="button" className="secondary-button" disabled={Boolean(busyAction) || message.trim().length < 2} onClick={() => onAction("request-changes", { message })}>
              <Send size={16} /> Send change request
            </button>
            <label className="field-label">
              Optional rejection reason
              <input className="field-input mt-2" value={reason} onChange={(event) => onReason(event.target.value)} placeholder="Reason shown to host if you reject" />
            </label>
          </>
        )}

        {canHostRespond && (
          <>
            <label className="field-label">
              Optional host decision note
              <input className="field-input mt-2" value={reason} onChange={(event) => onReason(event.target.value)} placeholder="Why did you accept or reject the requested changes?" />
            </label>
            <div className="flex flex-wrap gap-3">
              <button type="button" className="primary-button" disabled={Boolean(busyAction)} onClick={() => onAction("accept-changes", { reason })}>
                <CheckCircle2 size={16} /> Accept requested changes
              </button>
              <button type="button" className="secondary-button text-red-100" disabled={Boolean(busyAction)} onClick={() => onAction("reject-changes", { reason })}>
                <XCircle size={16} /> Reject requested changes
              </button>
            </div>
          </>
        )}

        {canHostCancel && (
          <button type="button" className="secondary-button text-red-100" disabled={Boolean(busyAction)} onClick={() => onAction("cancel")}>
            <XCircle size={16} /> Cancel verification request
          </button>
        )}

        <Link to={`/team/matches/${collaboration.matchId}`} className="secondary-button w-fit">
          <Eye size={16} /> Open match
        </Link>
      </div>
    </div>
  );
}

function InfoCard({ label, children }) {
  return (
    <div className="rounded-2xl border border-white/[0.07] bg-white/[0.025] p-4">
      <p className="text-[10px] font-black uppercase tracking-[0.18em] text-lime-200/45">{label}</p>
      <div className="mt-2 font-semibold text-white/80">{children}</div>
    </div>
  );
}
