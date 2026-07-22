import {
  Award,
  Footprints,
  GraduationCap,
  Shield,
  Shirt,
  Trophy,
} from "lucide-react";
import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import api from "../api/client.js";
import LoadingScreen from "../components/LoadingScreen.jsx";
import TeamIdentity from "../components/TeamIdentity.jsx";
import PlayerAvatar from "../features/squad/PlayerAvatar.jsx";
import PublicMatchCard from "../features/public/PublicMatchCard.jsx";
import { PublicEmpty, PublicError } from "../features/public/PublicStates.jsx";
import PublicBreadcrumbs from "../components/PublicBreadcrumbs.jsx";
import ShareButton from "../components/ShareButton.jsx";
import usePageMetadata from "../hooks/usePageMetadata.js";

const stats = [
  ["matchesPlayed", "Matches"],
  ["starts", "Starts"],
  ["goals", "Goals"],
  ["assists", "Assists"],
  ["yellowCards", "Yellow cards"],
  ["redCards", "Red cards"],
  ["penaltiesScored", "Penalties scored"],
  ["manOfTheMatchAwards", "MOTM"],
];

export default function PublicPlayerProfilePage() {
  const { playerId } = useParams();
  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  const metadataPlayer = data?.player;
  usePageMetadata({
    title: metadataPlayer
      ? `${metadataPlayer.name} | ${metadataPlayer.team.name} | FootStream`
      : "Player | FootStream",
    description: metadataPlayer
      ? `${metadataPlayer.name}, ${metadataPlayer.position} for ${metadataPlayer.team.name}. View career football statistics and recent matches.`
      : "Public football player profile and career statistics on FootStream.",
    path: `/players/${playerId}`,
    image: metadataPlayer?.photoUrl || metadataPlayer?.team?.logo || "",
  });
  useEffect(() => {
    api
      .get(`/public/players/${playerId}/profile`)
      .then((response) => setData(response.data.data))
      .catch((requestError) => setError(requestError.userMessage));
  }, [playerId]);
  if (!data && !error) return <LoadingScreen />;
  if (!data) return <PublicError message={error} />;
  const { player, statistics, recentMatches, trophyCabinet = [] } = data;
  return (
    <>
      <PublicBreadcrumbs
        items={[
          { label: "Teams", to: "/teams" },
          { label: player.team.name, to: `/teams/${player.team.slug}` },
          { label: player.name },
        ]}
      />
      <header className="overflow-hidden rounded-3xl border border-white/[0.08] bg-[radial-gradient(circle_at_top_left,rgba(190,242,100,.13),transparent_52%),rgba(255,255,255,.025)] p-6 sm:p-10">
        <div className="flex flex-col gap-6 sm:flex-row sm:items-center">
          <PlayerAvatar
            src={player.photoUrl}
            name={player.name}
            className="size-36 shrink-0 rounded-3xl"
          />
          <div>
            <div className="flex flex-wrap gap-2">
              {player.isCaptain && (
                <span className="status-badge status-active">Captain</span>
              )}
              {player.isViceCaptain && (
                <span className="status-badge status-neutral">
                  Vice captain
                </span>
              )}
            </div>
            <p className="eyebrow mt-4">
              {player.position} · #{player.jerseyNumber || "—"}
            </p>
            <h1 className="font-display text-4xl font-black sm:text-6xl">
              {player.name}
            </h1>
            <Link
              className="mt-4 inline-flex items-center gap-3 text-sm text-lime-200"
              to={`/teams/${player.team.slug}`}
            >
              <TeamIdentity team={player.team} logoClassName="size-8 rounded-lg" />
            </Link>
          </div>
        </div>
      </header>
      <div className="mt-4 flex justify-end">
        <ShareButton
          title={player.name}
          text={`View ${player.name}'s FootStream profile and career statistics.`}
          path={`/players/${player.playerId}`}
        />
      </div>
      <section className="mt-6 grid gap-4 sm:grid-cols-3">
        <Fact icon={Shirt} label="Position" value={player.position} />
        <Fact
          icon={GraduationCap}
          label="Academic year"
          value={player.academicYear || "Not listed"}
        />
        <Fact
          icon={Footprints}
          label="Preferred foot"
          value={player.preferredFoot || "Not listed"}
        />
        <Fact icon={Award} label="Age" value={player.age || "Not listed"} />
      </section>
      <section className="mt-8">
        <p className="eyebrow">Career record</p>
        <h2 className="panel-title">Verified statistics</h2>
        <div className="mt-5 grid grid-cols-2 gap-3 md:grid-cols-4">
          {stats.map(([key, label]) => (
            <article className="panel" key={key}>
              <p className="font-display text-3xl font-bold text-lime-200">
                {statistics[key]}
              </p>
              <p className="mt-2 text-sm text-white/40">{label}</p>
            </article>
          ))}
        </div>
      </section>
      <section className="mt-10">
        <p className="eyebrow">Trophy Cabinet</p>
        <h2 className="panel-title">Team achievements</h2>
        <div className="mt-5">
          {trophyCabinet.length ? (
            <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
              {trophyCabinet.map((trophy) => (
                <article className="panel overflow-hidden p-0" key={trophy.id}>
                  {(trophy.trophyImages?.[0]?.imageUrl || trophy.teamLogo) && (
                    <img
                      className="aspect-video w-full bg-black/20 object-contain p-1"
                      src={trophy.trophyImages?.[0]?.imageUrl || trophy.teamLogo}
                      alt={`${trophy.tournamentName} trophy`}
                      loading="lazy"
                    />
                  )}
                  <div className="p-5">
                    <p className="eyebrow">{trophy.category === 'intra_college' ? 'Intra College' : 'Inter College'}</p>
                    <h3 className="mt-2 font-display text-2xl font-bold text-white">{trophy.tournamentName}</h3>
                    <p className="mt-1 text-lime-200">{trophy.position} · {trophy.year}</p>
                    <Link className="mt-4 inline-flex items-center gap-2 text-sm font-bold text-emerald-100/70 hover:text-lime-200" to={`/teams/${trophy.teamSlug}`}>
                      <Shield size={15} /> {trophy.teamName}
                    </Link>
                    {trophy.achievementUrl && <Link className="secondary-button mt-4 w-fit" to={trophy.achievementUrl}><Trophy size={15} /> View achievement</Link>}
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <PublicEmpty title="No trophies yet" message="Team achievements linked to this player will appear here." />
          )}
        </div>
      </section>
      <section className="mt-10">
        <p className="eyebrow">Recent match squads</p>
        <h2 className="panel-title">Completed matches</h2>
        <div className="mt-5">
          {recentMatches.length ? (
            <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
              {recentMatches.map((match) => (
                <PublicMatchCard
                  key={match.matchId}
                  match={match}
                  context="results"
                />
              ))}
            </div>
          ) : (
            <PublicEmpty
              title="No recent matches"
              message="Completed squad appearances will appear here."
            />
          )}
        </div>
      </section>
    </>
  );
}
function Fact({ icon: Icon, label, value }) {
  return (
    <article className="panel">
      <Icon size={18} className="text-lime-300" />
      <p className="mt-4 text-xs text-white/35">{label}</p>
      <p className="mt-1 font-semibold">{value}</p>
    </article>
  );
}
