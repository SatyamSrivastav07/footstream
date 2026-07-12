import assert from "node:assert/strict";
import { renderToStaticMarkup } from "react-dom/server";
import { test } from "vitest";
import InstagramFollowButton, {
  instagramFollowAction,
} from "./InstagramFollowButton.jsx";

const team = {
  name: "Foot Stream FC",
  socialLinks: {
    instagram: "https://www.instagram.com/footstreamfc/",
  },
};

test("valid Instagram URL renders a prominent accessible follow action", () => {
  const html = renderToStaticMarkup(<InstagramFollowButton team={team} />);
  assert.match(html, /Follow Foot Stream FC on Instagram/);
  assert.match(html, /href="https:\/\/www\.instagram\.com\/footstreamfc\/"/);
  assert.match(html, /target="_blank"/);
  assert.match(html, /rel="noopener noreferrer"/);
  assert.match(html, /aria-label="Follow Foot Stream FC on Instagram in a new tab"/);
});

test("missing Instagram URL hides the follow action", () => {
  assert.equal(instagramFollowAction({ name: "Foot Stream FC" }), null);
  assert.equal(
    renderToStaticMarkup(<InstagramFollowButton team={{ name: "Foot Stream FC" }} />),
    "",
  );
});

test("invalid or non-Instagram URL hides the follow action", () => {
  assert.equal(
    instagramFollowAction({
      name: "Foot Stream FC",
      socialLinks: { instagram: "https://example.com/footstreamfc" },
    }),
    null,
  );
  assert.equal(
    instagramFollowAction({
      name: "Foot Stream FC",
      socialLinks: { instagram: "not-a-url" },
    }),
    null,
  );
});
