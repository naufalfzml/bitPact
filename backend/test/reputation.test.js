require("./_env");

const { test, beforeEach } = require("node:test");
const assert = require("node:assert/strict");

// We exercise the REAL getRegeneratedReputation by stubbing the shared supabase
// singleton's query builder. reputationHelper imports { supabase } from
// ./supabase by reference, so replacing supabase.from here is picked up.
const supabaseModule = require("../lib/supabase");

// Build a chainable stub whose terminal .maybeSingle() resolves to `result`.
function stubLatestEntry(result) {
  const chain = {
    select: () => chain,
    eq: () => chain,
    order: () => chain,
    limit: () => chain,
    maybeSingle: async () => result,
  };
  supabaseModule.supabase.from = () => chain;
}

// Force a known regen interval for deterministic math.
process.env.REGEN_INTERVAL_MS = "60000"; // 1 HP per 60s
delete require.cache[require.resolve("../lib/reputationHelper")];
const { getRegeneratedReputation } = require("../lib/reputationHelper");

beforeEach(() => {
  // default: no penalty rows
  stubLatestEntry({ data: null, error: null });
});

test("no reputation history => full 100 HP", async () => {
  stubLatestEntry({ data: null, error: null });
  const rep = await getRegeneratedReputation("0xABC");
  assert.equal(rep.current_hp, 100);
  assert.equal(rep.base_score, 100);
  assert.equal(rep.latest_penalty_at, null);
});

test("fresh penalty (no elapsed time) => base score, no regen", async () => {
  stubLatestEntry({
    data: { reputation_score: 70, created_at: new Date().toISOString() },
    error: null,
  });
  const rep = await getRegeneratedReputation("0xABC");
  assert.equal(rep.base_score, 70);
  assert.equal(rep.points_gained, 0);
  assert.equal(rep.current_hp, 70);
});

test("regenerates +1 HP per interval since the penalty", async () => {
  const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();
  stubLatestEntry({
    data: { reputation_score: 70, created_at: fiveMinutesAgo },
    error: null,
  });
  const rep = await getRegeneratedReputation("0xABC");
  assert.equal(rep.points_gained, 5); // 5 intervals
  assert.equal(rep.current_hp, 75); // 70 + 5
});

test("HP is capped at 100 even after long recovery", async () => {
  const longAgo = new Date(Date.now() - 999 * 60 * 1000).toISOString();
  stubLatestEntry({
    data: { reputation_score: 60, created_at: longAgo },
    error: null,
  });
  const rep = await getRegeneratedReputation("0xABC");
  assert.equal(rep.current_hp, 100);
});

test("registration guard threshold (HP < 50) — penalised user is blocked", async () => {
  // One -10 penalty from 100 lands at 90 (>=50), so a SINGLE minority vote
  // never blocks a user. It takes >=6 stacked penalties (100 -> 40) to drop
  // below the 50 guard used in POST /:id/register. Documents the gameplay tuning.
  const justNow = new Date().toISOString();
  stubLatestEntry({ data: { reputation_score: 40, created_at: justNow }, error: null });
  const rep = await getRegeneratedReputation("0xABC");
  assert.ok(rep.current_hp < 50, "40 HP should be below the 50 registration guard");
});
