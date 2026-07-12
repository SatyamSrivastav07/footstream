import assert from "node:assert/strict";
import { test } from "vitest";
import { eventPresentation } from "./eventPresentation.js";
import { enqueuePresentation, nextNotification } from "./notificationQueue.js";

const state = {
  team: { name: "FC KIET" },
  opponent: { name: "Opponent" },
  teamScore: 2,
  opponentScore: 1,
};

test("goal presentation includes scorer assist and score", () => {
  const value = eventPresentation({
    kind: "event",
    state,
    event: {
      type: "goal",
      minute: 54,
      playerSnapshot: { name: "Satyam Srivastav" },
      assistPlayerSnapshot: { name: "Kushagra" },
    },
  });
  assert.equal(value.title, "GOAL!");
  assert.ok(value.lines.includes("Satyam Srivastav"));
  assert.ok(value.lines.includes("FC KIET 2-1 Opponent"));
  assert.ok(value.lines.includes("Assist: Kushagra"));
  assert.equal(value.duration, 4500);
});

test("substitution presentation includes player in and out", () => {
  const value = eventPresentation({
    kind: "event",
    event: {
      type: "substitution",
      playerInSnapshot: { name: "Ashutosh" },
      playerOutSnapshot: { name: "Abhimanyu" },
    },
  });
  assert.equal(value.title, "SUBSTITUTION");
  assert.deepEqual(value.lines.slice(0, 2), ["Ashutosh IN", "Abhimanyu OUT"]);
});

test("card presentation includes player and minute", () => {
  const value = eventPresentation({
    kind: "event",
    event: { type: "yellow_card", minute: 54, playerSnapshot: { name: "Vansh" } },
  });
  assert.equal(value.title, "YELLOW CARD");
  assert.equal(value.lines[0], "Vansh - 54'");
});

test("undo presentation announces correction", () => {
  const value = eventPresentation({
    kind: "undo",
    event: { playerSnapshot: { name: "Vansh" }, undoReason: "Wrong player" },
  });
  assert.equal(value.title, "EVENT CORRECTED");
  assert.ok(value.lines.includes("Wrong player"));
});

test("notification queue preserves ordering and does not enqueue old REST events by itself", () => {
  const queue = [];
  const first = enqueuePresentation(queue, { kind: "event", state, event: { type: "goal", playerSnapshot: { name: "One" } } });
  const second = enqueuePresentation(first, { kind: "event", event: { type: "yellow_card", playerSnapshot: { name: "Two" } } });
  const next = nextNotification(second);
  assert.equal(next.active.title, "GOAL!");
  assert.equal(next.rest[0].title, "YELLOW CARD");
  assert.equal(queue.length, 0);
});

test("overlay animation can be disabled with reduced motion CSS", () => {
  assert.equal(eventPresentation({ kind: "transition", state: { status: "half_time" } }).duration, 3000);
});
