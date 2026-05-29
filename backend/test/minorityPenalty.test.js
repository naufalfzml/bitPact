require("./_env");

const { test } = require("node:test");
const assert = require("node:assert/strict");
const { applyMinorityPenalty } = require("../routes/events");

function createSupabaseInsertMock() {
  const calls = [];

  return {
    calls,
    from(table) {
      assert.equal(table, "reputation_tracking");
      return {
        insert: async (payload) => {
          calls.push(payload);
          return { data: payload, error: null };
        },
      };
    },
  };
}

test("minority penalty uses regenerated HP as the new penalty base", async () => {
  const db = createSupabaseInsertMock();

  const newScore = await applyMinorityPenalty("event-123", "0xabc", {
    supabase: db,
    getRegeneratedReputation: async () => ({ current_hp: 97 }),
  });

  assert.equal(newScore, 87);
  assert.deepEqual(db.calls[0], {
    wallet_address: "0xabc",
    event_id: "event-123",
    was_minority: true,
    reputation_score: 87,
  });
});

test("minority penalty stores the address lowercased (matches HP lookups)", async () => {
  const db = createSupabaseInsertMock();
  const seenByLookup = [];

  // votes.voter_address is mixed-case (as the wallet submits it). The penalty
  // row MUST be stored lowercase so getRegeneratedReputation (which lowercases
  // its lookup) can find it — otherwise HP never drops.
  const MIXED = "0xAbC123DeF";

  await applyMinorityPenalty("event-789", MIXED, {
    supabase: db,
    getRegeneratedReputation: async (addr) => {
      seenByLookup.push(addr);
      return { current_hp: 100 };
    },
  });

  // Lookup was performed with the lowercased address...
  assert.equal(seenByLookup[0], MIXED.toLowerCase());
  // ...and the stored row is lowercased too.
  assert.equal(db.calls[0].wallet_address, MIXED.toLowerCase());
  assert.equal(db.calls[0].reputation_score, 90);
});

test("minority penalty clamps regenerated HP at zero", async () => {
  const db = createSupabaseInsertMock();

  const newScore = await applyMinorityPenalty("event-456", "0xdef", {
    supabase: db,
    getRegeneratedReputation: async () => ({ current_hp: 5 }),
  });

  assert.equal(newScore, 0);
  assert.equal(db.calls[0].reputation_score, 0);
});
