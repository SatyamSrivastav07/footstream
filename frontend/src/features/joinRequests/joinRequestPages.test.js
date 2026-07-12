import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "vitest";

test("public join form has no jersey input while approval UI does", () => {
  const publicJoinPage = readFileSync(new URL("../../pages/PublicJoinTeamPage.jsx", import.meta.url), "utf8");
  const teamAdminDetailsPage = readFileSync(new URL("../../pages/TeamJoinRequestDetailsPage.jsx", import.meta.url), "utf8");
  assert.doesNotMatch(publicJoinPage, /jerseyNumber|Jersey Number|Official Jersey/);
  assert.match(teamAdminDetailsPage, /Official Jersey Number/);
  assert.match(teamAdminDetailsPage, /jerseyNumber/);
});
