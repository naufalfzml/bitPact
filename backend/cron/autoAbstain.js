const cron = require("node-cron");
const { supabase } = require("../lib/supabase");
const { resolveConsensus } = require("../routes/events");

/**
 * Auto-Abstain Cron Job
 *
 * Runs every hour. For events in 'voting' status where 24 hours
 * have elapsed since winners_submitted_at, it treats non-voters
 * as abstaining and resolves the consensus using only cast votes.
 */
function startAutoAbstainCron() {
  // Run every hour at minute 0
  cron.schedule("0 * * * *", async () => {
    console.log("[CRON] Running auto-abstain check...");

    try {
      // Find events in voting status past 24h deadline
      const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

      const { data: expiredEvents, error } = await supabase
        .from("events")
        .select("id, winners_submitted_at")
        .eq("status", "voting")
        .lt("winners_submitted_at", cutoff);

      if (error) {
        console.error("[CRON] Error querying expired events:", error);
        return;
      }

      if (!expiredEvents || expiredEvents.length === 0) {
        console.log("[CRON] No expired voting events found.");
        return;
      }

      for (const event of expiredEvents) {
        console.log(`[CRON] Processing expired event: ${event.id}`);

        // Resolve consensus with only the votes that were cast
        // Non-voters are treated as abstaining (not counted)
        await resolveConsensus(event.id, true);

        console.log(`[CRON] Event ${event.id} resolved.`);
      }
    } catch (err) {
      console.error("[CRON] Auto-abstain cron error:", err);
    }
  });

  console.log("[CRON] Auto-abstain scheduler started (runs every hour).");
}

module.exports = { startAutoAbstainCron };
