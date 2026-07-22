/* @vitest-environment jsdom */
import assert from "node:assert/strict";
import { cleanup, render, screen, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, test, vi } from "vitest";

const renderFooter = async ({
  supportEmail = "",
  legacyContactEmail = "",
  portfolioUrl = "",
} = {}) => {
  cleanup();
  vi.resetModules();
  vi.stubEnv("VITE_SUPPORT_EMAIL", supportEmail);
  vi.stubEnv("VITE_CONTACT_EMAIL", legacyContactEmail);
  vi.stubEnv("VITE_PORTFOLIO_URL", portfolioUrl);
  const { default: PublicFooter } = await import("./PublicFooter.jsx");

  return render(
    <MemoryRouter>
      <PublicFooter />
    </MemoryRouter>,
  );
};

afterEach(() => {
  cleanup();
  vi.unstubAllEnvs();
});

test("public footer renders branding, support actions, quick links, and copyright", async () => {
  await renderFooter({
    supportEmail: "support@footstream.test",
    portfolioUrl: "https://portfolio.test",
  });

  assert.ok(screen.getByText("FootStream"));
  assert.ok(screen.getByText("Play • Stream • Connect"));
  assert.equal(screen.getByRole("link", { name: /support@footstream.test/i }).getAttribute("href"), "mailto:support@footstream.test");
  assert.equal(screen.getByRole("link", { name: /portfolio/i }).getAttribute("href"), "https://portfolio.test");
  assert.equal(screen.getByRole("link", { name: /portfolio/i }).getAttribute("target"), "_blank");
  assert.equal(screen.queryByRole("link", { name: /whatsapp community/i }), null);

  const quickLinks = within(screen.getByRole("navigation", { name: /footer quick links/i }));
  ["Home", "Teams", "Live Matches", "Fixtures", "Results", "Player Statistics", "Register Your Team"].forEach((label) => {
    assert.ok(quickLinks.getByRole("link", { name: label }));
  });
  assert.ok(screen.getByText("© FootStream — All Rights Reserved."));
}, 10000);

test("public footer supports legacy contact email and hides missing optional links", async () => {
  await renderFooter({ legacyContactEmail: "legacy@footstream.test" });

  assert.equal(screen.getByRole("link", { name: /legacy@footstream.test/i }).getAttribute("href"), "mailto:legacy@footstream.test");
  assert.equal(screen.queryByRole("link", { name: /portfolio/i }), null);
  assert.equal(screen.queryByRole("link", { name: /whatsapp community/i }), null);
}, 10000);

test("public footer hides email action when no support email is configured", async () => {
  await renderFooter();

  assert.equal(screen.queryByRole("link", { name: /email footstream support/i }), null);
});
