import { ArrowRight, CalendarDays, Radio } from "lucide-react";
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api from "../api/client.js";
import PublicMatchCard from "../features/public/PublicMatchCard.jsx";
import {
  PublicEmpty,
  PublicError,
  PublicGridLoader,
} from "../features/public/PublicStates.jsx";
import usePageMetadata from "../hooks/usePageMetadata.js";

export default function PublicHomePage() {
  usePageMetadata({
    title: "FootStream | Football Live, Fixtures & Results",
    description:
      "Follow live football scoreboards, upcoming fixtures, final results, teams, players, and YouTube broadcasts.",
    path: "/",
  });
  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  useEffect(() => {
    api
      .get("/public/home")
      .then((response) => setData(response.data.data))
      .catch((requestError) => setError(requestError.userMessage));
  }, []);
  return (
    <>
      <section className="pitch-grid relative overflow-hidden rounded-[2rem] border border-lime-300/10 bg-[radial-gradient(circle_at_top_left,rgba(190,242,100,.13),transparent_46%),rgba(255,255,255,.02)] px-6 py-16 sm:px-10 lg:px-16 lg:py-24">
        <div className="relative max-w-3xl">
          <p className="eyebrow">Your matchday, everywhere</p>
          <h1 className="mt-4 font-display text-5xl font-black tracking-[-.045em] sm:text-7xl">
            Football lives here.
          </h1>
          <p className="mt-5 max-w-2xl text-base leading-7 text-emerald-50/55 sm:text-lg">
            Follow live scoreboards, upcoming fixtures, final results, match
            events, and team broadcasts from one public match center.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link to="/live" className="primary-button">
              <Radio size={17} /> Browse live matches
            </Link>
            <Link to="/fixtures" className="secondary-button">
              <CalendarDays size={17} /> Browse fixtures
            </Link>
          </div>
        </div>
      </section>
      {error && (
        <div className="mt-8">
          <PublicError message={error} />
        </div>
      )}
      {!data && !error ? (
        <div className="mt-10">
          <PublicGridLoader />
        </div>
      ) : (
        data && (
          <>
            <HomeSection
              title="Live now"
              copy="Scoreboards and active broadcasts happening right now."
              href="/live"
              items={data.live}
              empty="No matches are live at the moment."
            />
            <HomeSection
              title="Upcoming fixtures"
              copy="The next scheduled kickoffs across FootStream."
              href="/fixtures"
              items={data.upcoming}
              empty="No upcoming fixtures have been published."
            />
            <HomeSection
              title="Latest results"
              copy="Recently completed matches and verified scorelines."
              href="/results"
              items={data.latestResults}
              empty="No completed results are available yet."
            />
          </>
        )
      )}
    </>
  );
}
function HomeSection({ title, copy, href, items, empty }) {
  return (
    <section className="mt-12">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="eyebrow">Match center</p>
          <h2 className="page-title text-3xl sm:text-4xl">{title}</h2>
          <p className="page-copy">{copy}</p>
        </div>
        <Link className="secondary-button" to={href}>
          View all <ArrowRight size={16} />
        </Link>
      </div>
      {items.length ? (
        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {items.map((match) => (
            <PublicMatchCard key={match.matchId} match={match} />
          ))}
        </div>
      ) : (
        <PublicEmpty title={title} message={empty} />
      )}
    </section>
  );
}
