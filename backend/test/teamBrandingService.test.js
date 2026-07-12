import test from "node:test";
import assert from "node:assert/strict";
import { Buffer } from "node:buffer";
import {
  privateImage,
  publicImage,
  removeTeamBranding,
  uploadTeamBranding,
} from "../src/services/teamBrandingService.js";
import { validateTeamImageSignature } from "../src/middleware/photoUpload.js";

const jpeg = Buffer.from([0xff, 0xd8, 0xff, 0x00]);
const png = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
const webp = Buffer.from("RIFFxxxxWEBP");

const file = (overrides = {}) => ({
  buffer: jpeg,
  size: jpeg.length,
  mimetype: "image/jpeg",
  originalname: "logo.jpg",
  ...overrides,
});

const validateFile = async (value) =>
  new Promise((resolve) => {
    validateTeamImageSignature({ file: value }, {}, (error) => resolve(error || null));
  });

const teamModelFor = (team, capture = () => {}) => ({
  findOne: async (filter) => {
    capture(filter);
    return team;
  },
});

const storage = (calls = []) => ({
  upload: async () => {
    calls.push(["upload"]);
    return { secure_url: "https://res.cloudinary.com/team/logo.jpg", public_id: "new-public-id", width: 400, height: 400, format: "jpg", bytes: 1234 };
  },
  destroy: async (publicId) => {
    calls.push(["destroy", publicId]);
    return { result: "ok" };
  },
});

test("team branding signature validation accepts JPEG PNG and WebP", async () => {
  assert.equal(await validateFile(file({ buffer: jpeg, mimetype: "image/jpeg" })), null);
  assert.equal(await validateFile(file({ buffer: png, mimetype: "image/png" })), null);
  assert.equal(await validateFile(file({ buffer: webp, mimetype: "image/webp" })), null);
});

test("team branding rejects unsupported or invalid image content", async () => {
  assert.equal((await validateFile(file({ mimetype: "text/plain" }))).code, "INVALID_TEAM_IMAGE_CONTENT");
  assert.equal((await validateFile(file({ buffer: Buffer.from("nope") }))).code, "INVALID_TEAM_IMAGE_CONTENT");
});

test("valid logo upload stores metadata and uses own-team filter", async () => {
  let filter;
  const calls = [];
  const team = { logo: "", save: async () => {} };
  const data = await uploadTeamBranding({
    teamModel: teamModelFor(team, (value) => { filter = value; }),
    storage: storage(calls),
    teamId: "team1",
    kind: "logo",
    file: file(),
  });
  assert.deepEqual(filter, { _id: "team1", isArchived: false });
  assert.equal(team.logo.publicId, "new-public-id");
  assert.equal(data.image.imageUrl, "https://res.cloudinary.com/team/logo.jpg");
  assert.equal(data.image.publicId, undefined);
});

test("team-scoped branding upload rejects missing or cross-team resources", async () => {
  await assert.rejects(
    uploadTeamBranding({
      teamModel: teamModelFor(null),
      storage: storage(),
      teamId: "other-team",
      kind: "logo",
      file: file(),
    }),
    (error) => error.code === "TEAM_NOT_FOUND",
  );
});

test("branding upload rejects missing multipart image payload", async () => {
  await assert.rejects(
    uploadTeamBranding({
      teamModel: teamModelFor({ save: async () => {} }),
      storage: storage(),
      teamId: "team1",
      kind: "logo",
      file: null,
    }),
    (error) => error.code === "TEAM_IMAGE_REQUIRED",
  );
});

test("logo and cover size limits are enforced before upload", async () => {
  await assert.rejects(
    uploadTeamBranding({ teamModel: teamModelFor({ save: async () => {} }), storage: storage(), teamId: "team1", kind: "logo", file: file({ size: 2 * 1024 * 1024 + 1 }) }),
    (error) => error.code === "TEAM_IMAGE_TOO_LARGE",
  );
  await assert.rejects(
    uploadTeamBranding({ teamModel: teamModelFor({ save: async () => {} }), storage: storage(), teamId: "team1", kind: "coverPhoto", file: file({ size: 5 * 1024 * 1024 + 1 }) }),
    (error) => error.code === "TEAM_IMAGE_TOO_LARGE",
  );
});

test("replacement stores new asset and cleans old Cloudinary asset", async () => {
  const calls = [];
  const team = { logo: { publicId: "old-public-id", imageUrl: "old" }, save: async () => {} };
  await uploadTeamBranding({ teamModel: teamModelFor(team), storage: storage(calls), teamId: "team1", kind: "logo", file: file() });
  assert.deepEqual(calls, [["upload"], ["destroy", "old-public-id"]]);
});

test("database save failure removes newly uploaded asset", async () => {
  const calls = [];
  const team = { logo: "", save: async () => { throw new Error("db failed"); } };
  await assert.rejects(
    uploadTeamBranding({ teamModel: teamModelFor(team), storage: storage(calls), teamId: "team1", kind: "logo", file: file() }),
  );
  assert.deepEqual(calls, [["upload"], ["destroy", "new-public-id"]]);
});

test("delete removes Cloudinary asset and clears metadata", async () => {
  const calls = [];
  const team = { logo: { publicId: "old-public-id", imageUrl: "old" }, save: async () => {} };
  await removeTeamBranding({ teamModel: teamModelFor(team), storage: storage(calls), teamId: "team1", kind: "logo" });
  assert.equal(team.logo, "");
  assert.deepEqual(calls, [["destroy", "old-public-id"]]);
});

test("public image serialization hides publicId and supports legacy string URLs", () => {
  assert.deepEqual(publicImage("https://legacy/logo.png"), { imageUrl: "https://legacy/logo.png", width: 0, height: 0 });
  assert.deepEqual(publicImage({ imageUrl: "https://new/logo.png", publicId: "private", width: 12, height: 13 }), { imageUrl: "https://new/logo.png", width: 12, height: 13 });
  assert.equal(privateImage("https://legacy/logo.png"), null);
});
