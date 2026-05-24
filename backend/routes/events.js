const express = require("express");
const bcrypt = require("bcryptjs");
const { supabase } = require("../lib/supabase");
const {
  publicClient,
  walletClient,
  VAULT_ABI,
  uuidToBytes32,
  parseEther,
} = require("../lib/blockchain");

const router = express.Router();

const VAULT_ADDRESS = process.env.VAULT_CONTRACT_ADDRESS;

// ──────────────────────────────────────────────
//  POST /api/events — Create tournament
// ──────────────────────────────────────────────
router.post("/", async (req, res) => {
  try {
    const {
      title,
      game_mode,
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
    if (!title || !game_mode || !ticket_price || !creator_address) {
      return res.status(400).json({ error: "Missing required fields: title, game_mode, ticket_price, creator_address" });
    }
    if (!["1v1", "team", "ffa"].includes(game_mode)) {
      return res.status(400).json({ error: "game_mode must be '1v1', 'team', or 'ffa'" });
    }
    if (!["password", "invite_only"].includes(access_type)) {
      return res.status(400).json({ error: "access_type must be 'password' or 'invite_only'" });
    }

    // Hash password if access_type is password
    let passwordHash = null;
    if (access_type === "password") {
      if (!password || typeof password !== "string" || password.trim().length === 0) {
        return res.status(400).json({ error: "Password is required for password-protected events" });
      }
      passwordHash = await bcrypt.hash(password.trim(), 10);
    }

    // Insert event into Supabase
    const { data: event, error: dbError } = await supabase
      .from("events")
      .insert({
        title,
        game_mode,
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
    const ticketPriceWei = parseEther(String(ticket_price));

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

    // ── Creator Restriction Guard ──
    if (wallet_address.toLowerCase() === event.creator_address.toLowerCase()) {
      return res.status(403).json({ error: "Kreator tidak diizinkan untuk mendaftar ke turnamen buatan sendiri" });
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

    // Insert participant
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
//  POST /api/events/:id/start
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
      return res.status(400).json({ error: "Event already started" });
    }

    const { data: participants } = await supabase
      .from("participants")
      .select("*")
      .eq("event_id", id);

    const count = participants?.length ?? 0;

    // Validate participant count by game mode
    if (event.game_mode === "1v1") {
      if (count < 2 || (count & (count - 1)) !== 0) {
        return res.status(400).json({
          error: `1v1 mode requires 2^n participants (2, 4, 8, 16...). Current: ${count}`,
        });
      }
    } else if (event.game_mode === "team") {
      if (count < event.team_size * 2 || count % event.team_size !== 0) {
        return res.status(400).json({
          error: `Team mode requires participants divisible by team_size (${event.team_size}). Current: ${count}`,
        });
      }
    }
    // FFA: no count constraint

    // Generate brackets for 1v1
    if (event.game_mode === "1v1") {
      const shuffled = participants.sort(() => Math.random() - 0.5);
      const bracketInserts = [];

      for (let i = 0; i < shuffled.length; i += 2) {
        bracketInserts.push({
          event_id: id,
          round: 1,
          match_index: Math.floor(i / 2),
          player_a: shuffled[i].wallet_address,
          player_b: shuffled[i + 1].wallet_address,
        });
      }

      const { error: bracketErr } = await supabase
        .from("brackets")
        .insert(bracketInserts);

      if (bracketErr) throw bracketErr;
    }

    // Generate teams for Team mode
    if (event.game_mode === "team") {
      const shuffled = participants.sort(() => Math.random() - 0.5);
      const teamCount = Math.floor(count / event.team_size);

      // Assign team IDs
      for (let i = 0; i < shuffled.length; i++) {
        const teamId = Math.floor(i / event.team_size);
        await supabase
          .from("participants")
          .update({ team_id: teamId })
          .eq("id", shuffled[i].id);
      }

      // Create team brackets (team 0 vs team 1, team 2 vs team 3...)
      const bracketInserts = [];
      for (let i = 0; i < teamCount; i += 2) {
        bracketInserts.push({
          event_id: id,
          round: 1,
          match_index: Math.floor(i / 2),
          player_a: `team-${i}`,
          player_b: `team-${i + 1}`,
        });
      }

      if (bracketInserts.length > 0) {
        const { error: bracketErr } = await supabase
          .from("brackets")
          .insert(bracketInserts);
        if (bracketErr) throw bracketErr;
      }
    }

    // Update event status to active
    const { error: updateErr } = await supabase
      .from("events")
      .update({ status: "active" })
      .eq("id", id);

    if (updateErr) throw updateErr;

    res.json({ message: "Event started", status: "active" });
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

    // Check if all matches in current round are complete
    const { data: currentRoundMatches } = await supabase
      .from("brackets")
      .select("*")
      .eq("event_id", id)
      .eq("round", match.round);

    const allComplete = currentRoundMatches?.every((m) => m.winner !== null);

    if (allComplete && currentRoundMatches.length > 1) {
      // Generate next round
      const winners = currentRoundMatches.map((m) => m.winner);
      const nextRound = match.round + 1;
      const nextBrackets = [];

      for (let i = 0; i < winners.length; i += 2) {
        nextBrackets.push({
          event_id: id,
          round: nextRound,
          match_index: Math.floor(i / 2),
          player_a: winners[i],
          player_b: winners[i + 1] || null, // bye if odd
        });
      }

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
//  Consensus Resolution Helper
// ──────────────────────────────────────────────
async function resolveConsensus(eventId) {
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

  if (!votes || votes.length === 0) return;

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

  if (agreePercent >= event.consensus_threshold) {
    // Consensus reached — distribute prizes on-chain via Viem
    const { data: winners } = await supabase
      .from("participants")
      .select("wallet_address")
      .eq("event_id", eventId)
      .eq("status", "winner");

    if (winners && winners.length > 0) {
      const eventIdBytes32 = uuidToBytes32(eventId);
      const { data: onChainEvent } = await supabase
        .from("events")
        .select("ticket_price")
        .eq("id", eventId)
        .single();

      const { data: allParticipants } = await supabase
        .from("participants")
        .select("id")
        .eq("event_id", eventId);

      const totalPool = parseEther(
        String(onChainEvent.ticket_price * allParticipants.length)
      );
      const sharePerWinner = totalPool / BigInt(winners.length);

      const winnerAddresses = winners.map((w) => w.wallet_address);
      const shares = winners.map(() => sharePerWinner);

      // Adjust last share for rounding
      const sumShares = shares.reduce((a, b) => a + b, 0n);
      if (sumShares < totalPool) {
        shares[shares.length - 1] += totalPool - sumShares;
      }

      try {
        const txHash = await walletClient.writeContract({
          address: VAULT_ADDRESS,
          abi: VAULT_ABI,
          functionName: "distributePrize",
          args: [eventIdBytes32, winnerAddresses, shares],
        });
        await publicClient.waitForTransactionReceipt({ hash: txHash });
      } catch (chainErr) {
        console.error("On-chain distributePrize failed:", chainErr);
      }
    }

    await supabase
      .from("events")
      .update({ status: "ended" })
      .eq("id", eventId);
  } else {
    // Consensus NOT reached — emergency refund via Viem
    const eventIdBytes32 = uuidToBytes32(eventId);
    try {
      const txHash = await walletClient.writeContract({
        address: VAULT_ADDRESS,
        abi: VAULT_ABI,
        functionName: "emergencyRefund",
        args: [eventIdBytes32],
      });
      await publicClient.waitForTransactionReceipt({ hash: txHash });
    } catch (chainErr) {
      console.error("On-chain emergencyRefund failed:", chainErr);
    }

    await supabase
      .from("events")
      .update({ status: "ended" })
      .eq("id", eventId);
  }

  // Minority Penalty: if consensus >= 85%, mark minority voters
  if (agreePercent >= 85 || agreePercent <= 15) {
    const majorityIsAgree = agreePercent >= 85;
    const minorityVoters = votes.filter((v) =>
      majorityIsAgree ? !v.is_valid : v.is_valid
    );

    for (const v of minorityVoters) {
      // Check existing reputation
      const { data: existing } = await supabase
        .from("reputation_tracking")
        .select("reputation_score")
        .eq("wallet_address", v.voter_address)
        .order("created_at", { ascending: false })
        .limit(1)
        .single();

      const currentScore = existing?.reputation_score ?? 100;
      const newScore = Math.max(0, currentScore - 10);

      await supabase.from("reputation_tracking").insert({
        wallet_address: v.voter_address,
        event_id: eventId,
        was_minority: true,
        reputation_score: newScore,
      });
    }
  }
}

// Export for use in cron and main app
module.exports = router;
module.exports.resolveConsensus = resolveConsensus;
