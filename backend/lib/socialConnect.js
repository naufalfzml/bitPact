const { OdisUtils } = require("@celo/identity");
const { newKit } = require("@celo/contractkit");
const { supabase } = require("./supabase");
const { publicClient } = require("./blockchain");

/**
 * Celo Social Connect (ODIS) — Native Hybrid Resolver
 *
 * Resolves a social identifier (email or phone number) to a
 * Celo wallet 0x address using the official Celo ODIS protocol
 * with a local Supabase caching layer for cost efficiency.
 *
 * Flow:
 *   1. Check Supabase `social_mappings` cache first (FREE, instant)
 *   2. If miss → call ODIS to get obfuscated identifier (costs quota)
 *   3. Query FederatedAttestations contract on-chain
 *   4. Cache successful resolution in Supabase for next time
 *
 * @param {string} identifier — Email or phone number (e.g. "+6281234567890" or "user@example.com")
 * @returns {Promise<{status: "RESOLVED"|"NOT_RESOLVED", address: string|null}>}
 */

// ── FederatedAttestations contract addresses ──
const FEDERATED_ATTESTATIONS_ADDRESS = {
  mainnet: "0x0aD5b1d0C25ecF6266Dd951403723B2687d6aff2",
  alfajores: "0x70F9314aF173c246669cFb0EEe79F9Cfd9C34ee3",
};

// ── Minimal ABI for FederatedAttestations.lookupAttestations ──
const FEDERATED_ATTESTATIONS_ABI = [
  {
    inputs: [
      { internalType: "bytes32", name: "identifier", type: "bytes32" },
      { internalType: "address[]", name: "trustedIssuers", type: "address[]" },
    ],
    name: "lookupAttestations",
    outputs: [
      { internalType: "uint256[]", name: "countsPerIssuer", type: "uint256[]" },
      { internalType: "address[]", name: "accounts", type: "address[]" },
      { internalType: "address[]", name: "signers", type: "address[]" },
      { internalType: "uint64[]", name: "issuedOns", type: "uint64[]" },
      { internalType: "uint64[]", name: "publishedOns", type: "uint64[]" },
    ],
    stateMutability: "view",
    type: "function",
  },
];

// ── ODIS Service Contexts ──
const ODIS_MAINNET_CONTEXT = {
  odisUrl: "https://us-central1-celo-pgpnp-mainnet.cloudfunctions.net",
  odisPubKey:
    "7FsWGsFnmVvRfMDpzz95Np76wf/1sPaK0Og07ShifOsMhBIVSEOaxQIXevcEYVzRx0AjdWZGPa2HMM3GTKmlUUKFSGAJwmHfzkaZoA7SZFb7z8G11esiCCP2Kth4IDkR16PLZgKP60xXfvLgN1lyLSKBMVRVjf78HxQEagMFBQBluGqHNFEHZ7/izPg5bBJNOxkg+vFmBVvBkKlMnzywBj+kkI2TFEBgOCKQdLsPTbXjq/tJt+hM8i0FhJgLYOiVsjPYk/4NguQA3/YNAaFSgEHEWiQaGJl2CKIH1AMqzlvP8x4FhfGa/r00U0D/KJPKiKFEaW0e/SLjQBb30JFAA",
};

const ODIS_ALFAJORES_CONTEXT = {
  odisUrl: "https://us-central1-celo-phone-number-privacy.cloudfunctions.net",
  odisPubKey:
    "kPoRxWdEdZ/Nd3uQnp3FJFs54zuiS+ksqvOm9x8vY6KHPG8jrfqysvIRU0wtqYsBKA7SoAsICMBv8C/Fb2ZpDOqhSqvr/sZbZoHmQfvbqrzbtDIPvUIrHgRS0ydJCMsA",
};

/**
 * Initialize ContractKit for ODIS authentication.
 * Uses the issuer's private key to sign ODIS queries.
 */
function getContractKit() {
  const network = process.env.CELO_NETWORK === "mainnet" ? "mainnet" : "alfajores";
  const rpcUrl =
    process.env.CELO_RPC_URL ||
    (network === "mainnet"
      ? "https://forno.celo.org"
      : "https://forno.celo-sepolia.celo-testnet.org");

  const kit = newKit(rpcUrl);
  kit.addAccount(process.env.ODIS_ISSUER_PRIVATE_KEY);
  return kit;
}

/**
 * Determine the identifier prefix (phone vs email) based on content.
 */
function getIdentifierPrefix(identifier) {
  if (identifier.includes("@")) {
    return OdisUtils.Identifier.IdentifierPrefix.EMAIL;
  }
  return OdisUtils.Identifier.IdentifierPrefix.PHONE_NUMBER;
}

/**
 * Get the ODIS service context based on the current network.
 */
function getServiceContext() {
  return process.env.CELO_NETWORK === "mainnet"
    ? ODIS_MAINNET_CONTEXT
    : ODIS_ALFAJORES_CONTEXT;
}

/**
 * Return the active network only when Social Connect has a known contract address.
 */
