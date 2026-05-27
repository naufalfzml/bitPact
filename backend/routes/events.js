const express = require("express");
const bcrypt = require("bcryptjs");
const { supabase } = require("../lib/supabase");
const {
  publicClient,
  walletClient,
  adminAccount,
  VAULT_ABI,
  uuidToBytes32,
  parseEther,
  parseUnits,
} = require("../lib/blockchain");
const { getRegeneratedReputation } = require("../lib/reputationHelper");

const router = express.Router();

const VAULT_ADDRESS = process.env.VAULT_CONTRACT_ADDRESS;

// ──────────────────────────────────────────────
//  POST /api/events — Create tournament
// ──────────────────────────────────────────────
router.post("/", async (req, res) => {
  try {
    const {
      title,
      game_mode = "1v1",
      max_participants = 16,
      team_size = 1,
      ticket_price,
      photo_required = false,
      consensus_threshold = 51,
      creator_address,
      access_type = "public",
      password,
      whitelist,
    } = req.body;

    // Validate required fields
    if (!title || !ticket_price || !creator_address) {
      return res.status(400).json({ error: "Missing required fields: title, ticket_price, creator_address" });
    }
    if (!["1v1", "team", "ffa"].includes(game_mode)) {
      return res.status(400).json({ error: "game_mode must be '1v1', 'team', or 'ffa'" });
    }
    if (access_type !== "public" && !["password", "invite_only"].includes(access_type)) {
      return res.status(400).json({ error: "access_type must be 'public', 'password' or 'invite_only'" });
    }

    // Hash password if access_type is password
    let passwordHash = null;
    if (access_type === "password") {
      if (!password || typeof password !== "string" || password.trim().length === 0) {
        return res.status(400).json({ error: "Password is required for password-protected events" });
      }
      passwordHash = await bcrypt.hash(password.trim(), 10);
    }

    // Handle 'Not Set' (Unlimited) max_participants mapping to null
    let maxParticipantsVal = max_participants;
    if (max_participants === 0 || max_participants === null || max_participants === "0" || max_participants === "") {
      maxParticipantsVal = null;
    } else {
      maxParticipantsVal = Number(max_participants);
    }

    // Insert event into Supabase
    const { data: event, error: dbError } = await supabase
      .from("events")
      .insert({
        title,
        game_mode,
        max_participants: maxParticipantsVal,
        team_size: game_mode === "team" ? team_size : 1,
        ticket_price,
        photo_required,
        consensus_threshold,
        creator_address,
        access_type,
        password_hash: passwordHash,
      })
      .select()
      .single();

    if (dbError) throw dbError;

    // Save whitelist addresses for invite-only events
    if (access_type === "invite_only" && Array.isArray(whitelist) && whitelist.length > 0) {
      const whitelistInserts = whitelist
        .filter((addr) => typeof addr === "string" && addr.trim().length > 0)
        .map((addr) => ({
          event_id: event.id,
          wallet_address: addr.trim().toLowerCase(),
        }));

      if (whitelistInserts.length > 0) {
        const { error: wlError } = await supabase
          .from("event_whitelist")
          .insert(whitelistInserts);
        if (wlError) console.error("Whitelist insert warning:", wlError);
      }
    }

    // Create event on-chain via admin wallet (Viem writeContract)
    const eventIdBytes32 = uuidToBytes32(event.id);
    const ticketPriceWei = parseUnits(String(ticket_price), 6);

    const txHash = await walletClient.writeContract({
      address: VAULT_ADDRESS,
      abi: VAULT_ABI,
      functionName: "createEvent",
      args: [eventIdBytes32, ticketPriceWei, creator_address],
    });
    await publicClient.waitForTransactionReceipt({ hash: txHash });

    res.status(201).json({ event, txHash });
  } catch (err) {
    console.error("POST /api/events error:", err);
    res.status(500).json({ error: err.message });
  }
});

// ──────────────────────────────────────────────
//  GET /api/events — List all events
// ──────────────────────────────────────────────
router.get("/", async (_req, res) => {
  try {
    const { data: events, error } = await supabase
      .from("events")
      .select("*, participants(count)")
      .order("created_at", { ascending: false });

    if (error) throw error;

    const formatted = events.map((e) => ({
      ...e,
      participant_count: e.participants?.[0]?.count ?? 0,
      participants: undefined,
    }));

    res.json(formatted);
  } catch (err) {
    console.error("GET /api/events error:", err);
    res.status(500).json({ error: err.message });
  }
});

// ──────────────────────────────────────────────
//  GET /api/events/:id — Event detail
// ──────────────────────────────────────────────
router.get("/:id", async (req, res) => {
  try {
    const { id } = req.params;

    const { data: event, error: eventErr } = await supabase
      .from("events")
      .select("*")
      .eq("id", id)
      .single();

    if (eventErr || !event) {
      return res.status(404).json({ error: "Event not found" });
    }

    // Fetch participants
    const { data: participants } = await supabase
      .from("participants")
      .select("*")
      .eq("event_id", id);

    // Fetch brackets if applicable
    const { data: brackets } = await supabase
      .from("brackets")
      .select("*")
      .eq("event_id", id)
      .order("round", { ascending: true })
      .order("match_index", { ascending: true });

    // Fetch votes summary
    const { data: votes } = await supabase
      .from("votes")
      .select("*")
      .eq("event_id", id);

    const totalVotes = votes?.length ?? 0;
    const agreeVotes = votes?.filter((v) => v.is_valid).length ?? 0;
    const rejectVotes = totalVotes - agreeVotes;

    res.json({
      ...event,
      participants: participants ?? [],
      brackets: brackets ?? [],
      voting: {
        total: totalVotes,
        agree: agreeVotes,
        reject: rejectVotes,
        percentage: totalVotes > 0 ? ((agreeVotes / totalVotes) * 100).toFixed(1) : null,
      },
    });
  } catch (err) {
    console.error("GET /api/events/:id error:", err);
    res.status(500).json({ error: err.message });
  }
});

// ──────────────────────────────────────────────
//  POST /api/events/:id/register
// ──────────────────────────────────────────────
// Helper to get Blockscout API URL based on network
const getBlockscoutApiUrl = () => {
  const network = process.env.CELO_NETWORK || "sepolia";
  if (network === "mainnet") return "https://celo.blockscout.com/api";
  if (network === "alfajores") return "https://celo-alfajores.blockscout.com/api";
  return "https://celo-sepolia.blockscout.com/api";
};

