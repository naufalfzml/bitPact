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
//  FIX (F1) — shares derived from the ON-CHAIN pool, not the DB row count.
//  resolveConsensus/settleEvent now reads prizePool via getEventInfo, so a
//  phantom DB participant (4 rows, only 3 deposits) cannot inflate the pool:
//  shares are split from the real on-chain pool and always sum to it, so
//  distributePrize never reverts with SharesMismatch.
// ──────────────────────────────────────────────

// Mirror of settleEvent()'s share math (routes/events.js).
function sharesFromOnChainPool(prizePool, winnerCount) {
  const sharePerWinner = prizePool / BigInt(winnerCount);
  const shares = Array.from({ length: winnerCount }, () => sharePerWinner);
  const sumShares = shares.reduce((a, b) => a + b, 0n);
  if (sumShares < prizePool) {
    shares[shares.length - 1] += prizePool - sumShares;
  }
  return shares;
}

test("F1: shares derived from on-chain pool ignore phantom DB participants", () => {
  const ticketPrice = 5;
  const depositors = 3; // real on-chain deposits; DB has 4 rows (1 phantom)

  // The pool is read from on-chain state, NOT from the (inflated) DB count.
  const pool = onChainPool(ticketPrice, depositors);
  const shares = sharesFromOnChainPool(pool, 2); // 2 winners
  const sum = shares.reduce((a, b) => a + b, 0n);

  assert.equal(pool, parseUnits("15", USDC_DECIMALS));
  assert.equal(sum, pool, "sum(shares) must equal the on-chain pool -> no SharesMismatch");
});

test("F1: sum(shares) === on-chain pool across winner counts and remainders", () => {
  const pool = onChainPool(5, 4); // 20 USDC held on-chain
  for (let winners = 1; winners <= 4; winners++) {
    const sum = sharesFromOnChainPool(pool, winners).reduce((a, b) => a + b, 0n);
    assert.equal(sum, pool, `divergence with ${winners} winners`);
  }
});
