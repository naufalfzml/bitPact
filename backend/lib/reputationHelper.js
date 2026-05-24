const { supabase } = require("./supabase");

// 1 HP regenerated every 1 minute (for testing/demo, i.e. 60000ms. Can be set to 3600000ms for 1 hour in production)
const REGEN_INTERVAL_MS = parseInt(process.env.REGEN_INTERVAL_MS) || 60 * 1000; 

/**
 * Calculates the dynamically regenerated reputation score (HP) for a given wallet address.
 * HP is capped at 100, and regenerates by 1 HP every REGEN_INTERVAL_MS since the latest penalty.
 * If no penalty exists, returns 100.
 *
 * @param {string} walletAddress 
 * @returns {Promise<{current_hp: number, base_score: number, elapsed_ms: number, points_gained: number, latest_penalty_at: string|null}>}
 */
async function getRegeneratedReputation(walletAddress) {
  const cleanAddress = walletAddress.toLowerCase();
  
  // Get the latest reputation entry
  const { data: latestEntry, error } = await supabase
    .from("reputation_tracking")
    .select("*")
    .eq("wallet_address", cleanAddress)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    console.error("Error fetching reputation_tracking in helper:", error);
  }

  // If no records, user has full health (100 HP)
  if (!latestEntry) {
    return {
      current_hp: 100,
      base_score: 100,
      elapsed_ms: 0,
      points_gained: 0,
      latest_penalty_at: null
    };
  }

  const baseScore = latestEntry.reputation_score;
  const latestPenaltyAt = new Date(latestEntry.created_at);
  const elapsedMs = Date.now() - latestPenaltyAt.getTime();
  
  // Calculate points gained passively over time
  const pointsGained = Math.floor(elapsedMs / REGEN_INTERVAL_MS);
  const currentHp = Math.min(100, baseScore + pointsGained);

  return {
    current_hp: currentHp,
    base_score: baseScore,
    elapsed_ms: elapsedMs,
    points_gained: pointsGained,
    latest_penalty_at: latestEntry.created_at
  };
}

module.exports = {
  getRegeneratedReputation,
  REGEN_INTERVAL_MS
};
