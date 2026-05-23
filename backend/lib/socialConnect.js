const { supabase } = require("./supabase");

/**
 * Celo Social Connect (ODIS) — Mock Resolver
 *
 * Resolves a social identifier (email or phone number) to a
 * Celo wallet 0x address using a Supabase-backed mapping table.
 *
 * In production, this module would integrate with the actual
 * Celo ODIS protocol for on-chain identity resolution. The
 * interface is designed as a drop-in replacement.
 *
 * @param {string} identifier — Email or phone number (e.g. "+6281234567890" or "user@example.com")
 * @returns {Promise<{status: "RESOLVED"|"NOT_RESOLVED", address: string|null}>}
 */
async function resolveSocialIdentifier(identifier) {
  if (!identifier || typeof identifier !== "string") {
    return { status: "NOT_RESOLVED", address: null };
  }

  const normalizedIdentifier = identifier.trim().toLowerCase();

  try {
    // Query the social_mappings table in Supabase
    const { data, error } = await supabase
      .from("social_mappings")
      .select("wallet_address")
      .eq("identifier", normalizedIdentifier)
      .single();

    if (error || !data) {
      return { status: "NOT_RESOLVED", address: null };
    }

    return { status: "RESOLVED", address: data.wallet_address };
  } catch (err) {
    console.error("[SocialConnect] Lookup error:", err);
    return { status: "NOT_RESOLVED", address: null };
  }
}

module.exports = { resolveSocialIdentifier };
