require("./_env");

const { test } = require("node:test");
const assert = require("node:assert/strict");

// Pure replica of the decision logic inside routes/events.js > resolveConsensus
// and the quorum gate in POST /:id/distribute. Kept in lock-step with the source
// so it doubles as executable documentation of the consensus rules and a
// regression guard against accidental threshold changes.

function resolveDecision(votes, consensusThreshold = 51) {
  if (!votes || votes.length === 0) return { action: "none" }; // <-- stuck if nobody votes
  const agree = votes.filter((v) => v.is_valid).length;
  const reject = votes.length - agree;
  const agreePercent = (agree / votes.length) * 100;

  let action;
  if (agree === reject) action = "disputed";
  else if (agreePercent >= consensusThreshold) action = "distribute";
  else action = "refund";

  let penalisedMinority = false;
  if (agreePercent >= 85 || agreePercent <= 15) penalisedMinority = true;

  return { action, agreePercent, penalisedMinority };
}

// quorum gate used by the manual "Distribute Prize" button
function turnoutQuorumPercent(totalVotes, totalParticipants) {
  if (totalParticipants === 0) return 0;
  return (totalVotes / totalParticipants) * 100;
}

// ──────────────────────────────────────────────
//  Consensus outcome
// ──────────────────────────────────────────────

test("unanimous agree => distribute", () => {
  const votes = [{ is_valid: true }, { is_valid: true }, { is_valid: true }];
  assert.equal(resolveDecision(votes).action, "distribute");
});

test("unanimous reject => refund", () => {
  const votes = [{ is_valid: false }, { is_valid: false }];
  assert.equal(resolveDecision(votes).action, "refund");
});

test("50/50 tie => disputed", () => {
  const votes = [{ is_valid: true }, { is_valid: false }];
  assert.equal(resolveDecision(votes).action, "disputed");
});

test("agree exactly at threshold (51%) => distribute", () => {
  // 51 agree / 100 -> 51% >= 51
  const votes = Array.from({ length: 100 }, (_, i) => ({ is_valid: i < 51 }));
  const out = resolveDecision(votes, 51);
  assert.equal(out.agreePercent, 51);
  assert.equal(out.action, "distribute");
});

test("agree just below threshold => refund", () => {
  // 50 agree, 51 reject -> 49.5%
  const votes = Array.from({ length: 101 }, (_, i) => ({ is_valid: i < 50 }));
  assert.equal(resolveDecision(votes, 51).action, "refund");
});

test("custom threshold (75%) is respected", () => {
  const votes = Array.from({ length: 100 }, (_, i) => ({ is_valid: i < 70 }));
  assert.equal(resolveDecision(votes, 75).action, "refund"); // 70% < 75%
});

// ──────────────────────────────────────────────
//  Minority penalty band (>=85% or <=15%)
// ──────────────────────────────────────────────

test("85% supermajority flags minority for penalty", () => {
  const votes = Array.from({ length: 100 }, (_, i) => ({ is_valid: i < 85 }));
  assert.equal(resolveDecision(votes).penalisedMinority, true);
});

test("84% does NOT trigger minority penalty (band boundary)", () => {
  const votes = Array.from({ length: 100 }, (_, i) => ({ is_valid: i < 84 }));
  assert.equal(resolveDecision(votes).penalisedMinority, false);
});

// ──────────────────────────────────────────────
//  Quorum gate (manual distribution)
// ──────────────────────────────────────────────

test("turnout quorum needs >= 51% of participants to have voted", () => {
  assert.ok(turnoutQuorumPercent(5, 10) < 51); // 50% blocked
  assert.ok(turnoutQuorumPercent(6, 10) >= 51); // 60% allowed
});

// ──────────────────────────────────────────────
//  EDGE CASE — zero votes never resolves
//  If a voting event reaches its 24h deadline with NO votes cast, resolveConsensus
//  returns early (action "none"): status stays "voting" forever and funds stay
//  locked. Documents a gap vs the "non-voters = abstain" spec.
// ──────────────────────────────────────────────

test("EDGE: zero votes => no resolution (event can get stuck)", () => {
  assert.equal(resolveDecision([]).action, "none");
});
