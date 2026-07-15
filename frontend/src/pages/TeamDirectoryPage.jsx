import { MapPin, Search, ShieldCheck, Trophy, UserPlus } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api from "../api/client.js";
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

const initial = { search: "", city: "" };

export default function TeamDirectoryPage() {
  usePageMetadata({
    title: "Football Teams | FootStream",
    description:
      "Browse published FootStream teams, squads, fixtures, results, statistics, and match galleries.",
    path: "/teams",
  });
  const [filters, setFilters] = useState(initial);
  const [applied, setApplied] = useState(initial);
  const [page, setPage] = useState(1);
  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const load = useCallback(async () => {
    setLoading(true);
    try {
      const response = await api.get("/public/teams", {
        params: { ...applied, page, limit: 12 },
      });
      setData(response.data.data);
      setError("");
    } catch (requestError) {
      setData(null);
      setError(requestError.userMessage);
    } finally {
      setLoading(false);
    }
  }, [applied, page]);
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
      <header className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
        <div>
        <p className="eyebrow">FootStream clubs</p>
        <h1 className="page-title">Teams</h1>
        <p className="page-copy">
          Explore published teams, their squads, records, fixtures, results, and
          matchday stories.
        </p>
        </div>
        <Link to="/register-team" className="primary-button"><UserPlus size={16} /> Register Your Team</Link>
      </header>
      <form
        className="mt-7 grid gap-3 rounded-2xl border border-white/[0.07] bg-white/[0.025] p-4 sm:grid-cols-[1fr_1fr_auto]"
        onSubmit={submit}
      >
        <label className="sr-only" htmlFor="team-search">
          Search team name
        </label>
        <input
          id="team-search"
          className="field-input"
          placeholder="Search team name"
          maxLength="100"
          value={filters.search}
          onChange={(event) =>
            setFilters({ ...filters, search: event.target.value })
          }
        />
        <label className="sr-only" htmlFor="team-city">
          Filter by city
        </label>
        <input
          id="team-city"
          className="field-input"
          placeholder="Filter by city"
          maxLength="100"
          value={filters.city}
          onChange={(event) =>
            setFilters({ ...filters, city: event.target.value })
          }
        />
        <button className="primary-button" type="submit">
          <Search size={16} /> Find teams
        </button>
      </form>
      {error && (
        <div className="mt-7">
          <PublicError message={error} />
        </div>
      )}
      <section className="mt-8">
        {loading ? (
          <PublicGridLoader />
        ) : data?.teams.length ? (
          <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
            {data.teams.map((team) => (
              <article
                className="rounded-3xl border border-white/[0.08] bg-white/[0.025] p-6"
                key={team.slug}
              >
                <div className="flex items-center gap-4">
                  <TeamLogo
                    team={team}
                    className="size-16 shrink-0 rounded-2xl"
                  />
                  <div className="min-w-0">
                    <h2 className="truncate font-display text-2xl font-bold">
                      {team.name}
                    </h2>
                    <p className="mt-1 flex items-center gap-1 text-sm text-white/40">
                      <MapPin size={14} /> {team.shortName} ·{" "}
                      {team.city || "City not listed"}
                    </p>
                  </div>
                </div>
                <div className="mt-6 grid grid-cols-2 gap-3">
                  <Metric
                    icon={ShieldCheck}
                    label="Matches"
                    value={team.statistics.matchesPlayed}
                  />
                  <Metric
                    icon={Trophy}
                    label="Wins"
                    value={team.statistics.wins}
                  />
                </div>
                <div className="mt-4 rounded-xl bg-black/15 p-3">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-white/30">
                    Top scorer
                  </p>
                  <p className="mt-1 font-semibold">
                    {team.topScorer
                      ? `${team.topScorer.name} · ${team.topScorer.value}`
                      : "No goals recorded"}
                  </p>
                </div>
                <Link
                  className="primary-button mt-5 w-full"
                  to={`/teams/${team.slug}`}
                >
                  View team
                </Link>
              </article>
            ))}
          </div>
        ) : (
          !error && (
            <PublicEmpty
              title="No teams found"
              message="No published teams match these filters. If you represent a club, use Register Your Team to request access."
            />
          )
        )}
      </section>
      <PublicPagination pagination={data?.pagination} onPage={setPage} />
    </>
  );
}
function Metric({ icon: Icon, label, value }) {
  return (
    <div className="rounded-xl border border-white/[0.06] bg-black/10 p-3">
      <Icon size={15} className="text-lime-300" />
      <p className="mt-2 font-display text-2xl font-bold">{value}</p>
      <p className="text-xs text-white/35">{label}</p>
    </div>
  );
}
