import { useCallback, useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
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
  PublicTeamHeader,
} from "../features/public/PublicTeamChrome.jsx";

const titles = {
  squad: "Active squad",
  fixtures: "Upcoming fixtures",
  results: "Completed results",
  gallery: "Team gallery",
};
const empty = {
  squad: "No active players are published for this team.",
  fixtures: "No upcoming fixtures.",
  results: "No completed results.",
  gallery: "No match photos are available.",
};

export default function PublicTeamCollectionPage({ kind }) {
  const { teamSlug } = useParams();
  const [page, setPage] = useState(1);
  const [category, setCategory] = useState("");
  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const load = useCallback(async () => {
    setLoading(true);
    setData(null);
    try {
      const response = await api.get(`/public/teams/${teamSlug}/${kind}`, {
        params:
          kind === "squad"
            ? {}
            : {
                page,
                limit: kind === "gallery" ? 18 : 12,
                ...(category ? { category } : {}),
              },
      });
      setData(response.data.data);
      setError("");
    } catch (requestError) {
      setData(null);
      setError(requestError.userMessage);
    } finally {
      setLoading(false);
    }
  }, [category, kind, page, teamSlug]);
  useEffect(() => {
    load();
  }, [load]);
  const items =
    kind === "squad"
      ? data?.players
      : kind === "gallery"
        ? data?.photos
        : data?.matches;
  return (
    <>
      {data?.team && <PublicTeamHeader team={data.team} />}
      <div className="mt-7 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="eyebrow">Team center</p>
          <h2 className="page-title text-3xl sm:text-4xl">{titles[kind]}</h2>
        </div>
        {kind === "gallery" && (
          <label className="field-label">
            Category
            <select
              className="field-input mt-2 min-w-48"
              value={category}
              onChange={(event) => {
                setPage(1);
                setCategory(event.target.value);
              }}
            >
              <option value="">All photos</option>
              {[
                "celebration",
                "action",
                "team",
                "result",
                "man_of_the_match",
                "other",
              ].map((value) => (
                <option key={value} value={value}>
                  {value.replaceAll("_", " ")}
                </option>
              ))}
            </select>
          </label>
        )}
      </div>
      {error && (
        <div className="mt-7">
          <PublicError message={error} />
        </div>
      )}
      <section className="mt-7">
        {loading ? (
          <PublicGridLoader />
        ) : items?.length ? (
          kind === "squad" ? (
            <Squad players={items} />
          ) : kind === "gallery" ? (
            <Gallery photos={items} team={data.team} />
          ) : (
            <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
              {items.map((match) => (
                <PublicMatchCard
                  key={match.matchId}
                  match={match}
                  context={kind}
                />
              ))}
            </div>
          )
        ) : (
          !error && <PublicEmpty title={titles[kind]} message={empty[kind]} />
        )}
      </section>
      <PublicPagination pagination={data?.pagination} onPage={setPage} />
    </>
  );
}
function Squad({ players }) {
  return (
    <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {players.map((player) => (
        <article
          className="overflow-hidden rounded-3xl border border-white/[0.08] bg-white/[0.025]"
          key={player.playerId}
        >
          <PlayerAvatar
            src={player.photoUrl}
            name={player.name}
            className="aspect-[4/3] w-full"
          />
          <div className="p-5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="font-display text-xl font-bold">
                  {player.name}
                </h3>
                <p className="mt-1 text-sm text-white/40">
                  {player.position} · #{player.jerseyNumber || "—"}
                </p>
              </div>
              <div className="flex flex-col gap-1">
                {player.isCaptain && (
                  <span className="status-badge status-active">Captain</span>
                )}
                {player.isViceCaptain && (
                  <span className="status-badge status-neutral">
                    Vice captain
                  </span>
                )}
              </div>
            </div>
            <Link
              className="secondary-button mt-5 w-full"
              to={`/players/${player.playerId}`}
            >
              View profile
            </Link>
          </div>
        </article>
      ))}
    </div>
  );
}
function Gallery({ photos, team }) {
  return (
    <div className="columns-1 gap-4 sm:columns-2 xl:columns-3">
      {photos.map((photo, index) => (
        <figure
          className="mb-4 break-inside-avoid overflow-hidden rounded-2xl border border-white/[0.07] bg-white/[0.02]"
          key={`${photo.imageUrl}-${index}`}
        >
          <img
            className="w-full object-cover"
            src={photo.imageUrl}
            alt={photo.caption || `${team.name} match photo`}
          />
          <figcaption className="p-4">
            <span className="status-badge status-neutral">
              {photo.category.replaceAll("_", " ")}
            </span>
            {photo.caption && (
              <p className="mt-2 text-sm text-white/55">{photo.caption}</p>
            )}
          </figcaption>
        </figure>
      ))}
    </div>
  );
}
