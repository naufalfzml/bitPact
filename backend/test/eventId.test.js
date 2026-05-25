require("./_env");

const { test } = require("node:test");
const assert = require("node:assert/strict");

const { uuidToBytes32 } = require("../lib/blockchain");
// Frontend hashing primitives (the app uses keccak256(stringToBytes(event.id)))
const { keccak256, stringToBytes, toHex } = require("viem");

// The whole on-chain flow depends on the backend and the frontend hashing a
// tournament's UUID to the SAME bytes32 eventId. The backend uses
// keccak256(toHex(uuid)); the frontend uses keccak256(stringToBytes(event.id)).
// These MUST agree or createEvent / register / distribute target different keys.

const SAMPLE_UUID = "a1b2c3d4-e5f6-7890-abcd-ef0123456789";

test("uuidToBytes32 is deterministic", () => {
  assert.equal(uuidToBytes32(SAMPLE_UUID), uuidToBytes32(SAMPLE_UUID));
});

test("uuidToBytes32 produces a 32-byte (66-char) hex string", () => {
  const out = uuidToBytes32(SAMPLE_UUID);
  assert.match(out, /^0x[0-9a-f]{64}$/);
});

test("backend keccak256(toHex(uuid)) == frontend keccak256(stringToBytes(uuid))", () => {
  const backend = uuidToBytes32(SAMPLE_UUID);
  const frontend = keccak256(stringToBytes(SAMPLE_UUID));
  assert.equal(
    backend,
    frontend,
    "eventId hash mismatch between backend and frontend — on-chain flow would break"
  );
});

test("hashing agreement holds across many random UUID-like strings", () => {
  for (let i = 0; i < 200; i++) {
    const id = `${Math.random().toString(16).slice(2)}-${i}-${Date.now()}`;
    assert.equal(uuidToBytes32(id), keccak256(stringToBytes(id)));
  }
});

test("different UUIDs hash to different eventIds (collision sanity)", () => {
  assert.notEqual(uuidToBytes32("event-A"), uuidToBytes32("event-B"));
});

test("toHex(uuid) is the UTF-8 hex the backend feeds keccak256", () => {
  // documents WHY the two formulations agree: keccak256 treats the hex
  // string and the equivalent byte array identically.
  assert.equal(toHex("abc"), "0x616263");
  assert.equal(keccak256(toHex("abc")), keccak256(stringToBytes("abc")));
});
