import assert from "node:assert/strict";
import { renderToStaticMarkup } from "react-dom/server";
import { test } from "vitest";
import TeamBrandingUploader, { brandingUrl } from "./TeamBrandingUploader.jsx";

test("brandingUrl supports legacy strings and uploaded metadata", () => {
  assert.equal(brandingUrl("https://legacy/logo.png"), "https://legacy/logo.png");
  assert.equal(brandingUrl({ imageUrl: "https://res.cloudinary.com/logo.png", publicId: "private" }), "https://res.cloudinary.com/logo.png");
  assert.equal(brandingUrl(null), "");
});

test("branding uploader renders preview and upload controls", () => {
  const html = renderToStaticMarkup(
    <TeamBrandingUploader kind="logo" initialImage={{ imageUrl: "https://res.cloudinary.com/logo.png" }} uploadUrl="/team/profile/logo" deleteUrl="/team/profile/logo" />,
  );
  assert.match(html, /Logo/);
  assert.match(html, /Upload/);
  assert.match(html, /https:\/\/res\.cloudinary\.com\/logo\.png/);
  assert.doesNotMatch(html, /private/);
});
