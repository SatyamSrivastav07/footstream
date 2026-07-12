import assert from "node:assert/strict";
import { renderToStaticMarkup } from "react-dom/server";
import { test } from "vitest";
import PlayerPhotoUploader, { validatePlayerPhotoFile } from "./PlayerPhotoUploader.jsx";

const player = {
  _id: "player1",
  name: "Satyam",
  photoUrl: "https://res.cloudinary.com/demo/player.jpg",
};

test("player photo uploader renders preview and direct upload controls", () => {
  const html = renderToStaticMarkup(<PlayerPhotoUploader player={player} />);
  assert.match(html, /Player photo/);
  assert.match(html, /Choose image/);
  assert.match(html, /Replace/);
  assert.match(html, /Remove/);
  assert.match(html, /https:\/\/res\.cloudinary\.com\/demo\/player\.jpg/);
});

test("player photo validation accepts supported images and rejects invalid choices", () => {
  assert.equal(validatePlayerPhotoFile({ type: "image/jpeg", size: 1024 }), "");
  assert.equal(validatePlayerPhotoFile({ type: "image/png", size: 1024 }), "");
  assert.equal(validatePlayerPhotoFile({ type: "image/webp", size: 1024 }), "");
  assert.match(validatePlayerPhotoFile({ type: "image/gif", size: 1024 }), /JPEG, PNG, or WebP/);
  assert.match(validatePlayerPhotoFile({ type: "image/jpeg", size: 3 * 1024 * 1024 + 1 }), /3.00 MB/);
});