router.post("/:id/register", async (req, res) => {
  try {
    const { id } = req.params;
    const { wallet_address, tx_hash, password } = req.body;

    if (!wallet_address || !tx_hash) {
      return res.status(400).json({ error: "Missing wallet_address or tx_hash" });
    }

    // Verify event exists and is in setup status
    const { data: event, error: eventErr } = await supabase
      .from("events")
      .select("*")
      .eq("id", id)
      .single();

    if (eventErr || !event) return res.status(404).json({ error: "Event not found" });
    if (event.status !== "setup") {
      return res.status(400).json({ error: "Event registration is closed" });
    }
    if (event.roster_locked) {
      return res.status(400).json({ error: "Pendaftaran turnamen ini sudah ditutup (Roster Locked)" });
    }

    // Check participant limit
    const { data: participantsForLimit } = await supabase
      .from("participants")
      .select("id")
      .eq("event_id", id);
    const currentCount = participantsForLimit?.length ?? 0;
    if (event.max_participants && currentCount >= event.max_participants) {
      return res.status(400).json({ error: `Pendaftaran ditolak. Kapasitas maksimum turnamen (${event.max_participants}) sudah terpenuhi.` });
    }

    // ── Creator Restriction Guard ──
    if (wallet_address.toLowerCase() === event.creator_address.toLowerCase()) {
      return res.status(403).json({ error: "Kreator tidak diizinkan untuk mendaftar ke turnamen buatan sendiri" });
    }

    // ── Reputation Guard Check (HP/Reputation Score must be >= 50) ──
    const repData = await getRegeneratedReputation(wallet_address);
    const currentReputation = repData.current_hp;
    
    if (currentReputation < 50) {
      return res.status(403).json({
        error: `Pendaftaran ditolak. Skor HP Reputasi Anda (${currentReputation}/100) masih dalam masa hukuman/pemulihan (minimal 50). HP Anda bertambah +1 secara berkala seiring waktu berjalan. Silakan tunggu beberapa saat lagi.`,
      });
    }

    // ── Password Validation Guard ──
    if (event.access_type === "password") {
      if (!password || typeof password !== "string") {
        return res.status(400).json({ error: "Password diperlukan untuk turnamen ini" });
      }
      const passwordValid = await bcrypt.compare(password, event.password_hash);
      if (!passwordValid) {
        return res.status(403).json({ error: "Password turnamen tidak valid" });
      }
    }

    // ── Invite-Only Whitelist Guard ──
    if (event.access_type === "invite_only") {
      const { data: whitelistEntry } = await supabase
        .from("event_whitelist")
        .select("id")
        .eq("event_id", id)
        .eq("wallet_address", wallet_address.toLowerCase())
        .single();

      if (!whitelistEntry) {
        return res.status(403).json({ error: "Anda tidak diundang ke turnamen ini" });
      }
    }

    // Check duplicate registration
    const { data: existing } = await supabase
      .from("participants")
      .select("id")
      .eq("event_id", id)
      .eq("wallet_address", wallet_address)
      .single();

    if (existing) return res.status(409).json({ error: "Already registered" });

    // ── Double Blockchain Verification: Blockscout API & Direct RPC ──
    let isTxSuccess = false;
    let isBlockscoutVerified = false;
    let blockscoutCheckAttempted = false;
    let isRegisteredInContract = false;

    // On-chain verification is mandatory for EVERY registration: no participant
    // row is created without a verified deposit (escrow-payout-integrity / F3).

    // 1. Blockscout API Verification
    {
      try {
        const blockscoutApi = getBlockscoutApiUrl();
        const blockscoutUrl = `${blockscoutApi}?module=proxy&action=eth_getTransactionReceipt&txhash=${tx_hash}`;
        
        console.log(`Verifying tx ${tx_hash} via Blockscout: ${blockscoutUrl}`);
        blockscoutCheckAttempted = true;

        const blockscoutRes = await fetch(blockscoutUrl, { signal: AbortSignal.timeout(6000) });
        if (blockscoutRes.ok) {
          const blockscoutData = await blockscoutRes.json();
          const blockscoutReceipt = blockscoutData?.result;
          
          if (blockscoutReceipt) {
            const status = blockscoutReceipt.status;
            const toAddress = blockscoutReceipt.to;
            const fromAddress = blockscoutReceipt.from;

            const isSuccess = status === "0x1" || status === "1";
            const isCorrectVault = toAddress && toAddress.toLowerCase() === VAULT_ADDRESS.toLowerCase();
            const isCorrectSender = fromAddress && fromAddress.toLowerCase() === wallet_address.toLowerCase();

            if (isSuccess && isCorrectVault && isCorrectSender) {
              isBlockscoutVerified = true;
              isTxSuccess = true;
              console.log("Transaction successfully verified via Blockscout API!");
            } else {
              console.warn("Blockscout validation mismatch details:", { isSuccess, isCorrectVault, isCorrectSender });
            }
          }
        }
      } catch (blockscoutErr) {
        console.error("Blockscout API verification error (falling back to RPC):", blockscoutErr);
      }
    }

    // 2. Direct On-Chain RPC Verification (Fallback or double-check)
    if (!isBlockscoutVerified) {
      try {
        console.log("Validating transaction via public RPC node...");
        const receipt = await publicClient.getTransactionReceipt({ hash: tx_hash });

        if (receipt.status !== "success") {
          return res.status(400).json({
            error: "Transaksi blockchain gagal (reverted). Pendaftaran ditolak.",
            tx_status: receipt.status,
          });
        }

        // Verify transaction was sent to the vault contract
        if (receipt.to && receipt.to.toLowerCase() !== VAULT_ADDRESS.toLowerCase()) {
          return res.status(400).json({
            error: "Transaksi tidak ditujukan ke kontrak vault yang benar.",
            expected: VAULT_ADDRESS,
            actual: receipt.to,
          });
        }

        // Verify sender
        if (receipt.from && receipt.from.toLowerCase() !== wallet_address.toLowerCase()) {
          return res.status(400).json({
            error: "Transaksi tidak dikirim oleh dompet pendaftar.",
            expected: wallet_address,
            actual: receipt.from,
          });
        }

        isTxSuccess = true;
      } catch (receiptErr) {
        console.error("RPC Receipt validation failed:", receiptErr);
        return res.status(400).json({
          error: "Tidak dapat memvalidasi transaksi on-chain. Pastikan hash transaksi valid.",
        });
      }
    }

    // 3. Contract State Verification: Double-check 'isParticipant' view function on the Vault
    {
      try {
        const eventIdBytes32 = uuidToBytes32(id);
        isRegisteredInContract = await publicClient.readContract({
          address: VAULT_ADDRESS,
          abi: VAULT_ABI,
          functionName: "isParticipant",
          args: [eventIdBytes32, wallet_address],
        });
        console.log(`Direct on-chain read 'isParticipant' result: ${isRegisteredInContract}`);
      } catch (contractErr) {
        console.error("Failed to read isParticipant from vault contract:", contractErr);
      }

      // Ensure they are actually registered on-chain in the contract
      if (isTxSuccess && !isRegisteredInContract) {
        console.warn("Transaction succeeded but isParticipant returned false. Possible race condition or mismatch. Waiting 1.5s to retry...");
        // A quick retry in case of slight delay
        await new Promise((resolve) => setTimeout(resolve, 1500));
        try {
          const eventIdBytes32 = uuidToBytes32(id);
          isRegisteredInContract = await publicClient.readContract({
            address: VAULT_ADDRESS,
            abi: VAULT_ABI,
            functionName: "isParticipant",
            args: [eventIdBytes32, wallet_address],
          });
        } catch (contractErr) {
          console.error("Retry of isParticipant check failed:", contractErr);
        }
      }
    }

    if (!isRegisteredInContract) {
      return res.status(400).json({
        error: "Verifikasi kontrak gagal. Dompet Anda belum tercatat sebagai peserta aktif untuk event ini di blockchain.",
      });
    }

    // Insert participant (only after successful on-chain validation)
    const { data: participant, error: insertErr } = await supabase
      .from("participants")
      .insert({ event_id: id, wallet_address, status: "registered" })
      .select()
      .single();

    if (insertErr) throw insertErr;

    res.status(201).json(participant);
  } catch (err) {
    console.error("POST /api/events/:id/register error:", err);
    res.status(500).json({ error: err.message });
  }
});

