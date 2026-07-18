/* @vitest-environment jsdom */
import assert from "node:assert/strict";
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, test, vi } from "vitest";
import { MemoryRouter } from "react-router-dom";
import api from "../api/client.js";
import TeamAdminDashboard from "./TeamAdminDashboard.jsx";

const authMock = vi.hoisted(() => ({
  user: {
    name: "Satyam",
    email: "satyam@example.com",
    role: "teamAdmin",
    team: {
      _id: "team1",
      name: "FC KIET",
      acceptingJoinRequests: true,
    },
  },
}));

vi.mock("../api/client.js", () => ({
  default: {
    get: vi.fn(),
    patch: vi.fn(),
  },
}));

vi.mock("../config/features.js", () => ({
  WHATSAPP_COMMUNITY_URL: "https://chat.whatsapp.com/footstream-official",
}));

vi.mock("../context/AuthContext.jsx", () => ({
  useAuth: () => ({ user: authMock.user }),
}));

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

test("team admin My Team page shows the FootStream official WhatsApp group action", async () => {
  api.get.mockResolvedValueOnce({ data: { data: { team: authMock.user.team } } });

  render(
    <MemoryRouter>
      <TeamAdminDashboard />
    </MemoryRouter>,
  );

  assert.ok(await screen.findByText("Join FootStream Official Group"));
  const link = screen.getByRole("link", {
    name: /join footstream official whatsapp group/i,
  });
  assert.equal(link.getAttribute("href"), "https://chat.whatsapp.com/footstream-official");
  assert.equal(link.getAttribute("target"), "_blank");
  assert.equal(link.getAttribute("rel"), "noopener noreferrer");
});
