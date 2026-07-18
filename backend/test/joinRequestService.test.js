import test from "node:test";
import assert from "node:assert/strict";
import { Buffer } from "node:buffer";
import { validationResult } from "express-validator";
import {
  approveJoinRequest,
  getJoinRequestStatus,
  listJoinRequestsForTeam,
  normalizePhone,
  publicStatusResponse,
  rejectJoinRequest,
  submitJoinRequest,
} from "../src/services/joinRequestService.js";
import { validateOptionalJoinRequestImageSignature } from "../src/middleware/photoUpload.js";
import { submitJoinRequestValidator } from "../src/validators/joinRequestValidators.js";

const jpeg = Buffer.from([0xff, 0xd8, 0xff, 0x00]);
const png = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
const webp = Buffer.from("RIFFxxxxWEBP");
const team = { _id: "team1", name: "FC KIET", slug: "fc-kiet", isPublished: true, isArchived: false, acceptingJoinRequests: true };
const input = {
  applicantName: "Satyam",
  position: "ST",
  age: 20,
  academicYear: "2nd Year",
  preferredFoot: "Right",
  email: "SATYAM@EXAMPLE.COM",
  phone: "+91 98765 43210",
  shortBio: "Forward",
  previousExperience: "School team",
  motivation: "I want to compete.",
  highlightsUrl: "https://example.com/highlights",
};
const file = (overrides = {}) => ({ buffer: jpeg, size: jpeg.length, mimetype: "image/jpeg", ...overrides });
const storage = (calls = []) => ({
  upload: async () => {
    calls.push(["upload"]);
    return { secure_url: "https://res.cloudinary.com/join/photo.jpg", public_id: "join-public-id", width: 400, height: 400, format: "jpg", bytes: 1234 };
  },
  destroy: async (publicId) => {
    calls.push(["destroy", publicId]);
    return { result: "ok" };
  },
});
const teamModel = (value = team) => ({ findOne: async () => value });
const requestDocument = (overrides = {}) => ({
  _id: "request1",
  team: "team1",
  requestCode: "FS-ABC123",
  status: "pending",
  applicantName: "Satyam",
  position: "ST",
  age: 20,
  academicYear: "2nd Year",
  preferredFoot: "Right",
  email: "satyam@example.com",
  phone: "+919876543210",
  photo: null,
  shortBio: "",
  previousExperience: "",
  motivation: "",
  highlightsUrl: "",
  createdAt: new Date("2030-01-01"),
  save: async function save() { return this; },
  toObject: function toObject() { return { ...this }; },
  ...overrides,
});
const requestModel = ({ exists = null, created = requestDocument(), found = requestDocument() } = {}) => ({
  exists: async () => exists,
  create: async (data) => ({ ...created, ...data, _id: "request1", createdAt: new Date("2030-01-01") }),
  findOne: () => ({
    populate: () => ({ lean: async () => found }),
    lean: async () => found,
    then: (resolve) => resolve(found),
  }),
  find: () => ({ sort: () => ({ skip: () => ({ limit: () => ({ lean: async () => [found] }) }) }) }),
  countDocuments: async () => 1,
  aggregate: async () => [{ _id: "pending", count: 1 }],
});
const playerModel = ({ exists = null, player = { _id: "player1" } } = {}) => ({
  exists: async () => exists,
  create: async (data) => ({ ...player, ...data }),
});

const validateFile = async (value) =>
  new Promise((resolve) => validateOptionalJoinRequestImageSignature({ file: value }, {}, (error) => resolve(error || null)));

const runValidators = async (body) => {
  const req = { body, params: { teamSlug: "fc-kiet" }, query: {} };
  await Promise.all(submitJoinRequestValidator.map((validator) => validator.run(req)));
  return validationResult(req).array();
};

test("join request photo validation accepts JPEG PNG and WebP and rejects invalid signatures", async () => {
  assert.equal(await validateFile(file({ buffer: jpeg, mimetype: "image/jpeg" })), null);
  assert.equal(await validateFile(file({ buffer: png, mimetype: "image/png" })), null);
  assert.equal(await validateFile(file({ buffer: webp, mimetype: "image/webp" })), null);
  assert.equal((await validateFile(file({ buffer: Buffer.from("nope") }))).code, "INVALID_JOIN_REQUEST_PHOTO_CONTENT");
});

test("public join request validator rejects applicant jersey and protected fields", async () => {
  const errors = await runValidators({ ...input, jerseyNumber: 9, status: "approved", publicId: "secret" });
  assert.ok(errors.some((error) => error.msg.includes("Protected join request fields")));
});

test("published team accepts request and response hides contact and Cloudinary metadata", async () => {
  const data = await submitJoinRequest({
    teamModel: teamModel(),
    requestModel: requestModel(),
    storage: storage(),
    teamSlug: "fc-kiet",
    input,
    file: file(),
  });
  assert.equal(data.requestCode.startsWith("FS-"), true);
  assert.equal(data.status, "pending");
  assert.equal(data.team.slug, "fc-kiet");
  assert.equal(data.email, undefined);
  assert.equal(data.phone, undefined);
  assert.equal(data.photo, undefined);
});

