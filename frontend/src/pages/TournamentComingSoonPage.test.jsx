import assert from "node:assert/strict";
import { renderToStaticMarkup } from "react-dom/server";
import { MemoryRouter } from "react-router-dom";
import { test } from "vitest";
import TournamentComingSoonPage from "./TournamentComingSoonPage.jsx";

test("Tournament coming soon page renders branded gated state", () => {
  const html = renderToStaticMarkup(
    <MemoryRouter>
      <TournamentComingSoonPage />
    </MemoryRouter>,
  );

  assert.match(html, /FootStream/);
  assert.match(html, /Tournaments are warming up/);
  assert.match(html, /Tournament Registration/);
  assert.match(html, /Knockout Brackets/);
  assert.match(html, /Back to Home/);
  assert.doesNotMatch(html, /Join WhatsApp Community/);
});
