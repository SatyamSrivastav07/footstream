import {
  Award,
  CalendarDays,
  ExternalLink,
  Goal,
  MapPin,
  Shield,
  Trophy,
  UserRound,
  UserPlus,
} from "lucide-react";
import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import api from "../api/client.js";
import InstagramFollowButton from "../components/InstagramFollowButton.jsx";
import LoadingScreen from "../components/LoadingScreen.jsx";
import ShareButton from "../components/ShareButton.jsx";
import PublicMatchCard from "../features/public/PublicMatchCard.jsx";
import { PublicEmpty, PublicError } from "../features/public/PublicStates.jsx";
import { PublicTeamHeader } from "../features/public/PublicTeamChrome.jsx";
import usePageMetadata from "../hooks/usePageMetadata.js";

export default function PublicTeamProfilePage() {
  const { teamSlug } = useParams();
  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  const metadataTeam = data?.team;
  usePageMetadata({
    title: metadataTeam
      ? `${metadataTeam.name} | FootStream`
      : "Team | FootStream",
    description:
      metadataTeam?.description ||
      "Public football team profile, squad, fixtures, results, statistics, and gallery on FootStream.",
    path: `/teams/${teamSlug}`,
    image: metadataTeam?.coverPhoto || metadataTeam?.logo || "",
  });
  useEffect(() => {
    api
      .get(`/public/teams/${teamSlug}`)
      .then((response) => setData(response.data.data))
      .catch((requestError) => setError(requestError.userMessage));
  }, [teamSlug]);
  if (!data && !error) return <LoadingScreen />;
  if (!data) return <PublicError message={error} />;
  const { team, overview } = data;
  const facts = [
    [MapPin, "Home ground", team.homeGround],
    [UserRound, "Coach", team.coach],
    [CalendarDays, "Founded", team.founded],
  ];
  return (
    <>
      <PublicTeamHeader team={team} />
      <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap gap-3">
          {team.acceptingJoinRequests && (
            <Link className="primary-button" to={`/teams/${team.slug}/join`} aria-label={`Join ${team.name}`}>
              <UserPlus size={17} /> Join {team.shortName || team.name}
            </Link>
          )}
          <InstagramFollowButton team={team} />
        </div>
        <ShareButton
          title={team.name}
          text={`Follow ${team.name} on FootStream.`}
          path={`/teams/${team.slug}`}
        />
      </div>
      <section className="mt-6 grid gap-6 xl:grid-cols-[1.15fr_.85fr]">
        <article className="panel">
          <p className="eyebrow">Club profile</p>
          <h2 className="panel-title">About {team.shortName}</h2>
          <p className="mt-4 whitespace-pre-wrap text-sm leading-7 text-white/55">
            {team.description ||
              "This team has not added a public description yet."}
          </p>
          <div className="mt-6 grid gap-3 sm:grid-cols-3">
            {facts.map(([Icon, label, value]) => (
              <div className="rounded-xl bg-black/10 p-3" key={label}>
                <Icon size={16} className="text-lime-300" />
                <p className="mt-2 text-xs text-white/35">{label}</p>
                <p className="mt-1 font-semibold">{value || "Not listed"}</p>
              </div>
            ))}
          </div>
          {Object.keys(team.socialLinks).length > 0 && (
            <div className="mt-6 flex flex-wrap gap-2">
              {Object.entries(team.socialLinks).map(([network, href]) => (
                <a
                  className="secondary-button"
                  key={network}
                  href={href}
                  target="_blank"
                  rel="noreferrer"
                >
                  {network} <ExternalLink size={14} />
                </a>
              ))}
            </div>
          )}
        </article>
        <article className="panel">
          <p className="eyebrow">Verified record</p>
          <div className="mt-4 grid grid-cols-2 gap-3">
            <Stat
              label="Played"
              value={overview.statistics.matchesPlayed}
              icon={Shield}
            />
            <Stat label="Wins" value={overview.statistics.wins} icon={Trophy} />
            <Stat
              label="Goals for"
              value={overview.statistics.goalsFor}
              icon={Goal}
            />
            <Stat
              label="Win rate"
              value={`${overview.statistics.winPercentage}%`}
              icon={Award}
            />
          </div>
        </article>
      </section>
      <section className="mt-6 grid gap-5 lg:grid-cols-3">
        <Leader title="Top scorer" leader={overview.topScorer} suffix="goals" />
        <Leader
          title="Top assists"
          leader={overview.topAssists}
          suffix="assists"
        />
        <Leader
          title="Most appearances"
          leader={overview.mostAppearances}
          suffix="matches"
        />
      </section>
      <section className="mt-8 grid gap-6 xl:grid-cols-2">
        <MatchBlock
          title="Next fixture"
          match={overview.nextFixture}
          empty="No upcoming fixture."
        />
        <MatchBlock
          title="Latest result"
          match={overview.latestResult}
          empty="No completed result."
        />
      </section>
      <section className="panel mt-8">
        <div className="panel-heading">
          <div>
            <p className="eyebrow">Matchday moments</p>
            <h2 className="panel-title">Gallery preview</h2>
          </div>
          <Link className="secondary-button" to={`/teams/${team.slug}/gallery`}>
            View gallery
          </Link>
        </div>
        {overview.galleryPreview.length ? (
          <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
            {overview.galleryPreview.map((photo, index) => (
              <figure
                className="overflow-hidden rounded-xl"
                key={`${photo.imageUrl}-${index}`}
              >
                <img
                  className="aspect-[4/3] size-full object-cover"
                  src={photo.imageUrl}
                  alt={photo.caption || `${team.name} match photo`}
                  loading="lazy"
                  decoding="async"
                />
              </figure>
            ))}
          </div>
        ) : (
          <PublicEmpty
            title="No photos yet"
            message="Match photos will appear here when published."
          />
        )}
      </section>
    </>
  );
}
function Stat({ label, value, icon: Icon }) {
  return (
    <div className="rounded-xl bg-black/10 p-3">
      <Icon size={16} className="text-lime-300" />
      <p className="mt-3 font-display text-2xl font-bold">{value}</p>
      <p className="text-xs text-white/35">{label}</p>
    </div>
  );
}
function Leader({ title, leader, suffix }) {
  return (
    <article className="panel">
      <p className="eyebrow">{title}</p>
      {leader ? (
        <>
          <Link
            className="mt-3 block font-display text-2xl font-bold hover:text-lime-200"
            to={`/players/${leader.playerId}`}
          >
            {leader.name}
          </Link>
          <p className="mt-1 text-sm text-white/40">
            {leader.value} {suffix}
          </p>
        </>
      ) : (
        <p className="mt-3 text-sm text-white/40">No completed-match data.</p>
      )}
    </article>
  );
}
function MatchBlock({ title, match, empty }) {
  return (
    <section>
      <h2 className="mb-4 font-display text-2xl font-bold">{title}</h2>
      {match ? (
        <PublicMatchCard match={match} />
      ) : (
        <PublicEmpty title={title} message={empty} />
      )}
    </section>
  );
}