// ──────────────────────────────────────────────
//  GET /api/events/:id/whitelist/check — Check if wallet is whitelisted
// ──────────────────────────────────────────────
router.get("/:id/whitelist/check", async (req, res) => {
  try {
    const { id } = req.params;
    const { wallet } = req.query;

    if (!wallet) {
      return res.status(400).json({ error: "Missing wallet query parameter" });
    }

    const { data: entry } = await supabase
      .from("event_whitelist")
      .select("id")
      .eq("event_id", id)
      .eq("wallet_address", String(wallet).toLowerCase())
      .single();

    res.json({ whitelisted: !!entry });
  } catch (err) {
    console.error("GET /api/events/:id/whitelist/check error:", err);
    res.status(500).json({ error: err.message });
  }
});

// ──────────────────────────────────────────────
//  POST /api/events/:id/whitelist — Manage invite-only whitelist
// ──────────────────────────────────────────────
router.post("/:id/whitelist", async (req, res) => {
  try {
    const { id } = req.params;
    const { wallet_address, creator_address } = req.body;

    if (!wallet_address || !creator_address) {
      return res.status(400).json({ error: "Missing wallet_address or creator_address" });
    }

    // Verify event exists and caller is creator
    const { data: event, error: eventErr } = await supabase
      .from("events")
      .select("creator_address, access_type, status")
      .eq("id", id)
      .single();

    if (eventErr || !event) return res.status(404).json({ error: "Event not found" });
    if (event.creator_address.toLowerCase() !== creator_address.toLowerCase()) {
      return res.status(403).json({ error: "Only the event creator can manage the whitelist" });
    }
    if (event.access_type !== "invite_only") {
      return res.status(400).json({ error: "Whitelist management is only available for invite-only events" });
    }
    if (event.status !== "setup") {
      return res.status(400).json({ error: "Whitelist can only be modified during setup phase" });
    }

    // Insert into whitelist (ignore duplicate via upsert-like check)
    const normalizedAddress = wallet_address.trim().toLowerCase();
    const { data: existingEntry } = await supabase
      .from("event_whitelist")
      .select("id")
      .eq("event_id", id)
      .eq("wallet_address", normalizedAddress)
      .single();

    if (existingEntry) {
      return res.status(409).json({ error: "Address already in whitelist" });
    }

    const { data: entry, error: insertErr } = await supabase
      .from("event_whitelist")
      .insert({ event_id: id, wallet_address: normalizedAddress })
      .select()
      .single();

    if (insertErr) throw insertErr;

    res.status(201).json(entry);
  } catch (err) {
    console.error("POST /api/events/:id/whitelist error:", err);
    res.status(500).json({ error: err.message });
  }
});

// ──────────────────────────────────────────────
//  POST /api/events/:id/lock-roster — Close registration early
// ──────────────────────────────────────────────
router.post("/:id/lock-roster", async (req, res) => {
  try {
    const { id } = req.params;
    const { creator_address } = req.body;

    const { data: event } = await supabase
      .from("events")
      .select("*")
      .eq("id", id)
      .single();

    if (!event) return res.status(404).json({ error: "Event not found" });
    if (event.status !== "setup") {
      return res.status(400).json({ error: "Event is not in setup phase" });
    }
    if (!creator_address || event.creator_address.toLowerCase() !== creator_address.toLowerCase()) {
      return res.status(403).json({ error: "Only the event creator can lock the roster" });
    }

    const { data: participants } = await supabase
      .from("participants")
      .select("*")
      .eq("event_id", id);

    const count = participants?.length ?? 0;
    if (count < 2) {
      return res.status(400).json({ error: "Minimal 2 peserta terdaftar untuk mengunci roster" });
    }

    // Update event roster_locked to true (keeps status: setup)
    const { error: updateErr } = await supabase
      .from("events")
      .update({ roster_locked: true })
      .eq("id", id);

    if (updateErr) throw updateErr;

    res.json({ message: "Roster locked, registration closed", status: "setup", roster_locked: true, participant_count: count });
  } catch (err) {
    console.error("POST /api/events/:id/lock-roster error:", err);
    res.status(500).json({ error: err.message });
  }
});

