import { describe, expect, it } from "vitest";
import {
  buildPublicUrl,
  buildSearchParams,
  cleanMetadataText,
  metadataValues,
  publicAppOrigin,
} from "./publicUrl.js";

describe("public URL and metadata helpers", () => {
  it("uses the configured public origin without a trailing slash", () => {
    expect(
      publicAppOrigin({
        configuredUrl: "https://footstream.example/",
        browserOrigin: "http://localhost:5173",
      }),
    ).toBe("https://footstream.example");
    expect(
      buildPublicUrl("/teams/kiet", {
        configuredUrl: "https://footstream.example/",
      }),
    ).toBe("https://footstream.example/teams/kiet");
  });

  it("falls back safely and removes markup from metadata text", () => {
    expect(
      publicAppOrigin({
        configuredUrl: "javascript:alert(1)",
        browserOrigin: "http://localhost:5173",
      }),
    ).toBe("http://localhost:5173");
    expect(cleanMetadataText("  <b>Kiet</b>   Football  ")).toBe(
      "bKiet/b Football",
    );
  });

  it("keeps public HTTPS images absolute and builds canonical values", () => {
    const values = metadataValues({
      title: "Kiet FC",
      description: "Public team",
      path: "/teams/kiet",
      image: "https://images.example/team.jpg",
    });
    expect(values.canonical).toContain("/teams/kiet");
    expect(values.image).toBe("https://images.example/team.jpg");
  });

  it("builds minimal synchronized search parameters", () => {
    expect(
      buildSearchParams({ q: "  Kiet  ", type: "players", page: 2 }).toString(),
    ).toBe("q=Kiet&type=players&page=2");
    expect(buildSearchParams({ q: "", type: "all", page: 1 }).toString()).toBe(
      "",
    );
  });
});
