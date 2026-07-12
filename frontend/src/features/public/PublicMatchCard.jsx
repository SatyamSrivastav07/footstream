import { CalendarDays, MapPin, Radio, Trophy } from "lucide-react";
import { Link } from "react-router-dom";
import { formatLocalDateTime, label } from "../matches/constants.js";

export default function PublicMatchCard({ match, context = "fixture" }) {
  const isLive = ["live", "half_time"].includes(match.status);
  const completed = match.status === "completed";
  const href = isLive
    ? `/matches/${match.matchId}/live`
    : completed
      ? `/matches/${match.matchId}/result`
      : `/matches/${match.matchId}`;
  const action = isLive
    ? "Watch live"
    : completed
      ? "View result"
      : "View match";
  const home =
    match.teamSide === "home" ? match.team?.name : match.opponent.name;
  const away =
    match.teamSide === "home" ? match.opponent.name : match.team?.name;
  const streamLabel = match.stream?.isPlayable
    ? "Stream available"
    : match.stream?.isEnabled
      ? "Stream scheduled"
      : "";
  return (
    <article className="rounded-3xl border border-white/[0.08] bg-white/[0.025] p-5 transition hover:-translate-y-0.5 hover:border-lime-300/20">
      <div className="flex items-center justify-between gap-3">
        <span
          className={`status-badge ${isLive ? "border-red-300/20 bg-red-300/10 text-red-100" : completed ? "border-sky-300/15 bg-sky-300/[0.08] text-sky-200" : "status-active"}`}
        >
          {isLive && (
            <span className="size-1.5 animate-pulse rounded-full bg-red-300" />
          )}
          {label(match.status)}
        </span>
        {streamLabel && (
          <span className="status-badge status-active">
            <Radio size={11} /> {streamLabel}
          </span>
        )}
      </div>
      <div className="my-6 grid grid-cols-[1fr_auto_1fr] items-center gap-3 text-center">
        <h2 className="font-display text-lg font-bold">{home}</h2>
        <div>
          {isLive || completed ? (
            <strong className="font-display text-3xl text-lime-300">
              {match.homeScore}–{match.awayScore}
            </strong>
          ) : (
            <span className="text-xs font-black uppercase tracking-[.2em] text-lime-300/45">
              vs
            </span>
          )}
        </div>
        <h2 className="font-display text-lg font-bold">{away}</h2>
      </div>
      <div className="space-y-2 border-y border-white/[0.06] py-4 text-sm text-emerald-100/45">
        <p className="flex items-center gap-2">
          <CalendarDays size={15} /> {formatLocalDateTime(match.scheduledAt)}
        </p>
        <p className="flex items-center gap-2">
          <MapPin size={15} /> {match.venue}
        </p>
        {match.tournament && (
          <p className="truncate text-xs font-semibold uppercase tracking-wider">
            {match.tournament}
          </p>
        )}
        {!isLive && !completed && (
          <p className="text-xs font-semibold uppercase tracking-wider">
            {label(match.matchType)}
          </p>
        )}
        {completed && (
          <p className="text-xs font-bold uppercase text-lime-200">
            {match.outcome}
            {match.manOfTheMatch ? ` · MOTM ${match.manOfTheMatch.name}` : ""}
          </p>
        )}
        {isLive && (
          <p className="text-xs font-bold uppercase text-red-200">
            {label(match.currentPeriod)} ·{" "}
            {Math.floor((match.elapsedSeconds || 0) / 60)}'
          </p>
        )}
      </div>
      <Link to={href} className="primary-button mt-4 w-full">
        {isLive ? <Radio size={16} /> : <Trophy size={16} />}
        {action}
      </Link>
      <span className="sr-only">{context}</span>
    </article>
  );
}
