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

test("minority penalty clamps regenerated HP at zero", async () => {
  const db = createSupabaseInsertMock();

  const newScore = await applyMinorityPenalty("event-456", "0xdef", {
    supabase: db,
    getRegeneratedReputation: async () => ({ current_hp: 5 }),
  });

  assert.equal(newScore, 0);
  assert.equal(db.calls[0].reputation_score, 0);
});
