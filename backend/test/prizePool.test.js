require("./_env");

const { test } = require("node:test");
const assert = require("node:assert/strict");
const { parseUnits } = require("viem");

// These tests reproduce, line-for-line, how routes/events.js > resolveConsensus
// computes the prize pool and per-winner shares, then compare the result to the
// amount the vault ACTUALLY holds. The contract requires sum(shares) === prizePool;
// any divergence reverts with SharesMismatch (see contracts/test/BitPatchVaultFlow.t.sol).

const USDC_DECIMALS = 6;

// --- exact backend reproduction (events.js lines ~1330-1343) ---
function backendComputedPool(ticketPrice, dbParticipantCount) {
  return parseUnits(String(ticketPrice * dbParticipantCount), USDC_DECIMALS);
}

function backendShares(totalPool, winnerCount) {
  const sharePerWinner = totalPool / BigInt(winnerCount);
  const shares = Array.from({ length: winnerCount }, () => sharePerWinner);
  const sumShares = shares.reduce((a, b) => a + b, 0n);
  if (sumShares < totalPool) {
    shares[shares.length - 1] += totalPool - sumShares;
  }
  return shares;
}

// --- what the vault really holds: sum of individual on-chain deposits ---
function onChainPool(ticketPrice, depositorCount) {
  const ticketWei = parseUnits(String(ticketPrice), USDC_DECIMALS);
  return ticketWei * BigInt(depositorCount);
}

// ──────────────────────────────────────────────
//  Correct behaviour (should always hold)
// ──────────────────────────────────────────────

test("integer ticket price, DB count == depositors => pool matches on-chain", () => {
  const pool = backendComputedPool(5, 4);
  assert.equal(pool, onChainPool(5, 4));
  assert.equal(pool, parseUnits("20", USDC_DECIMALS));
});

test("share remainder adjustment keeps sum(shares) === pool", () => {
  // 20 USDC across 3 winners: 6.666666 each + remainder to last
  const pool = backendComputedPool(5, 4);
  const shares = backendShares(pool, 3);
  const sum = shares.reduce((a, b) => a + b, 0n);
  assert.equal(sum, pool, "shares must sum to the pool or distributePrize reverts");
});

// ──────────────────────────────────────────────
//  PRECISION — `parseUnits(String(ticket_price * count), 6)` is FRAGILE-BUT-SAFE
//  `ticket_price * count` introduces float noise, e.g.
//      String(1.005 * 3) === "3.0149999999999997"
//  but viem's parseUnits ROUNDS (not truncates) at the 6th decimal, recovering
//  the exact value. Across every 2- and 3-decimal price this never diverges from
//  the on-chain pool (verified by a 1.5M-combination scan). So the code is safe
//  TODAY only by relying on rounding — the robust form multiplies as BigInt.
// ──────────────────────────────────────────────

test("float noise IS produced but rounding recovers the exact pool", () => {
  assert.equal(String(1.005 * 3), "3.0149999999999997"); // noise present
  assert.equal(backendComputedPool(1.005, 3), 3_015_000n); // rounding fixes it
  assert.equal(onChainPool(1.005, 3), 3_015_000n); // matches the vault
});

test("no divergence across realistic 2-decimal prices x counts", () => {
  for (let cents = 1; cents <= 2000; cents++) {
    const price = cents / 100;
    for (let count = 2; count <= 32; count++) {
      assert.equal(
        backendComputedPool(price, count),
        onChainPool(price, count),
        `divergence at price=${price} count=${count}`
      );
    }
  }
});

test("robust alternative: per-ticket BigInt multiplication is exact by design", () => {
  const exact = parseUnits(String(1.005), USDC_DECIMALS) * BigInt(3);
  assert.equal(exact, onChainPool(1.005, 3));
});

// ──────────────────────────────────────────────
//  BUG #2 — phantom participant (Social Connect invite without deposit)
//  DB has 4 participant rows but only 3 deposited on-chain. Backend pool is
//  computed from the DB count (4) and overshoots the real pool (3).
// ──────────────────────────────────────────────

test("BUG: phantom DB participant inflates pool above real deposits", () => {
  const ticketPrice = 5;
  const dbCount = 4; // 3 real depositors + 1 social-connect invite
  const depositors = 3;

  const backend = backendComputedPool(ticketPrice, dbCount);
  const real = onChainPool(ticketPrice, depositors);

  assert.equal(backend, parseUnits("20", USDC_DECIMALS));
  assert.equal(real, parseUnits("15", USDC_DECIMALS));
  assert.ok(backend > real, "backend would request more than the vault holds -> revert");
});
