import { Search, X } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../api/client.js";
import TeamIdentity from "./TeamIdentity.jsx";
import { buildSearchParams } from "../utils/publicUrl.js";

const destination = (item) =>
  item.kind === "team"
    ? `/teams/${item.slug}`
    : item.kind === "player"
      ? `/players/${item.playerId}`
      : ["live", "half_time"].includes(item.status)
        ? `/matches/${item.matchId}/live`
        : item.status === "completed"
          ? `/matches/${item.matchId}/result`
          : `/matches/${item.matchId}`;

export default function PublicHeaderSearch() {
  const navigate = useNavigate();
  const rootRef = useRef(null);
  const inputRef = useRef(null);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  useEffect(() => {
    if (query.trim().length < 2) {
      setResults([]);
      setOpen(false);
      return undefined;
    }
    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      try {
        const response = await api.get("/public/search", {
          params: { q: query.trim(), type: "all", limit: 5 },
          signal: controller.signal,
        });
        const data = response.data.data;
        const items = [
          ...data.teams.items.map((item) => ({
            ...item,
            kind: "team",
            label: item.name,
            detail: item.city || "Team",
          })),
          ...data.players.items.map((item) => ({
            ...item,
            kind: "player",
            label: item.name,
            detail: `${item.position} · ${item.team.name}`,
          })),
          ...data.matches.items.map((item) => ({
            ...item,
            kind: "match",
            label: `${item.team.name} vs ${item.opponent.name}`,
            detail: item.status.replaceAll("_", " "),
          })),
        ].slice(0, 5);
        setResults(items);
        setOpen(true);
        setActive(-1);
      } catch (error) {
        if (error.code !== "ERR_CANCELED") {
          setResults([]);
          setOpen(false);
        }
      }
    }, 350);
    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [query]);
  useEffect(() => {
    const outside = (event) => {
      if (!rootRef.current?.contains(event.target)) setOpen(false);
    };
    document.addEventListener("pointerdown", outside);
    return () => document.removeEventListener("pointerdown", outside);
  }, []);
  const listId = useMemo(() => "public-search-suggestions", []);
  const submit = (event) => {
    event.preventDefault();
    const value = query.trim();
    if (value.length >= 2) {
      setOpen(false);
      navigate(`/search?${buildSearchParams({ q: value })}`);
    } else inputRef.current?.focus();
  };
  const choose = (item) => {
    setOpen(false);
    setQuery("");
    navigate(destination(item));
  };
  const keyDown = (event) => {
    if (event.key === "Escape") {
      setOpen(false);
      setActive(-1);
    }
    if (open && results.length && event.key === "ArrowDown") {
      event.preventDefault();
      setActive((value) => (value + 1) % results.length);
    }
    if (open && results.length && event.key === "ArrowUp") {
      event.preventDefault();
      setActive((value) => (value <= 0 ? results.length - 1 : value - 1));
    }
    if (event.key === "Enter" && active >= 0 && results[active]) {
      event.preventDefault();
      choose(results[active]);
    }
  };
  return (
    <div className="relative hidden xl:block" ref={rootRef}>
      <form className="relative" role="search" onSubmit={submit}>
        <label className="sr-only" htmlFor="header-search">
          Search FootStream
        </label>
        <Search
          className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-white/35"
          size={15}
        />
        <input
          ref={inputRef}
          id="header-search"
          className="w-56 rounded-xl border border-white/10 bg-black/20 py-2 pl-9 pr-8 text-sm text-white outline-none placeholder:text-white/30 focus-visible:border-lime-300/50 focus-visible:ring-2 focus-visible:ring-lime-300/20"
          placeholder="Search FootStream"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          onFocus={() => results.length && setOpen(true)}
          onKeyDown={keyDown}
          aria-expanded={open}
          aria-controls={listId}
          aria-autocomplete="list"
          aria-activedescendant={
            active >= 0 ? `search-option-${active}` : undefined
          }
        />
        {query && (
          <button
            type="button"
            className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-white/40 hover:text-white"
            onClick={() => {
              setQuery("");
              inputRef.current?.focus();
            }}
            aria-label="Clear search"
          >
            <X size={14} />
          </button>
        )}
      </form>
      {open && (
        <div
          id={listId}
          role="listbox"
          className="absolute right-0 top-[calc(100%+.5rem)] z-50 w-80 overflow-hidden rounded-2xl border border-white/10 bg-[#0b1912] p-2 shadow-2xl"
        >
          <p className="px-3 py-2 text-[10px] font-bold uppercase tracking-wider text-white/30">
            Suggestions
          </p>
          {results.length ? (
            results.map((item, index) => (
              <button
                id={`search-option-${index}`}
                role="option"
                aria-selected={index === active}
                type="button"
                className={`block w-full rounded-xl px-3 py-2 text-left ${index === active ? "bg-lime-300/10 text-lime-100" : "hover:bg-white/[0.05]"}`}
                key={`${item.kind}-${item.slug || item.playerId || item.matchId}`}
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => choose(item)}
              >
                <span className="block truncate text-sm font-semibold">
                  {item.kind === "team" && <TeamIdentity team={item} logoClassName="size-5 rounded" />}
                  {item.kind === "player" && item.label}
                  {item.kind === "match" && <TeamIdentity team={item.team} name={item.team.name} logoClassName="size-5 rounded" />}
                </span>
                <span className="flex items-center gap-1 truncate text-xs text-white/35">
                  <span>{item.kind} ·</span>
                  {item.kind === "player" ? <><span>{item.position} ·</span><TeamIdentity team={item.team} logoClassName="size-4 rounded" /></> : item.detail}
                </span>
              </button>
            ))
          ) : (
            <p className="px-3 py-4 text-sm text-white/40">
              No suggestions found.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
