require("./_env");

const { test } = require("node:test");
const assert = require("node:assert/strict");

const { generateNextRoundBrackets } = require("../routes/events");

// generateNextRoundBrackets must produce deterministic pairing regardless of
// the order Postgres returns the current round matches in. The bug being
// guarded here: without ORDER BY match_index, winners could be paired in
// arbitrary order and the bracket tree would diverge from the visual.

const EVENT_ID = "test-event-determinism";

const ALICE = "0xaa";
const BOB = "0xbb";
const CAROL = "0xcc";
const DAVE = "0xdd";

// Round 1 matches, in canonical (match_index ascending) order.
// winners by match_index: 0 -> ALICE, 1 -> BOB, 2 -> CAROL, 3 -> DAVE
const CANONICAL_ROUND_1 = [
  { match_index: 0, winner: ALICE },
  { match_index: 1, winner: BOB },
  { match_index: 2, winner: CAROL },
  { match_index: 3, winner: DAVE },
];

function expectPairing(brackets, [a, b, c, d]) {
  assert.equal(brackets.length, 2);
  assert.equal(brackets[0].match_index, 0);
  assert.equal(brackets[0].player_a, a);
  assert.equal(brackets[0].player_b, b);
  assert.equal(brackets[1].match_index, 1);
  assert.equal(brackets[1].player_a, c);
  assert.equal(brackets[1].player_b, d);
}

test("pairs winners by match_index ascending — canonical order", () => {
  const out = generateNextRoundBrackets(CANONICAL_ROUND_1, EVENT_ID, 2);
  expectPairing(out, [ALICE, BOB, CAROL, DAVE]);
});

test("pairs winners by match_index ascending — random DB return order", () => {
  // Postgres returns rows in [2, 0, 3, 1] order
  const scrambled = [
    { match_index: 2, winner: CAROL },
    { match_index: 0, winner: ALICE },
    { match_index: 3, winner: DAVE },
    { match_index: 1, winner: BOB },
  ];

  const out = generateNextRoundBrackets(scrambled, EVENT_ID, 2);

  // Pairing must STILL be (ALICE vs BOB) and (CAROL vs DAVE)
  expectPairing(out, [ALICE, BOB, CAROL, DAVE]);
});

test("pairs winners by match_index ascending — reverse order", () => {
  const reversed = [...CANONICAL_ROUND_1].reverse();
  const out = generateNextRoundBrackets(reversed, EVENT_ID, 2);
  expectPairing(out, [ALICE, BOB, CAROL, DAVE]);
});

test("odd number of winners gets a BYE on the last slot", () => {
  const threeMatches = [
    { match_index: 0, winner: ALICE },
    { match_index: 1, winner: BOB },
    { match_index: 2, winner: CAROL },
  ];
  const out = generateNextRoundBrackets(threeMatches, EVENT_ID, 2);

  assert.equal(out.length, 2);
  assert.equal(out[0].player_a, ALICE);
  assert.equal(out[0].player_b, BOB);
  assert.equal(out[1].player_a, CAROL);
  assert.equal(out[1].player_b, null); // BYE
});

test("propagates event_id and nextRound to every generated match", () => {
  const out = generateNextRoundBrackets(CANONICAL_ROUND_1, EVENT_ID, 5);

  for (const m of out) {
    assert.equal(m.event_id, EVENT_ID);
    assert.equal(m.round, 5);
  }
});

test("empty input produces empty output (no crash)", () => {
  assert.deepEqual(generateNextRoundBrackets([], EVENT_ID, 2), []);
  assert.deepEqual(generateNextRoundBrackets(undefined, EVENT_ID, 2), []);
  assert.deepEqual(generateNextRoundBrackets(null, EVENT_ID, 2), []);
});
