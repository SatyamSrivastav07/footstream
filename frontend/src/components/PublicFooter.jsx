import { BriefcaseBusiness, ExternalLink, Mail } from 'lucide-react';
import { Link } from 'react-router-dom';
import { PORTFOLIO_URL, SUPPORT_EMAIL } from '../config/features.js';
import Brand from './Brand.jsx';

const quickLinks = [
  ['/', 'Home'],
  ['/teams', 'Teams'],
  ['/live', 'Live Matches'],
  ['/fixtures', 'Fixtures'],
  ['/results', 'Results'],
  ['/search?type=players', 'Player Statistics'],
  ['/register-team', 'Register Your Team'],
];

export default function PublicFooter() {
  return (
    <footer className="border-t border-white/[0.07] bg-[#08140f]">
      <div className="mx-auto grid max-w-[1440px] gap-7 px-5 py-8 text-sm text-emerald-100/45 sm:px-8 lg:grid-cols-[1.15fr_.85fr] lg:items-start">
        <div>
          <Brand />
          <p className="mt-3 text-xs font-semibold uppercase tracking-[0.28em] text-lime-200/70">
            Play • Stream • Connect
          </p>
          <p className="mt-4 max-w-xl leading-6">
            FootStream brings football teams, live matches, fixtures, results, and player stories together.
          </p>
          <div className="mt-4 rounded-2xl border border-lime-300/15 bg-lime-300/[0.06] p-4">
            <p className="font-semibold text-white">For queries, support, or team onboarding, contact us.</p>
            <div className="mt-3 flex flex-wrap gap-2">
            {SUPPORT_EMAIL ? (
              <a
                className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-lime-300/25 bg-black/20 px-3 py-2 font-semibold text-lime-100 transition hover:border-lime-300/50 hover:bg-lime-300/10 focus:outline-none focus:ring-2 focus:ring-lime-200"
                href={`mailto:${SUPPORT_EMAIL}`}
                aria-label={`Email FootStream support at ${SUPPORT_EMAIL}`}
              >
                <Mail size={16} aria-hidden="true" />
                {SUPPORT_EMAIL}
              </a>
            ) : null}
            {PORTFOLIO_URL ? (
              <a
                className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2 font-semibold text-emerald-50/80 transition hover:border-lime-300/35 hover:text-lime-100 focus:outline-none focus:ring-2 focus:ring-lime-200"
                href={PORTFOLIO_URL}
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Open FootStream developer portfolio in a new tab"
              >
                <BriefcaseBusiness size={16} aria-hidden="true" />
                Portfolio
                <ExternalLink size={14} aria-hidden="true" />
              </a>
            ) : null}
            </div>
          </div>
        </div>

        <nav aria-label="Footer quick links" className="grid gap-2 sm:grid-cols-2">
          {quickLinks.map(([to, label]) => (
            <Link key={to} to={to} className="inline-flex min-h-11 items-center rounded-xl border border-white/[0.06] bg-white/[0.025] px-3 py-2 font-semibold text-emerald-50/65 transition hover:border-lime-300/25 hover:text-lime-100 focus:outline-none focus:ring-2 focus:ring-lime-200">
              {label}
            </Link>
          ))}
        </nav>
      </div>
      <div className="border-t border-white/[0.06] px-5 py-4 text-center text-xs text-emerald-100/35">
        © FootStream — All Rights Reserved.
      </div>
    </footer>
  );
}
