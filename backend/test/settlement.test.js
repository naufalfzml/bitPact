require("./_env");

const { test } = require("node:test");
const assert = require("node:assert/strict");
const { parseUnits } = require("viem");
const { settleEvent, authorizeRetrySettlement } = require("../routes/events");

// These tests exercise the REAL settleEvent / authorizeRetrySettlement from
// routes/events.js, injecting in-memory mocks for the chain clients and Supabase
// so the suite stays fully offline. They verify escrow-payout-integrity F1 + F2:
//   - shares are derived from the ON-CHAIN pool (sum(shares) === prizePool)
//   - status only becomes 'ended' after a successful receipt
//   - failures become 'settlement_failed' (NOT 'ended'), and are retry-guarded

const USDC = 6;

const EVENT = {
  id: "11111111-1111-1111-1111-111111111111",
  creator_address: "0xCreatorAddr",
  consensus_threshold: 51,
  status: "voting",
};

// Build injectable deps with recorded DB writes + captured writeContract args.
function makeDeps({
  prizePool = 0n,
  distributed = false,
  winners = [],
  receiptStatus = "success",
  throwOnRead = false,
  throwOnWrite = false,
} = {}) {
  const updates = [];
  let writeArgs = null;

  const supabase = {
    from(table) {
      return {
        select() {
          return {
            eq() {
              return {
                // participants winners query ends after the 2nd .eq()
                eq() {
                  return Promise.resolve({ data: winners, error: null });
                },
              };
            },
          };
        },
        update(payload) {
          return {
            eq() {
              updates.push({ table, payload });
              return Promise.resolve({ data: null, error: null });
            },
          };
        },
      };
    },
  };

  const publicClient = {
    async readContract() {
      if (throwOnRead) throw new Error("rpc getEventInfo failed");
      // [creator, ticketPrice, prizePool, distributed, participantCount]
      return ["0xCreator", 0n, prizePool, distributed, BigInt(winners.length)];
    },
    async waitForTransactionReceipt() {
      return { status: receiptStatus };
    },
  };

  const walletClient = {
    async writeContract(args) {
      if (throwOnWrite) throw new Error("writeContract reverted");
      writeArgs = args;
      return "0xTXHASH";
    },
  };

  return {
    deps: { supabase, publicClient, walletClient },
    updates,
    getWriteArgs: () => writeArgs,
  };
}

const lastUpdate = (updates) => updates[updates.length - 1];

// ──────────────────────────────────────────────
//  settleEvent — distribution
// ──────────────────────────────────────────────

test("settleEvent: distribute success -> ended, tx hash saved, error cleared", async () => {
  const { deps, updates, getWriteArgs } = makeDeps({
    prizePool: parseUnits("15", USDC),
    winners: [{ wallet_address: "0xA" }, { wallet_address: "0xB" }],
    receiptStatus: "success",
  });

  const res = await settleEvent(EVENT, { isDistribute: true }, deps);

  assert.equal(res.ok, true);
  const last = lastUpdate(updates);
  assert.equal(last.table, "events");
  assert.equal(last.payload.status, "ended");
  assert.equal(last.payload.settlement_tx_hash, "0xTXHASH");
  assert.equal(last.payload.settlement_error, null);

  // F1: shares come from the on-chain pool and sum exactly to it.
  const [, , shares] = getWriteArgs().args;
  const sum = shares.reduce((a, b) => a + b, 0n);
  assert.equal(sum, parseUnits("15", USDC));
});

test("settleEvent: reverted receipt -> settlement_failed (NOT ended), keeps tx hash", async () => {
  const { deps, updates } = makeDeps({
    prizePool: parseUnits("15", USDC),
    winners: [{ wallet_address: "0xA" }],
    receiptStatus: "reverted",
  });

  const res = await settleEvent(EVENT, { isDistribute: true }, deps);

  assert.equal(res.ok, false);
  const last = lastUpdate(updates);
  assert.equal(last.payload.status, "settlement_failed");
  assert.equal(last.payload.settlement_tx_hash, "0xTXHASH");
  assert.ok(last.payload.settlement_error, "error message recorded");
  assert.ok(
    !updates.some((u) => u.payload.status === "ended"),
    "status must never become ended on a reverted receipt"
  );
});