// ──────────────────────────────────────────────
//  POST /api/events/:id/select-game-mode — Select dynamic game mode & gen blank bracket
// ──────────────────────────────────────────────
router.post("/:id/select-game-mode", async (req, res) => {
  try {
    const { id } = req.params;
    const { creator_address, game_mode, team_size = 1 } = req.body;

    if (!game_mode || !["1v1", "team", "ffa"].includes(game_mode)) {
      return res.status(400).json({ error: "Invalid or missing game_mode. Must be '1v1', 'team', or 'ffa'" });
    }

    const { data: event } = await supabase
      .from("events")
      .select("*")
      .eq("id", id)
      .single();

    if (!event) return res.status(404).json({ error: "Event not found" });
    if (event.status !== "setup" || !event.roster_locked) {
      return res.status(400).json({ error: "Event must be in setup phase and roster must be locked" });
    }
    if (!creator_address || event.creator_address.toLowerCase() !== creator_address.toLowerCase()) {
      return res.status(403).json({ error: "Only the event creator can choose the game mode" });
    }

    // Get current registered participants
    const { data: participants } = await supabase
      .from("participants")
      .select("*")
      .eq("event_id", id);

    const count = participants?.length ?? 0;
    if (count < 2) {
      return res.status(400).json({ error: "Minimal 2 peserta terdaftar untuk memilih mode pertandingan" });
    }

    // Update event table with the real game_mode and team_size
    const { error: updateEventErr } = await supabase
      .from("events")
      .update({
        game_mode,
        team_size: game_mode === "team" ? team_size : 1
      })
      .eq("id", id);

    if (updateEventErr) throw updateEventErr;

    // Delete any old draft brackets
    await supabase
      .from("brackets")
      .delete()
      .eq("event_id", id);

    // Generate blank Round 1 matches
    const bracketInserts = [];
    if (game_mode === "1v1") {
      const matchCount = Math.ceil(count / 2);
      for (let i = 0; i < matchCount; i++) {
        bracketInserts.push({
          event_id: id,
          round: 1,
          match_index: i,
          player_a: null,
          player_b: null,
          winner: null,
        });
      }
    } else if (game_mode === "team") {
      // 1 match for Red vs Blue
      bracketInserts.push({
        event_id: id,
        round: 1,
        match_index: 0,
        player_a: "team-0",
        player_b: "team-1",
        winner: null,
      });
    }

    if (bracketInserts.length > 0) {
      const { error: bracketErr } = await supabase
        .from("brackets")
        .insert(bracketInserts);
      if (bracketErr) throw bracketErr;
    }

    res.json({
      message: bracketInserts.length > 0
        ? "Game mode selected, blank draft brackets generated"
        : "Game mode selected successfully",
      game_mode,
      participant_count: count,
      matches_count: bracketInserts.length
    });
  } catch (err) {
    console.error("POST /api/events/:id/select-game-mode error:", err);
    res.status(500).json({ error: err.message });
  }
});

// ──────────────────────────────────────────────
//  POST /api/events/:id/draft-bracket — Save current bracket draft temporarily
// ──────────────────────────────────────────────
router.post("/:id/draft-bracket", async (req, res) => {
  try {
    const { id } = req.params;
    const { creator_address, matches } = req.body;

    if (!Array.isArray(matches)) {
      return res.status(400).json({ error: "Missing or invalid matches array" });
    }

    const { data: event } = await supabase
      .from("events")
      .select("*")
      .eq("id", id)
      .single();

    if (!event) return res.status(404).json({ error: "Event not found" });
    if (event.status !== "setup" || !event.roster_locked) {
      return res.status(400).json({ error: "Event must be in setup phase and roster must be locked to draft" });
    }
    if (!creator_address || event.creator_address.toLowerCase() !== creator_address.toLowerCase()) {
      return res.status(403).json({ error: "Only the creator can save bracket drafts" });
    }

    // Save draft matches
    for (const match of matches) {
      // Determine if one is BYE to set winner automatically
      let winnerVal = null;
      if (match.player_b === "BYE" && match.player_a) {
        winnerVal = match.player_a;
      } else if (match.player_a === "BYE" && match.player_b) {
        winnerVal = match.player_b;
      }

      const { error: draftErr } = await supabase
        .from("brackets")
        .update({
          player_a: match.player_a || null,
          player_b: match.player_b || null,
          winner: winnerVal
        })
        .eq("event_id", id)
        .eq("round", 1)
        .eq("match_index", match.match_index);

      if (draftErr) throw draftErr;
    }

    res.json({ message: "Draft bracket saved successfully" });
  } catch (err) {
    console.error("POST /api/events/:id/draft-bracket error:", err);
    res.status(500).json({ error: err.message });
  }
});

// ──────────────────────────────────────────────
//  POST /api/events/:id/distribute — Manual quorum-based prize distribution
// ──────────────────────────────────────────────
router.post("/:id/distribute", async (req, res) => {
  try {
    const { id } = req.params;
    const { creator_address } = req.body;

    const { data: event } = await supabase
      .from("events")
      .select("*")
      .eq("id", id)
      .single();

    if (!event) return res.status(404).json({ error: "Event not found" });
    if (event.status !== "voting") {
      return res.status(400).json({ error: "Event is not in voting phase" });
    }
    if (!creator_address || event.creator_address.toLowerCase() !== creator_address.toLowerCase()) {
      return res.status(403).json({ error: "Only the event creator can trigger distribution" });
    }

    // Check quorum: at least 51% of participants have voted
    const { data: allParticipants } = await supabase
      .from("participants")
      .select("id")
      .eq("event_id", id);

    const { data: allVotes } = await supabase
      .from("votes")
      .select("is_valid")
      .eq("event_id", id);

    const totalParticipants = allParticipants?.length ?? 0;
    const totalVotes = allVotes?.length ?? 0;

    if (totalParticipants === 0) {
      return res.status(400).json({ error: "No participants found" });
    }

    const quorumPercent = (totalVotes / totalParticipants) * 100;
    if (quorumPercent < 51) {
      return res.status(400).json({
        error: `Kuorum belum tercapai. Butuh minimal 51% suara, saat ini ${quorumPercent.toFixed(1)}% (${totalVotes}/${totalParticipants}).`,
        quorum_percent: quorumPercent,
      });
    }

    // Resolve consensus based on current votes
    await resolveConsensus(id);

    res.json({ message: "Distribution triggered successfully", quorum_percent: quorumPercent });
  } catch (err) {
    console.error("POST /api/events/:id/distribute error:", err);
    res.status(500).json({ error: err.message });
  }
});

