import {
  ArrowLeft,
  CalendarDays,
  Crown,
  Medal,
  Radio,
  Swords,
  Table2,
  Trophy,
  UsersRound,
} from "lucide-react";
import { Link } from "react-router-dom";
import Brand from "../components/Brand.jsx";

const upcoming = [
  ["Tournament Registration", UsersRound],
  ["Fixtures", CalendarDays],
  ["Groups", Swords],
  ["Knockout Brackets", Trophy],
  ["Live Tournament Matches", Radio],
  ["Direct Result Support", Medal],
  ["Points Table", Table2],
  ["Awards", Crown],
  ["Tournament Statistics", Trophy],
];

export default function TournamentComingSoonPage() {
  return (
    <section className="relative overflow-hidden rounded-[2rem] border border-lime-300/15 bg-[radial-gradient(circle_at_top_left,rgba(190,242,100,.18),transparent_34%),linear-gradient(135deg,rgba(255,255,255,.06),rgba(255,255,255,.015))] p-5 shadow-2xl sm:p-8 lg:p-10">
      <div className="absolute right-0 top-0 h-52 w-52 translate-x-1/3 -translate-y-1/3 rounded-full bg-lime-300/20 blur-3xl" />
      <div className="relative grid gap-9 lg:grid-cols-[1fr_.85fr] lg:items-center">
        <div>
          <Brand />
          <p className="eyebrow mt-8">Tournament module</p>
          <h1 className="page-title max-w-3xl">
            Tournaments are warming up.
          </h1>
          <p className="page-copy">
            FootStream tournament hosting is being polished for production.
            Normal teams, public profiles, fixtures, live matches, results, and
            dashboards remain available while this module is behind a release
            flag.
          </p>

          <div className="mt-7 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
            <Link className="primary-button" to="/">
              <ArrowLeft size={16} /> Back to Home
            </Link>
          </div>
        </div>

        <div className="rounded-[1.75rem] border border-white/[0.08] bg-black/20 p-5 backdrop-blur">
          <div className="mx-auto grid size-28 place-items-center rounded-[2rem] border border-lime-300/20 bg-lime-300/10 text-lime-100 shadow-[0_0_60px_rgba(190,242,100,.14)]">
            <Trophy size={52} aria-hidden="true" />
          </div>
          <h2 className="mt-6 text-center font-display text-2xl font-black">
            Upcoming Features
          </h2>
          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            {upcoming.map(([label, Icon]) => (
              <div
                key={label}
                className="flex min-w-0 items-center gap-3 rounded-2xl border border-white/[0.07] bg-white/[0.035] p-3 text-sm font-semibold text-emerald-50/75"
              >
                <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-lime-300/10 text-lime-200">
                  <Icon size={17} aria-hidden="true" />
                </span>
                <span className="min-w-0">{label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