test("settleEvent: writeContract throws -> settlement_failed, no tx hash, never ended", async () => {
  const { deps, updates } = makeDeps({
    prizePool: parseUnits("15", USDC),
    winners: [{ wallet_address: "0xA" }],
    throwOnWrite: true,
  });

  const res = await settleEvent(EVENT, { isDistribute: true }, deps);

  assert.equal(res.ok, false);
  const last = lastUpdate(updates);
  assert.equal(last.payload.status, "settlement_failed");
  assert.equal(last.payload.settlement_tx_hash, undefined);
  assert.ok(!updates.some((u) => u.payload.status === "ended"));
});

test("settleEvent: getEventInfo read failure -> settlement_failed", async () => {
  const { deps, updates } = makeDeps({ throwOnRead: true });

  const res = await settleEvent(EVENT, { isDistribute: true }, deps);

  assert.equal(res.ok, false);
  assert.equal(lastUpdate(updates).payload.status, "settlement_failed");
});

test("settleEvent: no winners recorded -> settlement_failed (no silent ended)", async () => {
  const { deps, updates, getWriteArgs } = makeDeps({
    prizePool: parseUnits("15", USDC),
    winners: [],
  });

  const res = await settleEvent(EVENT, { isDistribute: true }, deps);

  assert.equal(res.ok, false);
  assert.equal(lastUpdate(updates).payload.status, "settlement_failed");
  assert.equal(getWriteArgs(), null, "no transaction sent without winners");
});

test("settleEvent: already distributed on-chain -> idempotent ended, no new tx", async () => {
  const { deps, updates, getWriteArgs } = makeDeps({
    distributed: true,
    prizePool: parseUnits("15", USDC),
    winners: [{ wallet_address: "0xA" }],
  });

  const res = await settleEvent(EVENT, { isDistribute: true }, deps);

  assert.equal(res.ok, true);
  assert.equal(res.alreadyDistributed, true);
  assert.equal(lastUpdate(updates).payload.status, "ended");
  assert.equal(getWriteArgs(), null, "no transaction sent when already distributed");
});

// ──────────────────────────────────────────────
//  settleEvent — refund
// ──────────────────────────────────────────────

test("settleEvent: refund success -> ended", async () => {
  const { deps, updates, getWriteArgs } = makeDeps({
    prizePool: parseUnits("15", USDC),
    receiptStatus: "success",
  });

  const res = await settleEvent(EVENT, { isDistribute: false }, deps);

  assert.equal(res.ok, true);
  assert.equal(lastUpdate(updates).payload.status, "ended");
  assert.equal(getWriteArgs().functionName, "emergencyRefund");
});

test("settleEvent: refund reverted -> settlement_failed", async () => {
  const { deps, updates } = makeDeps({
    prizePool: parseUnits("15", USDC),
    receiptStatus: "reverted",
  });

  const res = await settleEvent(EVENT, { isDistribute: false }, deps);

  assert.equal(res.ok, false);
  assert.equal(lastUpdate(updates).payload.status, "settlement_failed");
});

// ──────────────────────────────────────────────
//  authorizeRetrySettlement — retry guard (D4)
// ──────────────────────────────────────────────

const FAILED = { creator_address: "0xCreator", status: "settlement_failed" };

test("retry auth: non-creator / non-admin -> 403", () => {
  const r = authorizeRetrySettlement(FAILED, "0xStranger", "0xAdmin");
  assert.equal(r.ok, false);
  assert.equal(r.code, 403);
});

test("retry auth: creator on settlement_failed -> ok (case-insensitive)", () => {
  const r = authorizeRetrySettlement(FAILED, "0xCREATOR", "0xAdmin");
  assert.equal(r.ok, true);
});

test("retry auth: admin on settlement_failed -> ok (case-insensitive)", () => {
  const r = authorizeRetrySettlement(FAILED, "0xADMIN", "0xadmin");
  assert.equal(r.ok, true);
});

test("retry auth: creator but status not settlement_failed -> 400", () => {
  const r = authorizeRetrySettlement(
    { creator_address: "0xCreator", status: "ended" },
    "0xCreator",
    "0xAdmin"
  );
  assert.equal(r.ok, false);
  assert.equal(r.code, 400);
});

test("retry auth: missing event -> 404", () => {
  const r = authorizeRetrySettlement(null, "0xCreator", "0xAdmin");
  assert.equal(r.ok, false);
  assert.equal(r.code, 404);
});