// ──────────────────────────────────────────────
//  POST /api/events/:id/remove-participant — Remove participant (creator only, setup phase)
// ──────────────────────────────────────────────
router.post("/:id/remove-participant", async (req, res) => {
  try {
    const { id } = req.params;
    const { creator_address, wallet_address } = req.body;

    if (!creator_address || !wallet_address) {
      return res.status(400).json({ error: "Missing creator_address or wallet_address" });
    }

    const { data: event } = await supabase
      .from("events")
      .select("creator_address, status")
      .eq("id", id)
      .single();

    if (!event) return res.status(404).json({ error: "Event not found" });
    if (event.status !== "setup") {
      return res.status(400).json({ error: "Can only remove participants during setup phase" });
    }
    if (event.creator_address.toLowerCase() !== creator_address.toLowerCase()) {
      return res.status(403).json({ error: "Only the event creator can remove participants" });
    }

    const { error: delErr } = await supabase
      .from("participants")
      .delete()
      .eq("event_id", id)
      .eq("wallet_address", wallet_address);

    if (delErr) throw delErr;

    res.json({ message: "Participant removed", wallet_address });
  } catch (err) {
    console.error("POST /api/events/:id/remove-participant error:", err);
    res.status(500).json({ error: err.message });
  }
});

// ──────────────────────────────────────────────
//  POST /api/events/:id/start — Start tournament with dynamic brackets (BYE + asymmetrical teams)
// ──────────────────────────────────────────────
router.post("/:id/start", async (req, res) => {
  try {
    const { id } = req.params;

    const { data: event } = await supabase
      .from("events")
      .select("*")
      .eq("id", id)
      .single();

    if (!event) return res.status(404).json({ error: "Event not found" });
    if (event.status !== "setup") {
      return res.status(400).json({ error: "Event is already active or ended" });
    }
    if (!event.roster_locked) {
      return res.status(400).json({ error: "Pendaftaran harus ditutup (Roster Locked) sebelum memulai turnamen" });
    }

    const { data: participants } = await supabase
      .from("participants")
      .select("*")
      .eq("event_id", id);

    const count = participants?.length ?? 0;

    // Minimal validation: at least 2 participants
    if (count < 2) {
      return res.status(400).json({
        error: `Minimal 2 peserta terdaftar untuk memulai turnamen. Saat ini: ${count}`,
      });
    }

    // Fetch existing brackets to validate
    const { data: brackets } = await supabase
      .from("brackets")
      .select("*")
      .eq("event_id", id)
      .eq("round", 1);

    const startBracketGuardError = getStartBracketGuardError(event, brackets);
    if (startBracketGuardError) {
      return res.status(400).json({ error: startBracketGuardError });
    }

    // Team mode setup
    if (event.game_mode === "team") {
      // Shuffled and split into 2 teams
      const shuffled = participants.sort(() => Math.random() - 0.5);
      const teamASize = Math.ceil(count / 2);

      for (let i = 0; i < shuffled.length; i++) {
        const teamId = i < teamASize ? 0 : 1;
        await supabase
          .from("participants")
          .update({ team_id: teamId })
          .eq("id", shuffled[i].id);
      }

      // Ensure Team match exists (it was created in select-game-mode, but double check)
      const hasTeamMatch = brackets.some(m => m.match_index === 0);
      if (!hasTeamMatch) {
        await supabase
          .from("brackets")
          .insert({
            event_id: id,
            round: 1,
            match_index: 0,
            player_a: "team-0",
            player_b: "team-1",
          });
      }
    }

    // Update event status to active
    const { error: updateErr } = await supabase
      .from("events")
      .update({ status: "active" })
      .eq("id", id);

    if (updateErr) throw updateErr;

    res.json({ message: "Event started successfully", status: "active" });
  } catch (err) {
    console.error("POST /api/events/:id/start error:", err);
    res.status(500).json({ error: err.message });
  }
});

// ──────────────────────────────────────────────
//  POST /api/events/:id/bracket/advance
// ──────────────────────────────────────────────
router.post("/:id/bracket/advance", async (req, res) => {
  try {
    const { id } = req.params;
    const { match_id, winner } = req.body;

    if (!match_id || !winner) {
      return res.status(400).json({ error: "Missing match_id or winner" });
    }

    // Update bracket winner
    const { data: match, error: matchErr } = await supabase
      .from("brackets")
      .update({ winner })
      .eq("id", match_id)
      .select()
      .single();

    if (matchErr || !match) {
      return res.status(404).json({ error: "Match not found" });
    }

    // Mark loser as eliminated
    const loser = match.player_a === winner ? match.player_b : match.player_a;

    if (loser && !loser.startsWith("team-")) {
      await supabase
        .from("participants")
        .update({ status: "eliminated" })
        .eq("event_id", id)
        .eq("wallet_address", loser);
    }

    // Check if all matches in current round are complete.
    // Order by match_index so pairing for the next round is deterministic
    // regardless of Postgres return order (bracket-determinism spec).
    const { data: currentRoundMatches } = await supabase
      .from("brackets")
      .select("*")
      .eq("event_id", id)
      .eq("round", match.round)
      .order("match_index", { ascending: true });

    const allComplete = currentRoundMatches?.every((m) => m.winner !== null);

    if (allComplete && currentRoundMatches.length > 1) {
      const nextBrackets = generateNextRoundBrackets(
        currentRoundMatches,
        id,
        match.round + 1
      );

      const { error: nextErr } = await supabase
        .from("brackets")
        .insert(nextBrackets);

      if (nextErr) throw nextErr;
    }

    res.json({ message: "Match advanced", match });
  } catch (err) {
    console.error("POST /api/events/:id/bracket/advance error:", err);
    res.status(500).json({ error: err.message });
  }
});

// ──────────────────────────────────────────────
//  GET /api/events/:id/bracket
// ──────────────────────────────────────────────
router.get("/:id/bracket", async (req, res) => {
  try {
    const { id } = req.params;

    const { data: brackets, error } = await supabase
      .from("brackets")
      .select("*")
      .eq("event_id", id)
      .order("round", { ascending: true })
      .order("match_index", { ascending: true });

    if (error) throw error;

    res.json(brackets ?? []);
  } catch (err) {
    console.error("GET /api/events/:id/bracket error:", err);
    res.status(500).json({ error: err.message });
  }
});