test("private archived disabled and duplicate pending requests are rejected", async () => {
  await assert.rejects(submitJoinRequest({ teamModel: teamModel(null), requestModel: requestModel(), storage: storage(), teamSlug: "missing", input }), (error) => error.code === "TEAM_NOT_FOUND");
  await assert.rejects(submitJoinRequest({ teamModel: teamModel({ ...team, acceptingJoinRequests: false }), requestModel: requestModel(), storage: storage(), teamSlug: "fc-kiet", input }), (error) => error.code === "JOIN_REQUESTS_CLOSED");
  await assert.rejects(submitJoinRequest({ teamModel: teamModel(), requestModel: requestModel({ exists: { _id: "existing" } }), storage: storage(), teamSlug: "fc-kiet", input }), (error) => error.code === "JOIN_REQUEST_DUPLICATE");
});

test("database failure after photo upload cleans new Cloudinary asset", async () => {
  const calls = [];
  await assert.rejects(submitJoinRequest({
    teamModel: teamModel(),
    requestModel: { exists: async () => null, create: async () => { throw new Error("db failed"); } },
    storage: storage(calls),
    teamSlug: "fc-kiet",
    input,
    file: file(),
  }));
  assert.deepEqual(calls, [["upload"], ["destroy", "join-public-id"]]);
});

test("status lookup returns safe public data only", async () => {
  const data = publicStatusResponse({ ...requestDocument({ status: "approved", reviewedAt: new Date("2030-01-02"), createdPlayer: "player1" }), team });
  assert.equal(data.email, undefined);
  assert.equal(data.phone, undefined);
  assert.equal(data.reviewedBy, undefined);
  assert.equal(data.approvalData, undefined);
  assert.equal(data.createdPlayerPath, "/players/player1");
  const lookedUp = await getJoinRequestStatus({ requestModel: requestModel({ found: { ...requestDocument(), team } }), requestCode: "FS-ABC123" });
  assert.equal(lookedUp.requestCode, "FS-ABC123");
});

test("approval creates player with admin jersey and applicant photo metadata", async () => {
  const request = requestDocument({ photo: { imageUrl: "https://res.cloudinary.com/join/photo.jpg", publicId: "join-public-id" } });
  const data = await approveJoinRequest({
    requestModel: requestModel({ found: request }),
    playerModel: playerModel(),
    teamId: "team1",
    requestId: "request1",
    userId: "user1",
    input: { jerseyNumber: 9, availabilityStatus: "available", isCaptain: false, isViceCaptain: false },
  });
  assert.equal(data.player.team, "team1");
  assert.equal(data.player.jerseyNumber, 9);
  assert.equal(data.player.photo.publicId, "join-public-id");
  assert.equal(request.status, "approved");
  assert.equal(String(request.createdPlayer), "player1");
});

test("approval enforces jersey and leadership rules and double review is rejected", async () => {
  await assert.rejects(approveJoinRequest({
    requestModel: requestModel({ found: requestDocument() }),
    playerModel: playerModel({ exists: { _id: "player2" } }),
    teamId: "team1",
    requestId: "request1",
    userId: "user1",
    input: { jerseyNumber: 9 },
  }), (error) => error.code === "JERSEY_IN_USE");
  await assert.rejects(approveJoinRequest({
    requestModel: requestModel({ found: requestDocument({ status: "approved" }) }),
    playerModel: playerModel(),
    teamId: "team1",
    requestId: "request1",
    userId: "user1",
    input: { jerseyNumber: 9 },
  }), (error) => error.code === "JOIN_REQUEST_NOT_PENDING");
});

test("rejection saves reason, creates no player, and cleans applicant photo", async () => {
  const calls = [];
  const request = requestDocument({ photo: { imageUrl: "https://res.cloudinary.com/join/photo.jpg", publicId: "join-public-id" } });
  const data = await rejectJoinRequest({
    requestModel: requestModel({ found: request }),
    storage: storage(calls),
    teamId: "team1",
    requestId: "request1",
    userId: "user1",
    rejectionReason: "Roster full",
  });
  assert.equal(data.status, "rejected");
  assert.equal(data.rejectionReason, "Roster full");
  assert.equal(request.photo, "");
  assert.deepEqual(calls, [["destroy", "join-public-id"]]);
});

test("phone normalization keeps a public-safe canonical duplicate key", () => {
  assert.equal(normalizePhone("+91 (98765) 43210"), "+919876543210");
});

test("all-status join requests are newest first so newer pending applications stay on page one", async () => {
  const rows = [
    requestDocument({ _id: "pending-new-1", status: "pending", createdAt: new Date("2031-01-03") }),
    requestDocument({ _id: "pending-new-2", status: "pending", createdAt: new Date("2031-01-02") }),
    requestDocument({ _id: "pending-new-3", status: "pending", createdAt: new Date("2031-01-01") }),
    ...Array.from({ length: 19 }, (_, index) => requestDocument({ _id: `approved-${index}`, status: "approved", createdAt: new Date(`2030-12-${String(20 - index).padStart(2, "0")}`) })),
  ];
  let sortSpec = null;
  const model = {
    find: () => ({
      sort: (spec) => {
        sortSpec = spec;
        return {
          skip: () => ({
            limit: (limit) => ({
              lean: async () => [...rows]
                .sort((a, b) => b.createdAt - a.createdAt || String(b._id).localeCompare(String(a._id)))
                .slice(0, limit),
            }),
          }),
        };
      },
    }),
    countDocuments: async () => rows.length,
    aggregate: async () => [
      { _id: "pending", count: 3 },
      { _id: "approved", count: 19 },
    ],
  };
  const data = await listJoinRequestsForTeam({ requestModel: model, teamId: "team1", query: { page: 1, limit: 20 } });
  assert.deepEqual(sortSpec, { createdAt: -1, _id: -1 });
  assert.equal(data.requests.filter((request) => request.status === "pending").length, 3);
  assert.equal(data.pagination.total, 22);
});
