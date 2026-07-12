import assert from "node:assert/strict";
import { renderToStaticMarkup } from "react-dom/server";
import { MemoryRouter } from "react-router-dom";
import { test } from "vitest";
import { PublicTeamActions, publicTeamJoinAction } from "./PublicTeamProfilePage.jsx";

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
