/* @vitest-environment jsdom */
import assert from "node:assert/strict";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, test, vi } from "vitest";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import api from "../api/client.js";
import TeamCollaborationsPage from "./TeamCollaborationsPage.jsx";

vi.mock("../api/client.js", () => ({
  default: {
    get: vi.fn(),
    patch: vi.fn(),
  },
}));

const pendingCollaboration = {
  id: "collab1",
  matchId: "match1",
  role: "opponent",
  status: "pending",
  badge: "Opponent Verification Pending",
  hostTeam: { id: "host1", name: "FC KIET", logo: "" },
  opponentTeam: { id: "opp1", name: "IMS FC", logo: "" },
  match: {
    id: "match1",
    scheduledAt: "2030-01-01T10:00:00.000Z",
    venue: "Main Ground",
    matchType: "friendly",
    matchMode: "direct",
    status: "completed",
    result: { finalTeamScore: 2, finalOpponentScore: 1 },
  },
  changeRequests: [],
};

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

test("team collaboration page shows opponent review actions and submits accept", async () => {
  api.get.mockResolvedValueOnce({ data: { data: { collaborations: [pendingCollaboration] } } });
  api.patch.mockResolvedValueOnce({ data: { data: { collaboration: { ...pendingCollaboration, status: "accepted", badge: "Verified by Both Teams" } } } });
  api.get.mockResolvedValueOnce({ data: { data: { collaborations: [{ ...pendingCollaboration, status: "accepted" }] } } });

  render(
    <MemoryRouter initialEntries={["/team/collaborations"]}>
      <TeamCollaborationsPage />
    </MemoryRouter>,
  );

  assert.ok(await screen.findByText("FC KIET vs IMS FC"));
  fireEvent.click(screen.getByRole("button", { name: /accept verification/i }));

  await waitFor(() => {
    assert.equal(api.patch.mock.calls[0][0], "/team/matches/match1/collaboration/accept");
  });
});

test("team collaboration detail route loads selected request", async () => {
  api.get.mockResolvedValueOnce({ data: { data: { collaborations: [] } } });
  api.get.mockResolvedValueOnce({ data: { data: { collaboration: pendingCollaboration } } });

  render(
    <MemoryRouter initialEntries={["/team/collaborations/collab1"]}>
      <Routes>
        <Route path="/team/collaborations/:collaborationId" element={<TeamCollaborationsPage />} />
      </Routes>
    </MemoryRouter>,
  );

  assert.ok(await screen.findByText("Match verification details"));
  assert.ok(await screen.findByText("FC KIET"));
  assert.equal(api.get.mock.calls[1][0], "/team/collaborations/collab1");
});
