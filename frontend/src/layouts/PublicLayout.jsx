import {
  CalendarDays,
  Home,
  ListChecks,
  LogIn,
  Menu,
  Radio,
  Search,
  Trophy,
  Users,
  X,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Link, NavLink, Outlet, useLocation } from "react-router-dom";
import Brand from "../components/Brand.jsx";
import PublicHeaderSearch from "../components/PublicHeaderSearch.jsx";
import { useAuth } from "../context/AuthContext.jsx";

const links = [
  ["/", Home, "Home"],
  ["/live", Radio, "Live"],
  ["/fixtures", CalendarDays, "Fixtures"],
  ["/results", Trophy, "Results"],
  ["/teams", Users, "Teams"],
];

export default function PublicLayout() {
  const { user } = useAuth();
  const { pathname } = useLocation();
  const [open, setOpen] = useState(false);
  const menuButtonRef = useRef(null);
  const firstMenuItemRef = useRef(null);
  const mainRef = useRef(null);
  const destination = user
    ? user.role === "superAdmin"
      ? "/admin"
      : "/team"
    : "/login";
  useEffect(() => {
    setOpen(false);
    window.scrollTo({ top: 0, behavior: "auto" });
    window.requestAnimationFrame(() =>
      mainRef.current?.focus({ preventScroll: true }),
    );
  }, [pathname]);
  useEffect(() => {
    if (!open) return undefined;
    window.requestAnimationFrame(() => firstMenuItemRef.current?.focus());
    const escape = (event) => {
      if (event.key === "Escape") {
        setOpen(false);
        menuButtonRef.current?.focus();
      }
    };
    document.addEventListener("keydown", escape);
    return () => document.removeEventListener("keydown", escape);
  }, [open]);
  return (
    <div className="min-h-screen bg-[#07110d] text-white">
      <a className="skip-link" href="#public-main">
        Skip to main content
      </a>
      <header className="sticky top-0 z-40 border-b border-white/[0.07] bg-[#08140f]/95 backdrop-blur">
        <div className="mx-auto flex max-w-[1440px] items-center justify-between px-5 py-4 sm:px-8">
          <Link to="/" aria-label="FootStream home">
            <Brand />
          </Link>
          <nav
            className="hidden items-center gap-1 lg:flex"
            aria-label="Public navigation"
          >
            {links.map(([to, Icon, text]) => (
              <NavLink
                key={to}
                to={to}
                end={to === "/"}
                className={({ isActive }) =>
                  `nav-link ${isActive ? "nav-link-active" : ""}`
                }
              >
                <Icon size={17} /> {text}
              </NavLink>
            ))}
          </nav>
          <div className="flex items-center gap-2">
            <PublicHeaderSearch />
            <NavLink to="/search" className="icon-button hidden lg:grid xl:hidden" aria-label="Search FootStream"><Search size={17} /></NavLink>
            <Link
              className="secondary-button hidden sm:inline-flex"
              to={destination}
            >
              {user ? <ListChecks size={16} /> : <LogIn size={16} />}
              {user ? "Dashboard" : "Team login"}
            </Link>
            <button
              ref={menuButtonRef}
              type="button"
              className="icon-button lg:hidden"
              onClick={() => setOpen((value) => !value)}
              aria-expanded={open}
              aria-controls="mobile-public-menu"
              aria-label="Toggle navigation"
            >
              {open ? <X size={19} /> : <Menu size={19} />}
            </button>
          </div>
        </div>
        {open && (
          <nav
            id="mobile-public-menu"
            className="border-t border-white/[0.07] px-5 py-3 lg:hidden"
            aria-label="Mobile public navigation"
          >
            {links.map(([to, Icon, text], index) => (
              <NavLink
                ref={index === 0 ? firstMenuItemRef : undefined}
                key={to}
                to={to}
                end={to === "/"}
                onClick={() => setOpen(false)}
                className={({ isActive }) =>
                  `nav-link ${isActive ? "nav-link-active" : ""}`
                }
              >
                <Icon size={17} /> {text}
              </NavLink>
            ))}
            <Link
              to="/search"
              onClick={() => setOpen(false)}
              className="nav-link"
            >
              <Search size={17} /> Search
            </Link>
            <Link
              to={destination}
              onClick={() => setOpen(false)}
              className="nav-link"
            >
              <LogIn size={17} /> {user ? "Dashboard" : "Team login"}
            </Link>
          </nav>
        )}
      </header>
      <main
        ref={mainRef}
        id="public-main"
        tabIndex="-1"
        className="mx-auto min-h-[calc(100vh-12rem)] max-w-[1440px] px-5 py-8 outline-none sm:px-8 lg:py-12"
      >
        <Outlet />
      </main>
      <footer className="border-t border-white/[0.07] bg-[#08140f]">
        <div className="mx-auto flex max-w-[1440px] flex-col gap-3 px-5 py-8 text-sm text-emerald-100/40 sm:flex-row sm:items-center sm:justify-between sm:px-8">
          <p>FootStream · Football live, fixtures, and results.</p>
          <p>Public viewing requires no account.</p>
        </div>
      </footer>
    </div>
  );
}
