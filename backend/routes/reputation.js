const express = require("express");
const { supabase } = require("../lib/supabase");

const router = express.Router();

// ──────────────────────────────────────────────
//  GET /api/reputation/:wallet
// ──────────────────────────────────────────────
router.get("/:wallet", async (req, res) => {
  try {
    const { wallet } = req.params;

    // Get latest reputation record for this wallet
    const { data: records, error } = await supabase
      .from("reputation_tracking")
      .select("*")
      .eq("wallet_address", wallet)
      .order("created_at", { ascending: false });

    if (error) throw error;

    const latestScore = records?.[0]?.reputation_score ?? 100;
    const totalMinorityEvents = records?.filter((r) => r.was_minority).length ?? 0;

    res.json({
      wallet_address: wallet,
      reputation_score: latestScore,
      total_minority_events: totalMinorityEvents,
      history: records ?? [],
    });
  } catch (err) {
    console.error("GET /api/reputation/:wallet error:", err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
