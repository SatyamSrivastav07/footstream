import { describe, expect, it, vi } from "vitest";
import { sharePublicResource } from "./share.js";

const windowObject = () => ({
  location: { origin: "http://localhost:5173" },
  prompt: vi.fn(),
});

describe("public share helper", () => {
  it("uses native share when available", async () => {
    const share = vi.fn().mockResolvedValue();
    const result = await sharePublicResource({
      title: "Match",
      text: "Live",
      path: "/matches/1/live",
      navigatorObject: { share },
      windowObject: windowObject(),
    });
    expect(result).toBe("shared");
    expect(share).toHaveBeenCalledWith(
      expect.objectContaining({ url: "http://localhost:5173/matches/1/live" }),
    );
  });

  it("copies when native share is unavailable", async () => {
    const writeText = vi.fn().mockResolvedValue();
    const result = await sharePublicResource({
      title: "Team",
      text: "Profile",
      path: "/teams/kiet",
      navigatorObject: { clipboard: { writeText } },
      windowObject: windowObject(),
    });
    expect(result).toBe("copied");
    expect(writeText).toHaveBeenCalledWith("http://localhost:5173/teams/kiet");
  });

  it("offers manual copy without crashing when clipboard access fails", async () => {
    const currentWindow = windowObject();
    const result = await sharePublicResource({
      title: "Player",
      text: "Profile",
      path: "/players/1",
      navigatorObject: {
        clipboard: {
          writeText: vi.fn().mockRejectedValue(new Error("denied")),
        },
      },
      windowObject: currentWindow,
    });
    expect(result).toBe("manual");
    expect(currentWindow.prompt).toHaveBeenCalled();
  });
});