// ──────────────────────────────────────────────
//  POST /api/events/:id/photo
// ──────────────────────────────────────────────
const multer = require("multer");
const upload = multer({ storage: multer.memoryStorage() });

router.post("/:id/photo", upload.single("photo"), async (req, res) => {
  try {
    const { id } = req.params;
    const { wallet_address } = req.body;

    if (!wallet_address || !req.file) {
      return res.status(400).json({ error: "Missing wallet_address or photo file" });
    }

    // Upload to Supabase Storage
    const fileName = `${id}/${wallet_address}-${Date.now()}.${req.file.originalname?.split(".").pop() || "jpg"}`;

    const { error: uploadErr } = await supabase.storage
      .from("photos")
      .upload(fileName, req.file.buffer, {
        contentType: req.file.mimetype,
      });

    if (uploadErr) throw uploadErr;

    const { data: urlData } = supabase.storage.from("photos").getPublicUrl(fileName);

    // Update participant photo URL
    const { error: updateErr } = await supabase
      .from("participants")
      .update({ uploaded_photo_url: urlData.publicUrl })
      .eq("event_id", id)
      .eq("wallet_address", wallet_address);

    if (updateErr) throw updateErr;

    res.json({ url: urlData.publicUrl });
  } catch (err) {
    console.error("POST /api/events/:id/photo error:", err);
    res.status(500).json({ error: err.message });
  }
});

// ──────────────────────────────────────────────
//  POST /api/events/:id/end — Submit winners
// ──────────────────────────────────────────────
router.post("/:id/end", async (req, res) => {
  try {
    const { id } = req.params;
    const { winners } = req.body; // array of wallet addresses (ranked for FFA)

    if (!winners || !Array.isArray(winners) || winners.length === 0) {
      return res.status(400).json({ error: "Missing winners array" });
    }

    const { data: event } = await supabase
      .from("events")
      .select("*")
      .eq("id", id)
      .single();

    if (!event) return res.status(404).json({ error: "Event not found" });
    if (event.status !== "active") {
      return res.status(400).json({ error: "Event is not active" });
    }

    // Photo audit: if required, check all winners have uploaded photos
    if (event.photo_required) {
      const { data: winnerParticipants } = await supabase
        .from("participants")
        .select("wallet_address, uploaded_photo_url")
        .eq("event_id", id)
        .in("wallet_address", winners);

      const missingPhotos = winnerParticipants?.filter(
        (p) => !p.uploaded_photo_url
      );

      if (missingPhotos && missingPhotos.length > 0) {
        return res.status(400).json({
          error: "Photo audit failed: some winners have not uploaded photos",
          missing: missingPhotos.map((p) => p.wallet_address),
        });
      }
    }

    // Mark winners
    await supabase
      .from("participants")
      .update({ status: "winner" })
      .eq("event_id", id)
      .in("wallet_address", winners);

    // Transition to voting
    await supabase
      .from("events")
      .update({
        status: "voting",
        winners_submitted_at: new Date().toISOString(),
      })
      .eq("id", id);

    res.json({ message: "Winners submitted, voting opened", status: "voting" });
  } catch (err) {
    console.error("POST /api/events/:id/end error:", err);
    res.status(500).json({ error: err.message });
  }
});

// ──────────────────────────────────────────────
//  POST /api/events/:id/vote
// ──────────────────────────────────────────────
router.post("/:id/vote", async (req, res) => {
  try {
    const { id } = req.params;
    const { voter_address, is_valid } = req.body;

    if (!voter_address || typeof is_valid !== "boolean") {
      return res.status(400).json({ error: "Missing voter_address or is_valid (boolean)" });
    }

    // Validate event is in voting state
    const { data: event } = await supabase
      .from("events")
      .select("status")
      .eq("id", id)
      .single();

    if (!event) return res.status(404).json({ error: "Event not found" });
    if (event.status !== "voting") {
      return res.status(400).json({ error: "Event is not in voting phase" });
    }

    // Validate voter is a participant
    const { data: participant } = await supabase
      .from("participants")
      .select("id")
      .eq("event_id", id)
      .eq("wallet_address", voter_address)
      .single();

    if (!participant) {
      return res.status(403).json({ error: "Only registered participants can vote" });
    }

    // Check if already voted
    const { data: existingVote } = await supabase
      .from("votes")
      .select("id")
      .eq("event_id", id)
      .eq("voter_address", voter_address)
      .single();

    if (existingVote) {
      return res.status(409).json({ error: "Already voted" });
    }

    // Insert vote
    const { data: vote, error: voteErr } = await supabase
      .from("votes")
      .insert({ event_id: id, voter_address, is_valid })
      .select()
      .single();

    if (voteErr) throw voteErr;

    // Check if all participants have voted → auto-resolve
    const { data: allParticipants } = await supabase
      .from("participants")
      .select("id")
      .eq("event_id", id);

    const { data: allVotes } = await supabase
      .from("votes")
      .select("is_valid")
      .eq("event_id", id);

    if (allVotes?.length === allParticipants?.length) {
      await resolveConsensus(id);
    }

    res.status(201).json(vote);
  } catch (err) {
    console.error("POST /api/events/:id/vote error:", err);
    res.status(500).json({ error: err.message });
  }
});

// ──────────────────────────────────────────────
//  POST /api/events/:id/appeal
// ──────────────────────────────────────────────
router.post("/:id/appeal", async (req, res) => {
  try {
    const { id } = req.params;
    const { winners } = req.body;

    if (!winners || !Array.isArray(winners) || winners.length === 0) {
      return res.status(400).json({ error: "Missing revised winners array" });
    }

    const { data: event } = await supabase
      .from("events")
      .select("*")
      .eq("id", id)
      .single();

    if (!event) return res.status(404).json({ error: "Event not found" });
    if (event.status !== "disputed") {
      return res.status(400).json({ error: "Event is not in disputed status" });
    }

    // Clear previous votes
    await supabase.from("votes").delete().eq("event_id", id);

    // Reset previous winners
    await supabase
      .from("participants")
      .update({ status: "registered" })
      .eq("event_id", id)
      .eq("status", "winner");

    // Set new winners
    await supabase
      .from("participants")
      .update({ status: "winner" })
      .eq("event_id", id)
      .in("wallet_address", winners);

    // Reopen voting
    await supabase
      .from("events")
      .update({
        status: "voting",
        winners_submitted_at: new Date().toISOString(),
      })
      .eq("id", id);

    res.json({ message: "Appeal submitted, new voting round opened", status: "voting" });
  } catch (err) {
    console.error("POST /api/events/:id/appeal error:", err);
    res.status(500).json({ error: err.message });
  }
});

