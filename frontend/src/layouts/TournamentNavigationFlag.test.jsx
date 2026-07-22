/* @vitest-environment jsdom */
import assert from "node:assert/strict";
import { act, cleanup, render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { afterEach, test, vi } from "vitest";
import DashboardLayout from "./DashboardLayout.jsx";
import PublicLayout from "./PublicLayout.jsx";

const apiClientMocks = vi.hoisted(() => ({
  get: vi.fn(),
}));

const authMock = vi.hoisted(() => ({
  value: {
    user: { _id: "user-1", id: "user-1", name: "Team Admin", email: "team@footstream.test", role: "teamAdmin" },
    logout: vi.fn(),
  },
}));

const socketMock = vi.hoisted(() => ({
  handlers: {},
  emit: vi.fn(),
  disconnect: vi.fn(),
}));

vi.mock("../api/client.js", () => ({ default: apiClientMocks, socketUrl: "http://localhost:5000" }));
vi.mock("../context/AuthContext.jsx", () => ({ useAuth: () => authMock.value }));
vi.mock("socket.io-client", () => ({
  io: vi.fn(() => ({
    on: (event, handler) => { socketMock.handlers[event] = handler; },
    emit: socketMock.emit,
    disconnect: socketMock.disconnect,
    io: { on: vi.fn() },
  })),
}));
vi.mock("../config/features.js", () => ({
  TOURNAMENTS_ENABLED: false,
  SUPPORT_EMAIL: "",
  PORTFOLIO_URL: "",
  WHATSAPP_COMMUNITY_URL: "",
}));

afterEach(() => {
  cleanup();
  apiClientMocks.get.mockReset();
  socketMock.handlers = {};
  socketMock.emit.mockReset();
  socketMock.disconnect.mockReset();
  authMock.value = {
    user: { _id: "user-1", id: "user-1", name: "Team Admin", email: "team@footstream.test", role: "teamAdmin" },
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

  assert.equal(screen.getByRole("link", { name: /^Team Admin Chat$/i }).getAttribute("href"), "/team/chat");
  assert.equal(screen.getByRole("link", { name: /^Tournament$/i }).getAttribute("href"), "/tournaments-coming-soon");
});

test("team admin navigation shows unread dot when a new admin chat message arrives", () => {
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

  act(() => {
    socketMock.handlers["team-admin-chat:community-message"]?.({
      message: {
        id: "message-1",
        sender: { id: "user-2", name: "IMS Admin" },
        message: "Anyone available for a friendly?",
      },
    });
  });

  assert.ok(screen.getByLabelText("1 unread notifications"));
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
