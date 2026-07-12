import { CalendarDays, Images, ListChecks, Shield, Trophy } from "lucide-react";
import { useEffect, useState } from "react";
import { NavLink } from "react-router-dom";
import PublicBreadcrumbs from "../../components/PublicBreadcrumbs.jsx";

export function TeamLogo({ team, className = "size-20 rounded-2xl" }) {
  const [failed, setFailed] = useState(false);
  useEffect(() => setFailed(false), [team.logo]);
  if (!team.logo || failed)
    return (
      <div
        className={`grid place-items-center bg-lime-300 font-display text-xl font-black text-emerald-950 ${className}`}
        role="img"
        aria-label={`${team.name} logo fallback`}
      >
        {team.shortName}
      </div>
    );
  return (
    <img
      src={team.logo}
      alt={`${team.name} logo`}
      className={`object-cover ${className}`}
      loading="lazy"
      decoding="async"
      onError={() => setFailed(true)}
    />
  );
}

export function PublicTeamHeader({ team, currentLabel = "", actions = null }) {
  const [coverFailed, setCoverFailed] = useState(false);
  useEffect(() => setCoverFailed(false), [team.coverPhoto]);
  return (
    <>
      <PublicBreadcrumbs
        items={[
          { label: "Teams", to: "/teams" },
          ...(currentLabel
            ? [
                { label: team.name, to: `/teams/${team.slug}` },
                { label: currentLabel },
              ]
            : [{ label: team.name }]),
        ]}
      />
      <header className="relative overflow-hidden rounded-3xl border border-white/[0.08] bg-[radial-gradient(circle_at_top_left,rgba(190,242,100,.15),transparent_50%),rgba(255,255,255,.025)]">
        <div className="relative h-44 sm:h-56">
          {team.coverPhoto && !coverFailed && (
            <img
              src={team.coverPhoto}
              alt=""
              className="size-full object-cover opacity-45"
              onError={() => setCoverFailed(true)}
            />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-[#0a1711] via-[#0a1711]/30 to-transparent" />
        </div>
        <div className="relative -mt-14 flex flex-col gap-5 px-6 pb-7 sm:flex-row sm:items-end sm:px-9">
          <TeamLogo
            team={team}
            className="size-24 rounded-3xl border-4 border-[#0a1711] shadow-xl"
          />
          <div className="min-w-0">
            <p className="eyebrow">
              {team.shortName}
              {team.city ? ` · ${team.city}` : ""}
            </p>
            <h1 className="font-display text-4xl font-black tracking-tight sm:text-5xl">
              {team.name}
            </h1>
          </div>
          {actions && <div className="w-full sm:ml-auto sm:w-auto">{actions}</div>}
        </div>
      </header>
      <TeamNav slug={team.slug} />{" "}
    </>
  );
}

export function TeamNav({ slug }) {
  const links = [
    [`/teams/${slug}`, Shield, "Overview", true],
    [`/teams/${slug}/squad`, ListChecks, "Squad"],
    [`/teams/${slug}/fixtures`, CalendarDays, "Fixtures"],
    [`/teams/${slug}/results`, Trophy, "Results"],
    [`/teams/${slug}/gallery`, Images, "Gallery"],
  ];
  return (
    <nav
      className="mt-4 flex gap-2 overflow-x-auto pb-2"
      aria-label="Team pages"
    >
      {links.map(([to, Icon, label, end]) => (
        <NavLink
          key={to}
          to={to}
          end={Boolean(end)}
          className={({ isActive }) =>
            `nav-link shrink-0 ${isActive ? "nav-link-active" : ""}`
          }
        >
          <Icon size={16} /> {label}
        </NavLink>
      ))}
    </nav>
  );
}

export function PublicPagination({ pagination, onPage }) {
  if (!pagination || pagination.pages <= 1) return null;
  return (
    <nav
      className="mt-8 flex items-center justify-center gap-3"
      aria-label="Pagination"
    >
      <button
        type="button"
        className="secondary-button"
        disabled={pagination.page <= 1}
        onClick={() => onPage(pagination.page - 1)}
      >
        Previous
      </button>
      <span className="text-sm text-white/45">
        Page {pagination.page} of {pagination.pages}
      </span>
      <button
        type="button"
        className="secondary-button"
        disabled={pagination.page >= pagination.pages}
        onClick={() => onPage(pagination.page + 1)}
      >
        Next
      </button>
    </nav>
  );
}
