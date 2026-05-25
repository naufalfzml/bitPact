require("./_env");

const { test, beforeEach, afterEach } = require("node:test");
const assert = require("node:assert/strict");

const supabaseModule = require("../lib/supabase");
const blockchainModule = require("../lib/blockchain");
const socialConnect = require("../lib/socialConnect");

const originalFrom = supabaseModule.supabase.from;
const originalReadContract = blockchainModule.publicClient.readContract;
const originalWarn = console.warn;

function stubCacheLookup(result) {
  const chain = {
    select: () => chain,
    eq: () => chain,
    single: async () => result,
  };
  supabaseModule.supabase.from = () => chain;
}

beforeEach(() => {
  delete process.env.ODIS_ISSUER_ADDRESS;
  delete process.env.ODIS_ISSUER_PRIVATE_KEY;
  stubCacheLookup({ data: null, error: new Error("cache miss") });
  blockchainModule.publicClient.readContract = originalReadContract;
  console.warn = originalWarn;
});

afterEach(() => {
  supabaseModule.supabase.from = originalFrom;
  blockchainModule.publicClient.readContract = originalReadContract;
  console.warn = originalWarn;
});

test("supported network helper returns only mainnet or alfajores", () => {
  process.env.CELO_NETWORK = "mainnet";
  assert.equal(socialConnect.getSupportedNetwork(), "mainnet");
  assert.equal(
    socialConnect.getFederatedAttestationsAddress(),
    "0x0aD5b1d0C25ecF6266Dd951403723B2687d6aff2"
  );

  process.env.CELO_NETWORK = "alfajores";
  assert.equal(socialConnect.getSupportedNetwork(), "alfajores");
  assert.equal(
    socialConnect.getFederatedAttestationsAddress(),
    "0x70F9314aF173c246669cFb0EEe79F9Cfd9C34ee3"
  );

  process.env.CELO_NETWORK = "sepolia";
  assert.equal(socialConnect.getSupportedNetwork(), null);
  assert.equal(socialConnect.getFederatedAttestationsAddress(), null);
});

test("sepolia returns NOT_RESOLVED without any on-chain lookup", async () => {
  process.env.CELO_NETWORK = "sepolia";

  let readContractCalls = 0;
  let warningMessage = "";
  blockchainModule.publicClient.readContract = async () => {
    readContractCalls += 1;
    throw new Error("readContract should not be called on unsupported networks");
  };
  console.warn = (message) => {
    warningMessage = String(message);
  };

  const result = await socialConnect.resolveSocialIdentifier("player@example.com");

  assert.deepEqual(result, { status: "NOT_RESOLVED", address: null });
  assert.equal(readContractCalls, 0);
  assert.match(warningMessage, /Unsupported network "sepolia"/);
});
