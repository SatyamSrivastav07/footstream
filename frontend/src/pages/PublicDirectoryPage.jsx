import { useCallback, useEffect, useMemo, useState } from "react";
import api from "../api/client.js";
import PublicMatchCard from "../features/public/PublicMatchCard.jsx";
import {
  PublicEmpty,
  PublicError,
  PublicGridLoader,
} from "../features/public/PublicStates.jsx";
import usePageMetadata from "../hooks/usePageMetadata.js";

const definitions = {
  live: {
    title: "Live matches",
    copy: "Active scoreboards and half-time matches.",
    endpoint: "/public/live",
    empty: "No matches are live right now.",
  },
  fixtures: {
    title: "Upcoming fixtures",
    copy: "Find scheduled kickoffs, venues, and competitions.",
    endpoint: "/public/fixtures",
    empty: "No fixtures match these filters.",
  },
  results: {
    title: "Latest results",
    copy: "Browse completed matches and verified scorelines.",
    endpoint: "/public/results",
    empty: "No results match these filters.",
  },
};
const initial = {
  from: "",
  to: "",
  matchType: "",
  tournament: "",
  outcome: "",
  search: "",
};

export default function PublicDirectoryPage({ kind }) {
  const definition = definitions[kind];
  usePageMetadata({
    title: `${definition.title} | FootStream`,
    description: definition.copy,
    path: `/${kind}`,
  });
  const [filters, setFilters] = useState(initial);
  const [applied, setApplied] = useState(initial);
  const [page, setPage] = useState(1);
  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const params = useMemo(
    () => ({
      ...Object.fromEntries(
        Object.entries(applied).filter(([, value]) => value),
      ),
      page,
      limit: 12,
    }),
    [applied, page],
  );
  const load = useCallback(async () => {
    setLoading(true);
    try {
      const response = await api.get(definition.endpoint, { params });
      setData(response.data.data);
      setError("");
    } catch (requestError) {
      setData(null);
      setError(requestError.userMessage);
    } finally {
      setLoading(false);
    }
  }, [definition.endpoint, params]);
  useEffect(() => {
    load();
  }, [load]);
  const submit = (event) => {
    event.preventDefault();
    setPage(1);
    setApplied(filters);
  };
  return (
    <>
      <header>
        <p className="eyebrow">Public match center</p>
        <h1 className="page-title">{definition.title}</h1>
        <p className="page-copy">{definition.copy}</p>
      </header>
      {kind !== "live" && (
        <form
          className="mt-7 rounded-2xl border border-white/[0.07] bg-white/[0.025] p-4"
          onSubmit={submit}
        >
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-6">
            <input
              className="field-input"
              placeholder="Search team, opponent, venue"
              value={filters.search}
              onChange={(event) =>
                setFilters({ ...filters, search: event.target.value })
              }
            />
            <input
              className="field-input"
              placeholder="Tournament"
              value={filters.tournament}
              onChange={(event) =>
                setFilters({ ...filters, tournament: event.target.value })
              }
            />
            <input
              className="field-input"
              type="date"
              aria-label="From date"
              value={filters.from}
              onChange={(event) =>
                setFilters({ ...filters, from: event.target.value })
              }
            />
            <input
              className="field-input"
              type="date"
              aria-label="To date"
              value={filters.to}
              onChange={(event) =>
                setFilters({ ...filters, to: event.target.value })
              }
            />
            {kind === "fixtures" ? (
              <select
                className="field-input"
                value={filters.matchType}
                onChange={(event) =>
                  setFilters({ ...filters, matchType: event.target.value })
                }
              >
                <option value="">All match types</option>
                <option value="friendly">Friendly</option>
                <option value="league">League</option>
                <option value="knockout">Knockout</option>
                <option value="practice">Practice</option>
              </select>
            ) : (
              <select
                className="field-input"
                value={filters.outcome}
                onChange={(event) =>
                  setFilters({ ...filters, outcome: event.target.value })
                }
              >
                <option value="">All outcomes</option>
                <option value="win">Wins</option>
                <option value="draw">Draws</option>
                <option value="loss">Losses</option>
              </select>
            )}
            <button className="primary-button" type="submit">
              Apply filters
            </button>
          </div>
        </form>
      )}
      {error && (
        <div className="mt-7">
          <PublicError message={error} />
        </div>
      )}
      <section className="mt-8">
        {loading ? (
          <PublicGridLoader />
        ) : data?.matches.length ? (
          <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
            {data.matches.map((match) => (
              <PublicMatchCard
                key={match.matchId}
                match={match}
                context={kind}
              />
            ))}
          </div>
        ) : (
          !error && (
            <PublicEmpty title={definition.title} message={definition.empty} />
          )
        )}
      </section>
      {data?.pagination.pages > 1 && (
        <nav
          className="mt-8 flex items-center justify-center gap-3"
          aria-label="Pagination"
        >
          <button
            type="button"
            className="secondary-button"
            disabled={page <= 1}
            onClick={() => setPage((value) => value - 1)}
          >
            Previous
          </button>
          <span className="text-sm text-white/45">
            Page {data.pagination.page} of {data.pagination.pages}
          </span>
          <button
            type="button"
            className="secondary-button"
            disabled={page >= data.pagination.pages}
            onClick={() => setPage((value) => value + 1)}
          >
            Next
          </button>
        </nav>
      )}
    </>
  );
}
