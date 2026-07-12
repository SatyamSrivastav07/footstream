import { CalendarDays, Goal, Radio, Search } from "lucide-react";
import { Link } from "react-router-dom";
import Brand from "../components/Brand.jsx";
import { useAuth } from "../context/AuthContext.jsx";
import usePageMetadata from "../hooks/usePageMetadata.js";

export default function NotFoundPage() {
  const { user } = useAuth();
  usePageMetadata({
    title: "Page Not Found | FootStream",
    description:
      "The requested FootStream page could not be found. Browse live matches, fixtures, teams, players, and results.",
    path: window.location.pathname,
  });
  const dashboard = user?.role === "superAdmin" ? "/admin" : "/team";
  return (
    <main className="error-page">
      <div className="error-card">
        <Link className="inline-flex" to="/" aria-label="FootStream home">
          <Brand />
        </Link>
        <Goal className="mx-auto mt-8 text-lime-300" size={42} />
        <p className="eyebrow mt-6">Error 404</p>
        <h1 className="font-display text-5xl font-black">Out of play</h1>
        <p className="mx-auto mt-3 max-w-md text-emerald-100/50">
          That page is beyond the touchline. Jump back into a live match, browse
          fixtures, or search FootStream.
        </p>
        <div className="mt-8 grid gap-3 sm:grid-cols-2">
          <Link className="primary-button" to="/">
            <Goal size={17} /> Home
          </Link>
          <Link className="secondary-button" to="/live">
            <Radio size={17} /> Live
          </Link>
          <Link className="secondary-button" to="/fixtures">
            <CalendarDays size={17} /> Fixtures
          </Link>
          <Link className="secondary-button" to="/search">
            <Search size={17} /> Search
          </Link>
          {user && (
            <Link className="secondary-button sm:col-span-2" to={dashboard}>
              Return to dashboard
            </Link>
          )}
        </div>
      </div>
    </main>
  );
}
