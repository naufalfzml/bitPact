require("./_env");

const { test } = require("node:test");
const assert = require("node:assert/strict");

const { resolveMyVote } = require("../routes/events");

const WALLET_A = "0xAaAaAaAaAaAaAaAaAaAaAaAaAaAaAaAaAaAaAaAa";
const WALLET_B = "0xBbBbBbBbBbBbBbBbBbBbBbBbBbBbBbBbBbBbBbBb";

test("resolveMyVote returns 'agree' when caller has voted true", () => {
  const votes = [
    { voter_address: WALLET_A, is_valid: true },
    { voter_address: WALLET_B, is_valid: false },
  ];
  assert.equal(resolveMyVote(votes, WALLET_A), "agree");
});

test("resolveMyVote returns 'reject' when caller has voted false", () => {
  const votes = [{ voter_address: WALLET_A, is_valid: false }];
  assert.equal(resolveMyVote(votes, WALLET_A), "reject");
});

test("resolveMyVote returns null when caller has not voted", () => {
  const votes = [{ voter_address: WALLET_A, is_valid: true }];
  assert.equal(resolveMyVote(votes, WALLET_B), null);
});

test("resolveMyVote is case-insensitive on the wallet address", () => {
  const votes = [{ voter_address: WALLET_A.toLowerCase(), is_valid: true }];
  assert.equal(resolveMyVote(votes, WALLET_A.toUpperCase()), "agree");
});

test("resolveMyVote returns null for missing/undefined wallet query", () => {
  const votes = [{ voter_address: WALLET_A, is_valid: true }];
  assert.equal(resolveMyVote(votes, null), null);
  assert.equal(resolveMyVote(votes, undefined), null);
  assert.equal(resolveMyVote(votes, ""), null);
});

test("resolveMyVote returns null on empty / non-array votes input", () => {
  assert.equal(resolveMyVote([], WALLET_A), null);
  assert.equal(resolveMyVote(null, WALLET_A), null);
  assert.equal(resolveMyVote(undefined, WALLET_A), null);
});

test("resolveMyVote tolerates malformed vote rows", () => {
  const votes = [
    { is_valid: true }, // missing voter_address
    { voter_address: null, is_valid: false },
    { voter_address: WALLET_A, is_valid: true },
  ];
  assert.equal(resolveMyVote(votes, WALLET_A), "agree");
});
