import assert from "node:assert/strict";
import { renderToStaticMarkup } from "react-dom/server";
import { MemoryRouter } from "react-router-dom";
import { test } from "vitest";
import { PublicTeamActions, publicTeamJoinAction } from "./PublicTeamProfilePage.jsx";
import { getOrCreateFollowerSessionId } from "../features/public/FollowTeamPanel.jsx";

const publicTeam = {
  name: "Foot Stream FC",
  slug: "foot-stream-fc",
  acceptingJoinRequests: true,
  socialLinks: {},
};

test("public team profile join action renders when requests are enabled", () => {
  const html = renderToStaticMarkup(
    <MemoryRouter>
      <PublicTeamActions team={publicTeam} />
    </MemoryRouter>,
  );

  assert.match(html, /Join Foot Stream FC/);
});

test("public team profile join action hides when requests are disabled", () => {
  const html = renderToStaticMarkup(
    <MemoryRouter>
      <PublicTeamActions team={{ ...publicTeam, acceptingJoinRequests: false }} />
    </MemoryRouter>,
  );

  assert.doesNotMatch(html, /Join Foot Stream FC/);
});

test("public team profile join action links to the team join route", () => {
  assert.deepEqual(publicTeamJoinAction(publicTeam), {
    to: "/teams/foot-stream-fc/join",
    label: "Join Foot Stream FC",
    ariaLabel: "Join Foot Stream FC",
  });
});

test("follower session id is generated once and reused from localStorage", () => {
  const store = new Map();
  const originalLocalStorage = globalThis.localStorage;
  const originalCrypto = globalThis.crypto;
  Object.defineProperty(globalThis, "localStorage", { configurable: true, value: {
    getItem: (key) => store.get(key) || null,
    setItem: (key, value) => store.set(key, value),
  } });
  Object.defineProperty(globalThis, "crypto", { configurable: true, value: { randomUUID: () => "b0fd2df5-a5b0-4835-9d45-0922af722111" } });

  const first = getOrCreateFollowerSessionId();
  Object.defineProperty(globalThis, "crypto", { configurable: true, value: { randomUUID: () => "00000000-0000-4000-8000-000000000000" } });
  const second = getOrCreateFollowerSessionId();

  assert.equal(first, "b0fd2df5-a5b0-4835-9d45-0922af722111");
  assert.equal(second, first);

  Object.defineProperty(globalThis, "localStorage", { configurable: true, value: originalLocalStorage });
  Object.defineProperty(globalThis, "crypto", { configurable: true, value: originalCrypto });
});
