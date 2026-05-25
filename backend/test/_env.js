// Shared test bootstrap: inject dummy-but-valid env BEFORE any backend module
// is required, so lib/blockchain.js (privateKeyToAccount) and lib/supabase.js
// (createClient) can be imported offline without throwing.
//
// IMPORTANT: require("./_env") must be the FIRST line of every test file.

process.env.SUPABASE_URL = process.env.SUPABASE_URL || "http://localhost:54321";
process.env.SUPABASE_SERVICE_ROLE_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY || "test-service-role-key";

// Well-known Anvil test private key (account #0) — never used to sign anything real here.
process.env.ADMIN_WALLET_PRIVATE_KEY =
  process.env.ADMIN_WALLET_PRIVATE_KEY ||
  "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80";

process.env.VAULT_CONTRACT_ADDRESS =
  process.env.VAULT_CONTRACT_ADDRESS ||
  "0x1111111111111111111111111111111111111111";

process.env.CELO_NETWORK = process.env.CELO_NETWORK || "sepolia";
process.env.CELO_RPC_URL = process.env.CELO_RPC_URL || "http://localhost:8545";

module.exports = {};
