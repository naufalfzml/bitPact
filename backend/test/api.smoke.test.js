require("./_env");

const { test, before, after } = require("node:test");
const assert = require("node:assert/strict");
const http = require("node:http");
const express = require("express");
const cors = require("cors");
const eventsRouter = require("../routes/events");
const { getStartBracketGuardError } = eventsRouter;

// Smoke-test the REAL Express routers (mounted exactly like index.js) without
// starting the cron scheduler or binding a fixed port. We only hit endpoints
// whose validation guards short-circuit BEFORE any Supabase/RPC call, so the
// suite runs fully offline and asserts the API contract + guard logic.

let server;
let baseUrl;

before(async () => {
  const app = express();
  app.use(cors());
  app.use(express.json());
  app.use("/api/events", eventsRouter);
  app.use("/api/reputation", require("../routes/reputation"));
  app.use("/api/social-connect", require("../routes/socialConnect"));
  app.get("/api/health", (_req, res) =>
    res.json({ status: "ok", service: "bitpact-backend" })
  );

  await new Promise((resolve) => {
    server = app.listen(0, () => {
      baseUrl = `http://127.0.0.1:${server.address().port}`;
      resolve();
    });
  });
});

after(async () => {
  await new Promise((resolve) => server.close(resolve));
});

function post(path, body) {
  return fetch(`${baseUrl}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body ?? {}),
  });
}

// ──────────────────────────────────────────────
//  Health
// ──────────────────────────────────────────────

test("GET /api/health => 200 ok", async () => {
  const res = await fetch(`${baseUrl}/api/health`);
  assert.equal(res.status, 200);
  const json = await res.json();
  assert.equal(json.status, "ok");
});

// ──────────────────────────────────────────────
//  POST /api/events — create validation guards
// ──────────────────────────────────────────────

test("create event without required fields => 400", async () => {
  const res = await post("/api/events", { title: "Only Title" });
  assert.equal(res.status, 400);
  assert.match((await res.json()).error, /Missing required fields/);
});

test("create event with invalid game_mode => 400", async () => {
  const res = await post("/api/events", {
    title: "T",
    ticket_price: 1,
    creator_address: "0xabc",
    game_mode: "battle-royale",
  });
  assert.equal(res.status, 400);
  assert.match((await res.json()).error, /game_mode/);
});

test("create event with invalid access_type => 400", async () => {
  const res = await post("/api/events", {
    title: "T",
    ticket_price: 1,
    creator_address: "0xabc",
    access_type: "secret-handshake",
  });
  assert.equal(res.status, 400);
  assert.match((await res.json()).error, /access_type/);
});

test("password event without a password => 400", async () => {
  const res = await post("/api/events", {
    title: "T",
    ticket_price: 1,
    creator_address: "0xabc",
    access_type: "password",
  });
  assert.equal(res.status, 400);
  assert.match((await res.json()).error, /Password is required/);
});

// ──────────────────────────────────────────────
//  Registration / vote / lifecycle input guards
// ──────────────────────────────────────────────

test("register without wallet_address/tx_hash => 400", async () => {
  const res = await post("/api/events/some-id/register", { wallet_address: "0xabc" });
  assert.equal(res.status, 400);
  assert.match((await res.json()).error, /Missing wallet_address or tx_hash/);
});

test("vote input guards reject missing voter_address and non-boolean is_valid", async () => {
  const res = await post("/api/events/some-id/vote", { voter_address: "0xabc" });
  assert.equal(res.status, 400);
  assert.match((await res.json()).error, /is_valid/);

  const invalidTypeRes = await post("/api/events/some-id/vote", {
    voter_address: "0xabc",
    is_valid: "yes",
  });
  assert.equal(invalidTypeRes.status, 400);
});

test("select-game-mode with invalid mode => 400", async () => {
  const res = await post("/api/events/some-id/select-game-mode", {
    creator_address: "0xabc",
    game_mode: "nope",
  });
  assert.equal(res.status, 400);
  assert.match((await res.json()).error, /game_mode/);
});

test("start bracket guard allows ffa without brackets but blocks 1v1", () => {
  assert.equal(getStartBracketGuardError({ game_mode: "ffa" }, []), null);
  assert.match(
    getStartBracketGuardError({ game_mode: "1v1" }, []),
    /Bracket draft has not been generated/
  );
});

test("draft-bracket with non-array matches => 400", async () => {
  const res = await post("/api/events/some-id/draft-bracket", {
    creator_address: "0xabc",
    matches: "not-an-array",
  });
  assert.equal(res.status, 400);
  assert.match((await res.json()).error, /matches/);
});

test("end event without winners => 400", async () => {
  const res = await post("/api/events/some-id/end", { winners: [] });
  assert.equal(res.status, 400);
  assert.match((await res.json()).error, /winners/);
});

test("appeal without revised winners => 400", async () => {
  const res = await post("/api/events/some-id/appeal", {});
  assert.equal(res.status, 400);
});

test("bracket/advance without match_id/winner => 400", async () => {
  const res = await post("/api/events/some-id/bracket/advance", { match_id: "x" });
  assert.equal(res.status, 400);
});

test("whitelist add without addresses => 400", async () => {
  const res = await post("/api/events/some-id/whitelist", { wallet_address: "0xabc" });
  assert.equal(res.status, 400);
});

test("remove-participant without fields => 400", async () => {
  const res = await post("/api/events/some-id/remove-participant", {});
  assert.equal(res.status, 400);
});

test("retry-settlement without caller_address => 400", async () => {
  const res = await post("/api/events/some-id/retry-settlement", {});
  assert.equal(res.status, 400);
  assert.match((await res.json()).error, /caller_address/);
});

test("whitelist check without ?wallet => 400", async () => {
  const res = await fetch(`${baseUrl}/api/events/some-id/whitelist/check`);
  assert.equal(res.status, 400);
});

// ──────────────────────────────────────────────
//  Social Connect guard
// ──────────────────────────────────────────────

test("social-connect lookup without identifier => 400", async () => {
  const res = await post("/api/social-connect/lookup", {});
  assert.equal(res.status, 400);
  assert.match((await res.json()).error, /identifier/);
});
