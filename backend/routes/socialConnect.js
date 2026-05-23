const express = require("express");
const { resolveSocialIdentifier } = require("../lib/socialConnect");

const router = express.Router();

// ──────────────────────────────────────────────
//  POST /api/social-connect/lookup
//
//  Resolves a social identifier (email or phone)
//  to a Celo wallet 0x address via Social Connect
//  (ODIS) mock database.
//
//  Body: { "identifier": "+6281234567890" }
//  Response: { "status": "RESOLVED", "address": "0x..." }
//       or: { "status": "NOT_RESOLVED", "address": null }
// ──────────────────────────────────────────────
router.post("/lookup", async (req, res) => {
  try {
    const { identifier } = req.body;

    if (!identifier || typeof identifier !== "string") {
      return res.status(400).json({
        error: "Missing or invalid 'identifier' in request body. Provide an email or phone number.",
      });
    }

    const result = await resolveSocialIdentifier(identifier);
    res.json(result);
  } catch (err) {
    console.error("POST /api/social-connect/lookup error:", err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