function getSupportedNetwork() {
  const network = process.env.CELO_NETWORK;
  if (network === "mainnet" || network === "alfajores") {
    return network;
  }
  return null;
}

/**
 * Get the FederatedAttestations contract address for the current network.
 */
function getFederatedAttestationsAddress() {
  const network = getSupportedNetwork();
  return network ? FEDERATED_ATTESTATIONS_ADDRESS[network] : null;
}

/**
 * Resolve a social identifier to a Celo wallet address.
 *
 * Uses hybrid caching: Supabase cache first, then ODIS on-chain lookup.
 */
async function resolveSocialIdentifier(identifier) {
  if (!identifier || typeof identifier !== "string") {
    return { status: "NOT_RESOLVED", address: null };
  }

  const normalizedIdentifier = identifier.trim().toLowerCase();

  // ── Step 1: Check Supabase cache (FREE, instant) ──
  try {
    const { data: cached, error: cacheError } = await supabase
      .from("social_mappings")
      .select("wallet_address")
      .eq("identifier", normalizedIdentifier)
      .single();

    if (!cacheError && cached && cached.wallet_address) {
      console.log("[SocialConnect] Cache HIT for:", normalizedIdentifier);
      return { status: "RESOLVED", address: cached.wallet_address };
    }
  } catch (cacheErr) {
    // Cache miss or table error — continue to ODIS
    console.log("[SocialConnect] Cache miss, proceeding to ODIS lookup");
  }

  // ── Step 2: ODIS on-chain lookup ──
  const contractAddress = getFederatedAttestationsAddress();
  if (!contractAddress) {
    console.warn(
      `[SocialConnect] Unsupported network "${process.env.CELO_NETWORK}" — no FederatedAttestations address. Returning NOT_RESOLVED.`
    );
    return { status: "NOT_RESOLVED", address: null };
  }

  // Guard: ensure ODIS credentials are configured
  if (!process.env.ODIS_ISSUER_ADDRESS || !process.env.ODIS_ISSUER_PRIVATE_KEY) {
    console.warn("[SocialConnect] ODIS credentials not configured. Skipping on-chain lookup.");
    return { status: "NOT_RESOLVED", address: null };
  }

  try {
    const kit = getContractKit();
    const issuerAddress = process.env.ODIS_ISSUER_ADDRESS;
    const serviceContext = getServiceContext();
    const identifierPrefix = getIdentifierPrefix(normalizedIdentifier);

    // Build the auth signer using the issuer's wallet key
    const authSigner = {
      authenticationMethod: OdisUtils.Query.AuthenticationMethod.WALLET_KEY,
      contractKit: kit,
    };

    // Get the obfuscated identifier from ODIS
    console.log("[SocialConnect] Querying ODIS for:", normalizedIdentifier);
    const { obfuscatedIdentifier } = await OdisUtils.Identifier.getObfuscatedIdentifier(
      normalizedIdentifier,
      identifierPrefix,
      issuerAddress,
      authSigner,
      serviceContext
    );

    console.log("[SocialConnect] Obfuscated identifier obtained, querying FederatedAttestations...");

    // ── Step 3: Query FederatedAttestations contract via Viem ──
    const result = await publicClient.readContract({
      address: contractAddress,
      abi: FEDERATED_ATTESTATIONS_ABI,
      functionName: "lookupAttestations",
      args: [obfuscatedIdentifier, [issuerAddress]],
    });

    // result is a tuple: [countsPerIssuer, accounts, signers, issuedOns, publishedOns]
    const accounts = result[1];

    if (accounts && accounts.length > 0) {
      const resolvedAddress = accounts[0];
      console.log("[SocialConnect] RESOLVED on-chain:", resolvedAddress);

      // ── Step 4: Cache the result in Supabase for future lookups ──
      try {
        await supabase.from("social_mappings").upsert(
          {
            identifier: normalizedIdentifier,
            wallet_address: resolvedAddress,
          },
          { onConflict: "identifier" }
        );
        console.log("[SocialConnect] Result cached in Supabase");
      } catch (cacheWriteErr) {
        // Non-fatal: log but don't fail the lookup
        console.error("[SocialConnect] Failed to cache result:", cacheWriteErr);
      }

      return { status: "RESOLVED", address: resolvedAddress };
    }

    console.log("[SocialConnect] No attestations found on-chain for:", normalizedIdentifier);
    return { status: "NOT_RESOLVED", address: null };
  } catch (odisErr) {
    console.error("[SocialConnect] ODIS lookup error:", odisErr.message || odisErr);

    // Provide specific error context for common failures
    if (odisErr.message && odisErr.message.includes("quota")) {
      console.error("[SocialConnect] ODIS quota may be exhausted. Check issuer balance.");
    }
    if (odisErr.message && odisErr.message.includes("authentication")) {
      console.error("[SocialConnect] ODIS authentication failed. Check issuer key configuration.");
    }

    return { status: "NOT_RESOLVED", address: null };
  }
}

module.exports = {
  resolveSocialIdentifier,
  getSupportedNetwork,
  getFederatedAttestationsAddress,
};