// ──────────────────────────────────────────────
//  Settlement Helper (escrow-payout-integrity / F1 + F2)
//
//  Reads the REAL prize pool from on-chain state (getEventInfo) and only
//  advances the event to 'ended' after a successful receipt. Any failure is
//  recorded as 'settlement_failed' (with error + tx hash) so it can be retried.
//  Clients (publicClient/walletClient/supabase) are injectable for testing.
// ──────────────────────────────────────────────
async function settleEvent(event, { isDistribute }, deps = {}) {
  const pub = deps.publicClient || publicClient;
  const wallet = deps.walletClient || walletClient;
  const db = deps.supabase || supabase;

  const eventId = event.id;
  const eventIdBytes32 = uuidToBytes32(eventId);

  const markFailed = async (message, txHash) => {
    const update = { status: "settlement_failed", settlement_error: message };
    if (txHash) update.settlement_tx_hash = txHash;
    await db.from("events").update(update).eq("id", eventId);
  };

  // 1. Read on-chain truth: the pool the vault actually holds + distributed flag.
  let prizePool;
  let distributed;
  try {
    const info = await pub.readContract({
      address: VAULT_ADDRESS,
      abi: VAULT_ABI,
      functionName: "getEventInfo",
      args: [eventIdBytes32],
    });
    prizePool = info[2];
    distributed = info[3];
  } catch (readErr) {
    console.error("settleEvent: getEventInfo read failed:", readErr);
    await markFailed(`getEventInfo read failed: ${readErr.message}`, null);
    return { ok: false, error: readErr.message };
  }

  // 2. Idempotency: if funds already moved on-chain, just sync the DB status.
  if (distributed) {
    await db
      .from("events")
      .update({ status: "ended", settlement_error: null })
      .eq("id", eventId);
    return { ok: true, alreadyDistributed: true };
  }

  // 3. Build and send the settlement transaction.
  let txHash = null;
  try {
    if (isDistribute) {
      const { data: winners } = await db
        .from("participants")
        .select("wallet_address")
        .eq("event_id", eventId)
        .eq("status", "winner");

      if (!winners || winners.length === 0) {
        await markFailed("No winners recorded for distribution", null);
        return { ok: false, error: "no winners" };
      }

      // Shares derived from the ON-CHAIN pool so sum(shares) === prizePool;
      // the rounding remainder goes to the last winner (never SharesMismatch).
      const winnerAddresses = winners.map((w) => w.wallet_address);
      const sharePerWinner = prizePool / BigInt(winners.length);
      const shares = winners.map(() => sharePerWinner);
      const sumShares = shares.reduce((a, b) => a + b, 0n);
      if (sumShares < prizePool) {
        shares[shares.length - 1] += prizePool - sumShares;
      }

      txHash = await wallet.writeContract({
        address: VAULT_ADDRESS,
        abi: VAULT_ABI,
        functionName: "distributePrize",
        args: [eventIdBytes32, winnerAddresses, shares],
      });
    } else {
      txHash = await wallet.writeContract({
        address: VAULT_ADDRESS,
        abi: VAULT_ABI,
        functionName: "emergencyRefund",
        args: [eventIdBytes32],
      });
    }

    const receipt = await pub.waitForTransactionReceipt({ hash: txHash });
    if (receipt.status !== "success") {
      throw new Error(`Transaction reverted on-chain (status=${receipt.status})`);
    }
  } catch (chainErr) {
    console.error(
      `settleEvent: on-chain ${isDistribute ? "distributePrize" : "emergencyRefund"} failed:`,
      chainErr
    );
    await markFailed(chainErr.message, txHash);
    return { ok: false, error: chainErr.message };
  }

  // 4. Success — only NOW mark the event ended.
  await db
    .from("events")
    .update({ status: "ended", settlement_tx_hash: txHash, settlement_error: null })
    .eq("id", eventId);
  return { ok: true, txHash };
}

// Authorization decision for POST /:id/retry-settlement — pure & unit-testable.
function authorizeRetrySettlement(event, callerAddress, adminAddress) {
  if (!event) return { ok: false, code: 404, error: "Event not found" };
  const caller = (callerAddress || "").toLowerCase();
  const isCreator = !!caller && caller === event.creator_address.toLowerCase();
  const isAdmin = !!caller && !!adminAddress && caller === adminAddress.toLowerCase();
  if (!isCreator && !isAdmin) {
    return { ok: false, code: 403, error: "Only the event creator or admin can retry settlement" };
  }
  if (event.status !== "settlement_failed") {
    return { ok: false, code: 400, error: "Retry is only allowed for events in 'settlement_failed' status" };
  }
  return { ok: true };
}

/**
 * Build the next round of bracket matches from completed-round matches.
 *
 * Sorts the input by `match_index` ascending (defensively — the SQL query
 * already orders, but the helper stays correct under any input order) and
 * pairs winners[i] with winners[i+1]. Odd winner gets a BYE (player_b = null).
 *
 * Pure function — no DB calls — so it can be unit-tested in isolation.
 */
function generateNextRoundBrackets(currentRoundMatches, eventId, nextRound) {
  const ordered = [...(currentRoundMatches || [])].sort(
    (a, b) => a.match_index - b.match_index
  );
  const winners = ordered.map((m) => m.winner);

  const nextBrackets = [];
  for (let i = 0; i < winners.length; i += 2) {
    nextBrackets.push({
      event_id: eventId,
      round: nextRound,
      match_index: Math.floor(i / 2),
      player_a: winners[i],
      player_b: winners[i + 1] || null, // bye if odd
    });
  }
  return nextBrackets;
}

