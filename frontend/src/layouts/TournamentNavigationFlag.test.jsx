/* @vitest-environment jsdom */
import assert from "node:assert/strict";
import { cleanup, render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { afterEach, test, vi } from "vitest";
import DashboardLayout from "./DashboardLayout.jsx";
import PublicLayout from "./PublicLayout.jsx";

const apiClientMocks = vi.hoisted(() => ({
  get: vi.fn(),
}));

const authMock = vi.hoisted(() => ({
  value: {
    user: { name: "Team Admin", email: "team@footstream.test", role: "teamAdmin" },
    logout: vi.fn(),
  },
}));

vi.mock("../api/client.js", () => ({ default: apiClientMocks }));
vi.mock("../context/AuthContext.jsx", () => ({ useAuth: () => authMock.value }));
vi.mock("../config/features.js", () => ({
  TOURNAMENTS_ENABLED: false,
  SUPPORT_EMAIL: "",
  PORTFOLIO_URL: "",
  WHATSAPP_COMMUNITY_URL: "",
}));

afterEach(() => {
  cleanup();
  apiClientMocks.get.mockReset();
  authMock.value = {
    user: { name: "Team Admin", email: "team@footstream.test", role: "teamAdmin" },
    logout: vi.fn(),
  };
});

test("public navigation keeps Tournament visible and points to coming soon when disabled", () => {
  render(
    <MemoryRouter initialEntries={["/"]}>
      <Routes>
        <Route element={<PublicLayout />}>
          <Route path="/" element={<div>Home</div>} />
        </Route>
      </Routes>
    </MemoryRouter>,
  );

  assert.equal(screen.getByRole("link", { name: /^Tournament$/i }).getAttribute("href"), "/tournaments-coming-soon");
});

test("team admin navigation keeps Tournament visible and points to coming soon when disabled", () => {
  apiClientMocks.get.mockResolvedValue({ data: { data: { count: 0, categories: {} } } });
  render(
    <MemoryRouter initialEntries={["/team"]}>
      <Routes>
        <Route element={<DashboardLayout />}>
          <Route path="/team" element={<div>Team dashboard</div>} />
        </Route>
      </Routes>
    </MemoryRouter>,
  );

  assert.equal(screen.getByRole("link", { name: /^Tournament$/i }).getAttribute("href"), "/tournaments-coming-soon");
});

test("super admin navigation keeps Tournament Review visible and points to coming soon when disabled", () => {
  authMock.value = {
    user: { name: "Super Admin", email: "admin@footstream.test", role: "superAdmin" },
    logout: vi.fn(),
  };
  apiClientMocks.get.mockResolvedValue({ data: { data: { count: 0, categories: {} } } });
  render(
    <MemoryRouter initialEntries={["/admin"]}>
      <Routes>
        <Route element={<DashboardLayout />}>
          <Route path="/admin" element={<div>Admin dashboard</div>} />
        </Route>
      </Routes>
    </MemoryRouter>,
  );

  assert.equal(screen.getByRole("link", { name: /^Tournament Review$/i }).getAttribute("href"), "/tournaments-coming-soon");
});
