import { Search } from "lucide-react";
import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import api from "../api/client.js";
import PlayerAvatar from "../features/squad/PlayerAvatar.jsx";
import PublicMatchCard from "../features/public/PublicMatchCard.jsx";
import {
  PublicEmpty,
  PublicError,
  PublicGridLoader,
} from "../features/public/PublicStates.jsx";
import {
  PublicPagination,
  TeamLogo,
} from "../features/public/PublicTeamChrome.jsx";
import usePageMetadata from "../hooks/usePageMetadata.js";
import { buildSearchParams } from "../utils/publicUrl.js";

const types = ["all", "teams", "players", "matches"];

export default function PublicSearchPage() {
  const [params, setParams] = useSearchParams();
  const query = (params.get("q") || "").trim();
  const type = types.includes(params.get("type")) ? params.get("type") : "all";
  const page = Math.max(1, Number(params.get("page")) || 1);
  const [draft, setDraft] = useState(query);
  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  usePageMetadata({
    title: query ? `Search: ${query} | FootStream` : "Search | FootStream",
    description:
      "Search public FootStream teams, active players, fixtures, live matches, and results.",
    path: `/search?${buildSearchParams({ q: query, type, page })}`,
  });
  useEffect(() => setDraft(query), [query]);
  useEffect(() => {
    if (draft.trim() === query) return undefined;
    const timer = window.setTimeout(
      () => setParams(buildSearchParams({ q: draft, type, page: 1 })),
      350,
    );
    return () => window.clearTimeout(timer);
  }, [draft, query, setParams, type]);
  useEffect(() => {
    if (query.length < 2) {
      setData(null);
      setError("");
      setLoading(false);
      return undefined;
    }
    const controller = new AbortController();
    setLoading(true);
    setData(null);
    api
      .get("/public/search", {
        params: { q: query, type, page, limit: 10 },
        signal: controller.signal,
      })
      .then((response) => {
        setData(response.data.data);
        setError("");
      })
      .catch((requestError) => {
        if (requestError.code !== "ERR_CANCELED")
          setError(requestError.userMessage);
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [page, query, type]);
  const submit = (event) => {
    event.preventDefault();
    setParams(buildSearchParams({ q: draft, type, page: 1 }));
  };
  const changeType = (value) =>
    setParams(buildSearchParams({ q: draft || query, type: value, page: 1 }));
  const count = data
    ? type === "all"
      ? data.teams.total + data.players.total + data.matches.total
      : data.pagination.total
    : 0;
  return (
    <>
      <header>
        <p className="eyebrow">Global public search</p>
        <h1 className="page-title">Find your football</h1>
        <p className="page-copy">
          Search published teams, active players, live matches, upcoming
          fixtures, and completed results.
        </p>
      </header>
      <form className="mt-7 flex gap-3" role="search" onSubmit={submit}>
        <label className="sr-only" htmlFor="global-search">
          Search teams, players, and matches
        </label>
        <div className="relative min-w-0 flex-1">
          <Search
            className="absolute left-4 top-1/2 -translate-y-1/2 text-white/35"
            size={18}
          />
          <input
            id="global-search"
            autoFocus
            className="field-input w-full pl-11"
            value={draft}
            maxLength="100"
            onChange={(event) => setDraft(event.target.value)}
            placeholder="Enter at least 2 characters"
          />
        </div>
        <button className="primary-button" type="submit">
          Search
        </button>
      </form>
      <div className="mt-5 flex gap-2 overflow-x-auto pb-2" aria-label="Search result type">
        {types.map((value) => (
          <button
            key={value}
            type="button"
            aria-pressed={type === value}
            className={`nav-link shrink-0 capitalize ${type === value ? "nav-link-active" : ""}`}
            onClick={() => changeType(value)}
          >
            {value}
          </button>
        ))}
      </div>
      <div className="mt-5 min-h-6 text-sm text-white/45" aria-live="polite">
        {query.length < 2
          ? "Enter at least 2 characters to search."
          : loading
            ? "Searching FootStream…"
            : error
              ? ""
              : `${count} result${count === 1 ? "" : "s"} for “${query}”`}
      </div>
      {error && (
        <div className="mt-5">
          <PublicError message={error} />
        </div>
      )}
      <section className="mt-7">
        {loading ? (
          <PublicGridLoader />
        ) : data ? (
          type === "all" ? (
            <GroupedResults data={data} onType={changeType} />
          ) : (
            <SpecificResults type={type} items={data.items} />
          )
        ) : null}
      </section>
      {type !== "all" && data?.pagination && (
        <PublicPagination
          pagination={data.pagination}
          onPage={(value) =>
            setParams(buildSearchParams({ q: query, type, page: value }))
          }
        />
      )}
    </>
  );
}

function GroupedResults({ data, onType }) {
  return (
    <div className="space-y-10">
      <ResultSection
        title="Teams"
        total={data.teams.total}
        onAll={() => onType("teams")}
        empty="No teams matched."
      >
        <TeamResults items={data.teams.items} />
      </ResultSection>
      <ResultSection
        title="Players"
        total={data.players.total}
        onAll={() => onType("players")}
        empty="No players matched."
      >
        <PlayerResults items={data.players.items} />
      </ResultSection>
      <ResultSection
        title="Matches"
        total={data.matches.total}
        onAll={() => onType("matches")}
        empty="No matches matched."
      >
        <MatchResults items={data.matches.items} />
      </ResultSection>
    </div>
  );
}
function ResultSection({ title, total, onAll, empty, children }) {
  return (
    <section>
      <div className="mb-4 flex items-center justify-between gap-3">
        <h2 className="font-display text-2xl font-bold">
          {title} <span className="text-white/30">{total}</span>
        </h2>
        {total > 0 && (
          <button type="button" className="secondary-button" onClick={onAll}>
            View all
          </button>
        )}
      </div>
      {total ? (
        children
      ) : (
        <PublicEmpty title={`No ${title.toLowerCase()}`} message={empty} />
      )}
    </section>
  );
}
function SpecificResults({ type, items }) {
  if (!items.length)
    return (
      <PublicEmpty
        title="No results found"
        message="Try a broader search phrase or a different result type."
      />
    );
  if (type === "teams") return <TeamResults items={items} />;
  if (type === "players") return <PlayerResults items={items} />;
  return <MatchResults items={items} />;
}
function TeamResults({ items }) {
  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
      {items.map((team) => (
        <Link className="list-card" to={`/teams/${team.slug}`} key={team.slug}>
          <TeamLogo team={team} className="size-14 shrink-0 rounded-xl" />
          <div className="min-w-0">
            <h3 className="truncate font-semibold">{team.name}</h3>
            <p className="mt-1 truncate text-xs text-white/40">
              {team.shortName} · {team.city || team.homeGround || "Team"}
            </p>
          </div>
        </Link>
      ))}
    </div>
  );
}
function PlayerResults({ items }) {
  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
      {items.map((player) => (
        <Link
          className="list-card"
          to={`/players/${player.playerId}`}
          key={player.playerId}
        >
          <PlayerAvatar
            src={player.photoUrl}
            name={player.name}
            className="size-14 shrink-0 rounded-xl"
          />
          <div className="min-w-0">
            <h3 className="truncate font-semibold">{player.name}</h3>
            <p className="mt-1 truncate text-xs text-white/40">
              {player.position} · #{player.jerseyNumber || "—"} ·{" "}
              {player.team.name}
            </p>
          </div>
          {player.isCaptain && (
            <span className="status-badge status-active">Captain</span>
          )}
        </Link>
      ))}
    </div>
  );
}
function MatchResults({ items }) {
  return (
    <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
      {items.map((match) => (
        <PublicMatchCard key={match.matchId} match={match} />
      ))}
    </div>
  );
}