function getStartBracketGuardError(event, brackets) {
  if (event.game_mode === "ffa") return null;
  if (!brackets || brackets.length === 0) {
    return "Draf bagan pertandingan belum di-generate";
  }

  if (event.game_mode === "1v1") {
    for (const match of brackets) {
      if (!match.player_a || !match.player_b) {
        return `Pertandingan ${match.match_index + 1} masih memiliki slot kosong. Lengkapi draf bagan terlebih dahulu.`;
      }
    }
  }

  return null;
}

async function applyMinorityPenalty(eventId, voterAddress, options = {}) {
  const db = options.supabase || supabase;
  const loadReputation = options.getRegeneratedReputation || getRegeneratedReputation;

  const currentHp = (await loadReputation(voterAddress)).current_hp;
  const newScore = Math.max(0, currentHp - 10);

  await db.from("reputation_tracking").insert({
    wallet_address: voterAddress,
    event_id: eventId,
    was_minority: true,
    reputation_score: newScore,
  });

  return newScore;
}

// ──────────────────────────────────────────────
//  Consensus Resolution Helper
// ──────────────────────────────────────────────
async function resolveConsensus(eventId, isTimeout = false) {
  const { data: event } = await supabase
    .from("events")
    .select("*")
    .eq("id", eventId)
    .single();

  if (!event || event.status !== "voting") return;

  const { data: votes } = await supabase
    .from("votes")
    .select("*")
    .eq("event_id", eventId);

  if (!votes || votes.length === 0) {
    if (!isTimeout) return;
    await settleEvent(event, { isDistribute: false });
    return;
  }

  const agreeCount = votes.filter((v) => v.is_valid).length;
  const rejectCount = votes.length - agreeCount;
  const agreePercent = (agreeCount / votes.length) * 100;

  // Check for 50/50 tie
  if (agreeCount === rejectCount) {
    await supabase
      .from("events")
      .update({ status: "disputed" })
      .eq("id", eventId);

    return;
  }

  // Settle on-chain. Pool & shares come from on-chain state (getEventInfo), and
  // the event only becomes 'ended' after a successful receipt; otherwise it is
  // marked 'settlement_failed' for retry (escrow-payout-integrity / F1 + F2).
  const isDistribute = agreePercent >= event.consensus_threshold;
  await settleEvent(event, { isDistribute });

  // Minority Penalty: if consensus >= 85%, mark minority voters
  if (agreePercent >= 85 || agreePercent <= 15) {
    const majorityIsAgree = agreePercent >= 85;
    const minorityVoters = votes.filter((v) =>
      majorityIsAgree ? !v.is_valid : v.is_valid
    );

    for (const v of minorityVoters) {
      await applyMinorityPenalty(eventId, v.voter_address);
    }
  }
}
// ──────────────────────────────────────────────
//  GET /api/events/leaderboard/reputation — Reputation Leaderboard
// ──────────────────────────────────────────────
router.get("/leaderboard/reputation", async (_req, res) => {
  try {
    // Get the latest reputation score for each unique wallet
    const { data: reputations, error } = await supabase
      .from("reputation_tracking")
      .select("wallet_address, reputation_score, created_at")
      .order("created_at", { ascending: false });

    if (error) throw error;

    // De-duplicate: keep only the latest score per wallet
    const latestByWallet = {};
    for (const r of (reputations ?? [])) {
      if (!latestByWallet[r.wallet_address]) {
        latestByWallet[r.wallet_address] = r;
      }
    }

    // Sort by reputation_score descending
    const leaderboard = Object.values(latestByWallet)
      .sort((a, b) => b.reputation_score - a.reputation_score)
      .slice(0, 50); // Top 50

    res.json(leaderboard);
  } catch (err) {
    console.error("GET /api/events/leaderboard/reputation error:", err);
    res.status(500).json({ error: err.message });
  }
});

// ──────────────────────────────────────────────
//  GET /api/events/reputation/:wallet — Get reputation for a specific wallet
// ──────────────────────────────────────────────
router.get("/reputation/:wallet", async (req, res) => {
  try {
    const { wallet } = req.params;
    const repData = await getRegeneratedReputation(wallet);

    res.json({ 
      wallet_address: wallet, 
      reputation_score: repData.current_hp,
      base_score: repData.base_score,
      points_regenerated: repData.points_gained,
      latest_penalty_at: repData.latest_penalty_at
    });
  } catch (err) {
    console.error("GET /api/events/reputation/:wallet error:", err);
    res.status(500).json({ error: err.message });
  }
});

// ──────────────────────────────────────────────
//  POST /api/events/:id/retry-settlement — Retry a failed escrow settlement
//  (creator/admin only; valid only while status === 'settlement_failed')
// ──────────────────────────────────────────────
router.post("/:id/retry-settlement", async (req, res) => {
  try {
    const { id } = req.params;
    const { caller_address } = req.body;

    if (!caller_address) {
      return res.status(400).json({ error: "Missing caller_address" });
    }

    const { data: event, error: eventErr } = await supabase
      .from("events")
      .select("*")
      .eq("id", id)
      .single();

    const auth = authorizeRetrySettlement(
      eventErr ? null : event,
      caller_address,
      adminAccount?.address
    );
    if (!auth.ok) {
      return res.status(auth.code).json({ error: auth.error });
    }

    // Recompute the settlement decision from the cast votes (same as resolveConsensus).
    const { data: votes } = await supabase
      .from("votes")
      .select("is_valid")
      .eq("event_id", id);
    const total = (votes || []).length;
    const agreeCount = (votes || []).filter((v) => v.is_valid).length;
    const agreePercent = total > 0 ? (agreeCount / total) * 100 : 0;
    const isDistribute = agreePercent >= event.consensus_threshold;

    const result = await settleEvent(event, { isDistribute });
    if (!result.ok) {
      return res
        .status(502)
        .json({ error: "Settlement retry failed", detail: result.error });
    }

    res.json({ status: "ended", tx_hash: result.txHash ?? null });
  } catch (err) {
    console.error("POST /api/events/:id/retry-settlement error:", err);
    res.status(500).json({ error: err.message });
  }
});

// Export for use in cron and main app
module.exports = router;
module.exports.resolveConsensus = resolveConsensus;
module.exports.settleEvent = settleEvent;
module.exports.authorizeRetrySettlement = authorizeRetrySettlement;
module.exports.getStartBracketGuardError = getStartBracketGuardError;
module.exports.applyMinorityPenalty = applyMinorityPenalty;
module.exports.generateNextRoundBrackets = generateNextRoundBrackets;
