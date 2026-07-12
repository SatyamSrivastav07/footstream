import test from "node:test";
import assert from "node:assert/strict";
import { Buffer } from "node:buffer";
import { validatePlayerImageSignature } from "../src/middleware/photoUpload.js";
import { playerPhotoUrl, removePlayerPhoto, uploadPlayerPhoto } from "../src/services/playerPhotoService.js";

const jpeg = Buffer.from([0xff, 0xd8, 0xff, 0x00]);
const png = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
const webp = Buffer.from("RIFFxxxxWEBP");

const file = (overrides = {}) => ({
  buffer: jpeg,
  size: jpeg.length,
  mimetype: "image/jpeg",
  originalname: "player.jpg",
  ...overrides,
});

const validateFile = async (value) =>
  new Promise((resolve) => {
    validatePlayerImageSignature({ file: value }, {}, (error) => resolve(error || null));
  });

const playerModelFor = (player, capture = () => {}) => ({
  findOne: async (filter) => {
    capture(filter);
    return player;
  },
});

const storage = (calls = []) => ({
  upload: async () => {
    calls.push(["upload"]);
    return { secure_url: "https://res.cloudinary.com/team/player.jpg", public_id: "new-player-public-id", width: 320, height: 320, format: "jpg", bytes: 1234 };
  },
  destroy: async (publicId) => {
    calls.push(["destroy", publicId]);
    return { result: "ok" };
  },
});

const matchModel = (calls = []) => ({
  updateMany: async (...args) => {
    calls.push(args);
    return { modifiedCount: 1 };
  },
});

test("player photo signature validation accepts JPEG PNG and WebP", async () => {
  assert.equal(await validateFile(file({ buffer: jpeg, mimetype: "image/jpeg" })), null);
  assert.equal(await validateFile(file({ buffer: png, mimetype: "image/png" })), null);
  assert.equal(await validateFile(file({ buffer: webp, mimetype: "image/webp" })), null);
});

test("player photo signature validation rejects missing or invalid content", async () => {
  assert.equal((await validateFile(null)).code, "PLAYER_PHOTO_REQUIRED");
  assert.equal((await validateFile(file({ buffer: Buffer.from("nope") }))).code, "INVALID_PLAYER_PHOTO_CONTENT");
});

test("valid player photo upload stores metadata and scopes by team", async () => {
  let filter;
  const calls = [];
  const player = { photo: "", photoUrl: "https://legacy/player.jpg", save: async () => {} };
  const data = await uploadPlayerPhoto({
    playerModel: playerModelFor(player, (value) => { filter = value; }),
    matchModel: matchModel(),
    storage: storage(calls),
    teamId: "team1",
    playerId: "player1",
    file: file(),
  });
  assert.deepEqual(filter, { _id: "player1", team: "team1" });
  assert.equal(player.photo.publicId, "new-player-public-id");
  assert.equal(player.photoUrl, "");
  assert.equal(data.photoUrl, "https://res.cloudinary.com/team/player.jpg");
  assert.equal(data.photo.publicId, undefined);
});

test("player photo upload rejects cross-team or missing players", async () => {
  await assert.rejects(
    uploadPlayerPhoto({ playerModel: playerModelFor(null), matchModel: matchModel(), storage: storage(), teamId: "team1", playerId: "other-player", file: file() }),
    (error) => error.code === "PLAYER_NOT_FOUND",
  );
});

test("player photo size limit is enforced before upload", async () => {
  await assert.rejects(
    uploadPlayerPhoto({ playerModel: playerModelFor({ save: async () => {} }), matchModel: matchModel(), storage: storage(), teamId: "team1", playerId: "player1", file: file({ size: 3 * 1024 * 1024 + 1 }) }),
    (error) => error.code === "PLAYER_PHOTO_TOO_LARGE",
  );
});

test("player photo replacement cleans old Cloudinary asset", async () => {
  const calls = [];
  const player = { photo: { publicId: "old-player-public-id", imageUrl: "old" }, photoUrl: "", save: async () => {} };
  await uploadPlayerPhoto({ playerModel: playerModelFor(player), matchModel: matchModel(), storage: storage(calls), teamId: "team1", playerId: "player1", file: file() });
  assert.deepEqual(calls, [["upload"], ["destroy", "old-player-public-id"]]);
});

test("player photo DB save failure removes newly uploaded asset", async () => {
  const calls = [];
  const player = { photo: "", photoUrl: "", save: async () => { throw new Error("db failed"); } };
  await assert.rejects(
    uploadPlayerPhoto({ playerModel: playerModelFor(player), matchModel: matchModel(), storage: storage(calls), teamId: "team1", playerId: "player1", file: file() }),
  );
  assert.deepEqual(calls, [["upload"], ["destroy", "new-player-public-id"]]);
});

test("player photo delete removes asset and clears metadata", async () => {
  const calls = [];
  const player = { photo: { publicId: "old-player-public-id", imageUrl: "old" }, photoUrl: "", save: async () => {} };
  const data = await removePlayerPhoto({ playerModel: playerModelFor(player), matchModel: matchModel(), storage: storage(calls), teamId: "team1", playerId: "player1" });
  assert.equal(player.photo, "");
  assert.equal(data.photoUrl, "");
  assert.deepEqual(calls, [["destroy", "old-player-public-id"]]);
});

test("player photo URL supports legacy strings and hides metadata", () => {
  assert.equal(playerPhotoUrl({ photoUrl: "https://legacy/player.jpg" }), "https://legacy/player.jpg");
  assert.equal(playerPhotoUrl({ photo: { imageUrl: "https://new/player.jpg", publicId: "private" } }), "https://new/player.jpg");
});

test("player photo upload syncs active match lineup snapshots", async () => {
  const snapshotCalls = [];
  const player = { photo: "", photoUrl: "", save: async () => {} };
  await uploadPlayerPhoto({
    playerModel: playerModelFor(player),
    matchModel: matchModel(snapshotCalls),
    storage: storage(),
    teamId: "team1",
    playerId: "player1",
    file: file(),
  });
  assert.equal(snapshotCalls.length, 3);
  assert.deepEqual(snapshotCalls[0][1], { $set: { "startingXI.$[player].photoUrl": "https://res.cloudinary.com/team/player.jpg" } });
  assert.deepEqual(snapshotCalls[1][1], { $set: { "substitutes.$[player].photoUrl": "https://res.cloudinary.com/team/player.jpg" } });
  assert.deepEqual(snapshotCalls[2][1], { $set: { "manOfTheMatch.photoUrl": "https://res.cloudinary.com/team/player.jpg" } });
});
