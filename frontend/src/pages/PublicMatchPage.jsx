import { CalendarDays, MapPin, Radio, Trophy } from "lucide-react";
import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import api from "../api/client.js";
import LoadingScreen from "../components/LoadingScreen.jsx";
import { PublicError } from "../features/public/PublicStates.jsx";
import { formatLocalDateTime, label } from "../features/matches/constants.js";
import PublicBreadcrumbs from "../components/PublicBreadcrumbs.jsx";
import ShareButton from "../components/ShareButton.jsx";
import usePageMetadata from "../hooks/usePageMetadata.js";

export default function PublicMatchPage() {
  const { matchId } = useParams();
  const [match, setMatch] = useState(null);
  const [error, setError] = useState("");
  const metadataName = match
    ? `${match.team.name} vs ${match.opponent.name}`
    : "Match";
  usePageMetadata({
    title: `${metadataName} | FootStream`,
    description: match
      ? `${metadataName} at ${match.venue}. Follow fixture information, lineups, live coverage, or the final result.`
      : "Public football match details on FootStream.",
    path: `/matches/${matchId}`,
    image: match?.team?.logo || "",
  });
  useEffect(() => {
    api
      .get(`/public/matches/${matchId}`)
      .then((response) => setMatch(response.data.data.match))
      .catch((requestError) => setError(requestError.userMessage));
  }, [matchId]);
  if (!match && !error) return <LoadingScreen />;
  if (!match) return <PublicError message={error} />;
  const live = ["live", "half_time"].includes(match.status);
  const completed = match.status === "completed";
  const streamLabel = match.stream.isPlayable
    ? "Stream available"
    : match.stream.isEnabled
      ? "Stream scheduled"
      : "";
  const home =
    match.teamSide === "home" ? match.team.name : match.opponent.name;
  const away =
    match.teamSide === "home" ? match.opponent.name : match.team.name;
  return (
    <>
      <PublicBreadcrumbs
        items={[
          { label: "Matches", to: "/fixtures" },
          { label: `${home} vs ${away}` },
        ]}
      />
      <header className="rounded-3xl border border-white/[0.08] bg-[radial-gradient(circle_at_top,rgba(190,242,100,.09),transparent_55%),rgba(255,255,255,.02)] p-6 sm:p-10">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <span
            className={`status-badge ${match.status === "cancelled" ? "status-off" : live ? "border-red-300/20 bg-red-300/10 text-red-100" : "status-active"}`}
          >
            {label(match.status)}
          </span>
          {streamLabel && (
            <span className="status-badge status-active">
              <Radio size={11} /> {streamLabel}
            </span>
          )}
        </div>
        <div className="my-10 grid grid-cols-[1fr_auto_1fr] items-center gap-3 text-center">
          <h1 className="font-display text-2xl font-black sm:text-4xl">
            {home}
          </h1>
          <div>
            {live || completed ? (
              <strong className="font-display text-4xl text-lime-300 sm:text-6xl">
                {match.homeScore}–{match.awayScore}
              </strong>
            ) : (
              <span className="text-xs font-black uppercase tracking-[.2em] text-lime-300/45">
                vs
              </span>
            )}
          </div>
          <h2 className="font-display text-2xl font-black sm:text-4xl">
            {away}
          </h2>
        </div>
        <div className="flex flex-wrap justify-center gap-x-6 gap-y-2 border-t border-white/[0.08] pt-5 text-sm text-white/45">
          <span className="flex items-center gap-2">
            <CalendarDays size={15} /> {formatLocalDateTime(match.scheduledAt)}
          </span>
          <span className="flex items-center gap-2">
            <MapPin size={15} /> {match.venue}
          </span>
          <span>{match.tournament || "No tournament"}</span>
          <span>{label(match.matchType)}</span>
        </div>
        <div className="mt-7 flex justify-center">
          {live ? (
            <Link className="primary-button" to={`/matches/${matchId}/live`}>
              <Radio size={16} /> Open live match
            </Link>
          ) : completed ? (
            <Link className="primary-button" to={`/matches/${matchId}/result`}>
              <Trophy size={16} /> View full result
            </Link>
          ) : match.status === "scheduled" ? (
            <Link className="secondary-button" to={`/matches/${matchId}/live`}>
              <Radio size={16} /> Live page
            </Link>
          ) : null}
        </div>
        <div className="mt-4 flex justify-center">
          <ShareButton
            title={`${home} vs ${away}`}
            text={`View ${home} vs ${away} on FootStream.`}
            path={`/matches/${matchId}`}
          />
        </div>
      </header>
      {match.status === "cancelled" && (
        <div className="mt-6 rounded-2xl border border-red-300/20 bg-red-300/10 p-5 text-center text-red-100">
          This fixture was cancelled.
        </div>
      )}
      {completed && (
        <section className="panel mt-6">
          <p className="eyebrow">Full time</p>
          <h2 className="panel-title">
            {match.result.outcome.toUpperCase()} · {match.result.teamScore}–
            {match.result.opponentScore}
          </h2>
          {match.manOfTheMatch && (
            <p className="mt-3 text-sm text-white/50">
              Man of the Match: {match.manOfTheMatch.name}
            </p>
          )}
        </section>
      )}
      <section className="mt-6 grid gap-6 xl:grid-cols-2">
        <Lineup title="Starting XI" players={match.startingXI} />
        <Lineup title="Substitutes" players={match.substitutes} />
      </section>
    </>
  );
}
function Lineup({ title, players }) {
  return (
    <section className="panel">
      <div className="panel-heading">
        <h2 className="panel-title">{title}</h2>
        <span className="count-pill">{players.length}</span>
      </div>
      {players.length ? (
        <div className="grid gap-2 sm:grid-cols-2">
          {players.map((player) => (
            <div className="list-card" key={player.player}>
              <span className="font-display text-xl font-bold text-lime-300">
                {player.jerseyNumber || "—"}
              </span>
              <div>
                <p className="font-semibold">{player.name}</p>
                <p className="text-xs text-white/40">{player.position}</p>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-sm text-white/40">No lineup is available.</p>
      )}
    </section>
  );
}
