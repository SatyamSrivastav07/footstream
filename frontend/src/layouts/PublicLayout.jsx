import {
  CalendarDays,
  Home,
  ListChecks,
  LogIn,
  Menu,
  Radio,
  Trophy,
  Users,
  X,
} from "lucide-react";
import { useState } from "react";
import { Link, NavLink, Outlet } from "react-router-dom";
import Brand from "../components/Brand.jsx";
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
  const [open, setOpen] = useState(false);
  const destination = user
    ? user.role === "superAdmin"
      ? "/admin"
      : "/team"
    : "/login";
  return (
    <div className="min-h-screen bg-[#07110d] text-white">
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
            <Link
              className="secondary-button hidden sm:inline-flex"
              to={destination}
            >
              {user ? <ListChecks size={16} /> : <LogIn size={16} />}
              {user ? "Dashboard" : "Team login"}
            </Link>
            <button
              type="button"
              className="icon-button lg:hidden"
              onClick={() => setOpen((value) => !value)}
              aria-expanded={open}
              aria-label="Toggle navigation"
            >
              {open ? <X size={19} /> : <Menu size={19} />}
            </button>
          </div>
        </div>
        {open && (
          <nav
            className="border-t border-white/[0.07] px-5 py-3 lg:hidden"
            aria-label="Mobile public navigation"
          >
            {links.map(([to, Icon, text]) => (
              <NavLink
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
              to={destination}
              onClick={() => setOpen(false)}
              className="nav-link"
            >
              <LogIn size={17} /> {user ? "Dashboard" : "Team login"}
            </Link>
          </nav>
        )}
      </header>
      <main className="mx-auto min-h-[calc(100vh-12rem)] max-w-[1440px] px-5 py-8 sm:px-8 lg:py-12">
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
