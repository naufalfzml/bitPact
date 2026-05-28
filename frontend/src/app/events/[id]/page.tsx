"use client";

import React, { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useAccount, useWriteContract, usePublicClient } from "wagmi";
import { parseUnits, formatUnits, keccak256, stringToBytes } from "viem";
import { API_BASE_URL, VAULT_CONTRACT_ADDRESS, USDC_TOKEN_ADDRESS, VAULT_ABI, USDC_ABI, PROTOCOL_FEE_BPS, getTxExplorerUrl } from "@/constants";
import { generateGamerTag } from "@/app/components/ConnectButtonClient";
import { useToast } from "@/app/components/Toast";
import { Modal, ModalTone } from "@/app/components/Modal";

interface Participant {
  id: string;
  wallet_address: string;
  team_id: number | null;
  status: "registered" | "eliminated" | "winner";
}

interface BracketMatch {
  id: string;
  round: number;
  match_index: number;
  player_a: string | null;
  player_b: string | null;
  winner: string | null;
}

interface EventDetail {
  id: string;
  title: string;
  game_mode: "1v1" | "team" | "ffa";
  team_size: number;
  ticket_price: string;
  consensus_threshold: number;
  status: "setup" | "active" | "voting" | "ended" | "disputed" | "settlement_failed";
  creator_address: string;
  created_at: string;
  access_type: "public" | "password" | "invite_only";
  roster_locked?: boolean;
  max_participants?: number;
  settlement_error?: string | null;
  settlement_tx_hash?: string | null;
  participants: Participant[];
  brackets: BracketMatch[];
  voting: {
    total: number;
    agree: number;
    reject: number;
    percentage: string | null;
  };
}

type SelectableGameMode = "1v1" | "team" | "ffa";

// Map backend team identifiers (team_id 0/1 or bracket token "team-0"/"team-1")
// to 1-based display labels used consistently across roster + bracket.
function teamLabel(idOrToken: number | string): string {
  const n =
    typeof idOrToken === "number"
      ? idOrToken
      : Number(String(idOrToken).replace("team-", ""));
  return `Team ${n + 1}`;
}

export default function EventDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const { address, isConnected } = useAccount();
  const { writeContractAsync } = useWriteContract();
  const publicClient = usePublicClient();
  const toast = useToast();

  const [event, setEvent] = useState<EventDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [registering, setRegistering] = useState(false);
  const [statusMessage, setStatusMessage] = useState("");

  // Centered modal for confirmations & errors (success/tx-hash stay as toasts).
  const [modal, setModal] = useState<{
    title: string;
    message: string;
    tone?: ModalTone;
    onConfirm?: () => void;
    confirmLabel?: string;
  } | null>(null);

  // Settlement recovery state (status === "settlement_failed")
  const [isRetrying, setIsRetrying] = useState(false);
  const [retryError, setRetryError] = useState<string | null>(null);

  // Manual Winner inputs for FFA Mode
  const [ffaWinner1, setFfaWinner1] = useState("");
  const [ffaWinner2, setFfaWinner2] = useState("");
  const [ffaWinner3, setFfaWinner3] = useState("");

  // Dispute / Appeal revised winners input
  const [appealWinners, setAppealWinners] = useState("");

  // Bracket Drafting states
  const [selectedGameMode, setSelectedGameMode] = useState<SelectableGameMode>("1v1");
  const [isGeneratingBracket, setIsGeneratingBracket] = useState(false);
  const [isSavingDraft, setIsSavingDraft] = useState(false);
  const [isStartingEvent, setIsStartingEvent] = useState(false);
  const [localDraftMatches, setLocalDraftMatches] = useState<BracketMatch[]>([]);

  // Team-mode draft: wallet_address -> team_id (0 = Team 1, 1 = Team 2)
  const [teamDraft, setTeamDraft] = useState<Record<string, number>>({});
  const [isSavingTeams, setIsSavingTeams] = useState(false);

  // Sync draft matches from event detail
  useEffect(() => {
    if (event && event.status === "setup" && event.roster_locked && event.brackets) {
      setLocalDraftMatches(event.brackets);
    }
    // Seed team draft from saved team_id, else default to a balanced split.
    if (event && event.status === "setup" && event.roster_locked && event.game_mode === "team") {
      const half = Math.ceil(event.participants.length / 2);
      const seed: Record<string, number> = {};
      event.participants.forEach((p, i) => {
        seed[p.wallet_address] = p.team_id === 0 || p.team_id === 1 ? p.team_id : i < half ? 0 : 1;
      });
      setTeamDraft(seed);
    }
  }, [event]);

  // Social Connect lookup state
  const [socialInput, setSocialInput] = useState("");
  const [socialLookupStatus, setSocialLookupStatus] = useState<"idle" | "loading" | "resolved" | "not_resolved">("idle");
  const [resolvedAddress, setResolvedAddress] = useState<string | null>(null);

  // Private Event — Password registration
  const [roomPassword, setRoomPassword] = useState("");
  const [passwordError, setPasswordError] = useState<string | null>(null);

  // Private Event — Whitelist check
  const [whitelistChecked, setWhitelistChecked] = useState(false);
  const [isWhitelisted, setIsWhitelisted] = useState(false);

  // Whitelist management (creator, invite-only)
  const [whitelistManualAddr, setWhitelistManualAddr] = useState("");
  const [addingToWhitelist, setAddingToWhitelist] = useState(false);

  const fetchEventDetail = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/events/${id}`);
      if (!res.ok) throw new Error("Failed to load tournament details");
      const data = await res.json();
      setEvent(data);

      // Pre-fill dispute/manual fields if needed
      if (data.game_mode === "ffa") {
        const winners = data.participants.filter((p: Participant) => p.status === "winner");
        if (winners.length > 0) {
          setFfaWinner1(winners[0]?.wallet_address || "");
          setFfaWinner2(winners[1]?.wallet_address || "");
          setFfaWinner3(winners[2]?.wallet_address || "");
        }
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (id) {
      fetchEventDetail();
    }
  }, [id]);

  const isCreator = !!(address && event && address.toLowerCase() === event.creator_address.toLowerCase());
  const isRegistered = !!(address && event && event.participants.some(p => p.wallet_address.toLowerCase() === address.toLowerCase()));
  const myParticipantObj = (address && event) ? event.participants.find(p => p.wallet_address.toLowerCase() === address.toLowerCase()) : null;

  // Check whitelist status for invite-only events
  React.useEffect(() => {
    if (event && event.access_type === "invite_only" && address && !isCreator && !isRegistered && !whitelistChecked) {
      (async () => {
        try {
          // We attempt a lightweight check by querying the event whitelist via the register endpoint behavior.
          // A better approach would be a dedicated GET endpoint, but for now we check via the existing infrastructure.
          const res = await fetch(`${API_BASE_URL}/events/${event.id}/whitelist/check?wallet=${address.toLowerCase()}`);
          if (res.ok) {
            const data = await res.json();
            setIsWhitelisted(data.whitelisted === true);
          }
        } catch {
          // If the check endpoint doesn't exist yet, we'll just let the registration attempt handle it
          setIsWhitelisted(false);
        } finally {
          setWhitelistChecked(true);
        }
      })();
    }
  }, [event, address, isCreator, isRegistered, whitelistChecked]);

  if (loading) {
    return <div className="bp-text-center bp-blink bp-text-primary" style={{ padding: "80px 0" }}>LOADING EVENT...</div>;
  }

  if (!event) {
    return (
      <div className="bp-card bp-text-center bp-text-red" style={{ borderColor: "var(--bp-red)", padding: "48px 0" }}>
        ERROR: TOURNAMENT NOT FOUND
      </div>
    );
  }

  // ── Registration Flow ──
  const handleRegister = async (passwordOverride?: string) => {
    if (!isConnected || !address) {
      toast.warning("Please connect your wallet first.");
      return;
    }
    setRegistering(true);
    setPasswordError(null);
    try {
      // STEP 0: Verify eligibility (password, whitelist, capacity, reputation,
      // etc.) BEFORE any on-chain deposit. This prevents a wrong password (or
      // other off-chain rejection) from happening AFTER the user already
      // locked USDC in the vault.
      setStatusMessage("CHECKING ACCESS...");
      const preRes = await fetch(`${API_BASE_URL}/events/${event.id}/verify-access`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          wallet_address: address,
          password: event.access_type === "password" ? passwordOverride : undefined,
        }),
      });
      if (!preRes.ok) {
        const preData = await preRes.json().catch(() => ({}));
        const msg = preData.error || "You are not eligible to register for this tournament.";
        if (preRes.status === 403 && event.access_type === "password") {
          setPasswordError(msg);
        }
        throw new Error(msg);
      }

      const ticketPriceUnits = parseUnits(String(event.ticket_price), 6);
      // Mirror the contract's integer fee math (floor): fee = ticket * feeBps / 10000.
      // Approve ticket + fee so register() can pull the full entry surcharge.
      const feeUnits = (ticketPriceUnits * BigInt(PROTOCOL_FEE_BPS)) / BigInt(10000);
      const totalUnits = ticketPriceUnits + feeUnits;
      const eventIdBytes32 = keccak256(stringToBytes(event.id));

      setStatusMessage("STEP 1: APPROVING USDC TRANSACTIONS...");
      // 1. Approve USDC Transfer (ticket + protocol fee)
      const approveTx = await writeContractAsync({
        address: USDC_TOKEN_ADDRESS,
        abi: USDC_ABI,
        functionName: "approve",
        args: [VAULT_CONTRACT_ADDRESS, totalUnits],
      });
      console.log("Approve Tx Hash:", approveTx);

      setStatusMessage("STEP 1.5: CONFIRMING USDC APPROVAL ON-CHAIN...");
      if (publicClient) {
        const approveReceipt = await publicClient.waitForTransactionReceipt({ hash: approveTx });
        if (approveReceipt.status !== "success") {
          throw new Error("USDC approval failed on-chain. Please try again.");
        }
      }

      setStatusMessage("STEP 2: DEPOSITING USDC INTO VAULT ESCROW...");

      // 2. Register inside Contract
      const registerTx = await writeContractAsync({
        address: VAULT_CONTRACT_ADDRESS,
        abi: VAULT_ABI,
        functionName: "register",
        args: [eventIdBytes32],
      });
      console.log("Register Tx Hash:", registerTx);

      setStatusMessage("■ CONFIRMING TRANSACTION... ■");

      // 2.5. Wait for transaction receipt on-chain before proceeding
      if (publicClient) {
        const receipt = await publicClient.waitForTransactionReceipt({ hash: registerTx });
        if (receipt.status !== "success") {
          throw new Error("Blockchain transaction failed (reverted). Registration was rejected.");
        }
      }

      setStatusMessage("STEP 3: SECURING YOUR SEAT IN DATABASE...");

      // 3. Update Database Backend (include password if applicable)
      const registerBody: Record<string, string> = {
        wallet_address: address,
        tx_hash: registerTx,
      };
      if (event.access_type === "password" && passwordOverride) {
        registerBody.password = passwordOverride;
      }

      const res = await fetch(`${API_BASE_URL}/events/${event.id}/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(registerBody),
      });

      if (!res.ok) {
        const errorData = await res.json();
        if (res.status === 403 && event.access_type === "password") {
          setPasswordError(errorData.error || "Invalid tournament password");
        }
        throw new Error(errorData.error || "Failed to register in the database");
      }

      setStatusMessage("REGISTRATION SUCCESSFUL! WELCOME PLAYER.");
      setTimeout(() => {
        setStatusMessage("");
        setRegistering(false);
        setRoomPassword("");
        fetchEventDetail();
      }, 2000);
    } catch (err: any) {
      console.error(err);
      setModal({
        title: "■ REGISTRATION FAILED ■",
        message: err.message || "Unknown error",
        tone: "destructive",
      });
      setStatusMessage("");
      setRegistering(false);
    }
  };

  // ── Whitelist Management (Creator adds invitees) ──
  const handleAddToWhitelist = async (walletAddr: string) => {
    if (!walletAddr || !address || !event) return;
    setAddingToWhitelist(true);
    try {
      const res = await fetch(`${API_BASE_URL}/events/${event.id}/whitelist`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          wallet_address: walletAddr,
          creator_address: address,
        }),
      });
      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || "Failed to add to whitelist");
      }
      toast.success(`${walletAddr.slice(0, 10)}... added to whitelist.`);
      setWhitelistManualAddr("");
      fetchEventDetail();
    } catch (err: any) {
      toast.error(`Whitelist error: ${err.message}`);
    } finally {
      setAddingToWhitelist(false);
    }
  };

  // ── Creator Control Flow ──
  const persistSelectedGameMode = async (gameMode: SelectableGameMode) => {
    if (!event) {
      throw new Error("Event not found");
    }

    const res = await fetch(`${API_BASE_URL}/events/${event.id}/select-game-mode`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        creator_address: address,
        game_mode: gameMode,
      }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Failed to select game mode");
    return data;
  };

  const handleGenerateBracketDraft = async () => {
    if (!event) return;
    setIsGeneratingBracket(true);
    try {
      await persistSelectedGameMode(selectedGameMode);
      if (selectedGameMode === "ffa") {
        const startRes = await fetch(`${API_BASE_URL}/events/${event.id}/start`, {
          method: "POST",
        });
        const startData = await startRes.json();
        if (!startRes.ok) throw new Error(startData.error || "Failed to start the FFA tournament");
        toast.success("FFA tournament officially started.");
      } else {
        toast.success("Format selected. An empty bracket draft has been created.");
      }
      fetchEventDetail();
    } catch (err: any) {
      toast.error(`${selectedGameMode === "ffa" ? "Start error" : "Generate error"}: ${err.message}`);
    } finally {
      setIsGeneratingBracket(false);
    }
  };

  const handleAutoShuffleDraft = async () => {
    if (!event) return;
    setIsSavingDraft(true);
    try {
      // Shuffle players
      const shuffledPlayers = [...event.participants].sort(() => Math.random() - 0.5);
      const updatedMatches = [...localDraftMatches].map((match, i) => {
        const pAIndex = i * 2;
        const pBIndex = i * 2 + 1;
        
        const playerA = shuffledPlayers[pAIndex]?.wallet_address || null;
        const playerB = shuffledPlayers[pBIndex]?.wallet_address || (playerA ? "BYE" : null);

        let winnerVal = null;
        if (playerB === "BYE" && playerA) {
          winnerVal = playerA;
        } else if (playerA === "BYE" && playerB) {
          winnerVal = playerB;
        }

        return {
          ...match,
          player_a: playerA,
          player_b: playerB,
          winner: winnerVal,
        };
      });

      // Update local state
      setLocalDraftMatches(updatedMatches);

      // Save to database draft
      const res = await fetch(`${API_BASE_URL}/events/${event.id}/draft-bracket`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          creator_address: address,
          matches: updatedMatches,
        }),
      });

      if (!res.ok) throw new Error("Failed to save bracket draft");
      toast.success("Bracket draft auto-shuffled and saved.");
      fetchEventDetail();
    } catch (err: any) {
      toast.error(`Shuffle error: ${err.message}`);
    } finally {
      setIsSavingDraft(false);
    }
  };

  const handleSaveDraftBracket = async () => {
    if (!event) return;
    setIsSavingDraft(true);
    try {
      const res = await fetch(`${API_BASE_URL}/events/${event.id}/draft-bracket`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          creator_address: address,
          matches: localDraftMatches,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to save bracket draft");
      toast.success("Bracket draft saved.");
      fetchEventDetail();
    } catch (err: any) {
      toast.error(`Save error: ${err.message}`);
    } finally {
      setIsSavingDraft(false);
    }
  };

  const handleStartTournamentProgresive = async () => {
    if (!event) return;
    setIsStartingEvent(true);
    try {
      // First save draft for 1v1 mode
      if (event.game_mode === "1v1") {
        const saveRes = await fetch(`${API_BASE_URL}/events/${event.id}/draft-bracket`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            creator_address: address,
            matches: localDraftMatches,
          }),
        });
        if (!saveRes.ok) {
          const data = await saveRes.json();
          throw new Error(data.error || "Failed to lock the draft before starting");
        }
      }

      // Now start event
      const res = await fetch(`${API_BASE_URL}/events/${event.id}/start`, {
        method: "POST",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to start tournament");

      toast.success("Tournament officially started.");
      fetchEventDetail();
    } catch (err: any) {
      toast.error(`Start error: ${err.message}`);
    } finally {
      setIsStartingEvent(false);
    }
  };

  // ── Team Draft (manual or random team assignment) ──
  const handleSetTeam = (wallet: string, teamId: number) => {
    setTeamDraft((prev) => ({ ...prev, [wallet]: teamId }));
  };

  const handleRandomizeTeams = () => {
    const shuffled = [...event.participants].sort(() => Math.random() - 0.5);
    const half = Math.ceil(shuffled.length / 2);
    const next: Record<string, number> = {};
    shuffled.forEach((p, i) => {
      next[p.wallet_address] = i < half ? 0 : 1;
    });
    setTeamDraft(next);
  };

  const handleSaveTeams = async () => {
    setIsSavingTeams(true);
    try {
      const assignments = event.participants.map((p) => ({
        wallet_address: p.wallet_address,
        team_id: teamDraft[p.wallet_address] ?? 0,
      }));
      const res = await fetch(`${API_BASE_URL}/events/${event.id}/assign-teams`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ creator_address: address, assignments }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to save teams");
      toast.success("Teams saved.");
      fetchEventDetail();
    } catch (err: any) {
      setModal({ title: "■ SAVE TEAMS FAILED ■", message: err.message, tone: "destructive" });
    } finally {
      setIsSavingTeams(false);
    }
  };

  const handleUpdateDraftSlot = (matchIndex: number, slot: "player_a" | "player_b", value: string) => {
    setLocalDraftMatches((prev) =>
      prev.map((match) => {
        if (match.match_index === matchIndex) {
          const updatedMatch = { ...match, [slot]: value || null };
          // If player_b is set to BYE, winner is automatically player_a, and vice versa
          if (updatedMatch.player_b === "BYE" && updatedMatch.player_a) {
            updatedMatch.winner = updatedMatch.player_a;
          } else if (updatedMatch.player_a === "BYE" && updatedMatch.player_b) {
            updatedMatch.winner = updatedMatch.player_b;
          } else {
            updatedMatch.winner = null;
          }
          return updatedMatch;
        }
        return match;
      })
    );
  };

  const getAvailablePlayersForSlot = (matchIndex: number, slot: "player_a" | "player_b") => {
    if (!event) return [];
    
    // Find all players already assigned in ANY other match slot
    const assignedPlayers = new Set<string>();
    localDraftMatches.forEach((m) => {
      // Exclude the current match slot itself so its player is available in this dropdown
      if (m.match_index === matchIndex) {
        if (slot === "player_a" && m.player_b) assignedPlayers.add(m.player_b.toLowerCase());
        if (slot === "player_b" && m.player_a) assignedPlayers.add(m.player_a.toLowerCase());
      } else {
        if (m.player_a) assignedPlayers.add(m.player_a.toLowerCase());
        if (m.player_b) assignedPlayers.add(m.player_b.toLowerCase());
      }
    });

    // Players who are not in the assigned set
    const available = event.participants.filter(
      (p) => !assignedPlayers.has(p.wallet_address.toLowerCase())
    );
    
    return available;
  };

  const handleAdvanceBracket = async (matchId: string, winnerAddress: string) => {
    if (!isCreator) return;
    try {
      const res = await fetch(`${API_BASE_URL}/events/${event.id}/bracket/advance`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          match_id: matchId,
          winner: winnerAddress,
        }),
      });
      if (!res.ok) throw new Error("Failed to update winner");
      fetchEventDetail();
    } catch (err: any) {
      toast.error(`Bracket update error: ${err.message}`);
    }
  };

  const handleSubmitWinners = async (winnersList: string[]) => {
    try {
      const res = await fetch(`${API_BASE_URL}/events/${event.id}/end`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ winners: winnersList }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to submit winners");
      fetchEventDetail();
    } catch (err: any) {
      toast.error(`Submit winners error: ${err.message}`);
    }
  };

  // ── Dispute Appeal Flow ──
  const handleAppeal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!appealWinners) return;
    const list = appealWinners.split(",").map(s => s.trim());
    try {
      const res = await fetch(`${API_BASE_URL}/events/${event.id}/appeal`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ winners: list }),
      });
      if (!res.ok) throw new Error("Failed to submit appeal");
      toast.success("Appeal submitted. Voting has been reopened.");
      setAppealWinners("");
      fetchEventDetail();
    } catch (err: any) {
      toast.error(`Appeal error: ${err.message}`);
    }
  };

  // ── Retry settlement (creator-only, status === "settlement_failed") ──
  const handleRetrySettlement = async () => {
    if (!event || !address) return;
    setIsRetrying(true);
    setRetryError(null);
    try {
      const res = await fetch(`${API_BASE_URL}/events/${event.id}/retry-settlement`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ caller_address: address }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || data.detail || "Retry failed");
      await fetchEventDetail();
    } catch (err: any) {
      console.error("Retry settlement error:", err);
      setRetryError(err.message || "Retry failed");
    } finally {
      setIsRetrying(false);
    }
  };

  // ── Social Connect Lookup Flow ──
  const handleSocialLookup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!socialInput.trim()) return;

    setSocialLookupStatus("loading");
    setResolvedAddress(null);

    try {
      const res = await fetch(`${API_BASE_URL}/social-connect/lookup`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ identifier: socialInput.trim() }),
      });
      const data = await res.json();

      if (data.status === "RESOLVED" && data.address) {
        setSocialLookupStatus("resolved");
        setResolvedAddress(data.address);
      } else {
        setSocialLookupStatus("not_resolved");
      }
    } catch (err: any) {
      console.error("Social Connect lookup error:", err);
      setSocialLookupStatus("not_resolved");
    }
  };

  // Social Connect invites only populate the whitelist (handleAddToWhitelist);
  // invited players must register + deposit on-chain to join the roster.

  const participantLimitLabel = event.max_participants ? `${event.participants.length}/${event.max_participants}` : `${event.participants.length}/∞`;
  const prizePool = (Number(event.ticket_price) * event.participants.length).toFixed(2);

  // Entry-fee breakdown shown before registering. Mirror the contract's integer
  // fee math (floor) so the displayed total matches what register() will pull.
  const ticketPriceUnits = parseUnits(String(event.ticket_price), 6);
  const feeUnits = (ticketPriceUnits * BigInt(PROTOCOL_FEE_BPS)) / BigInt(10000);
  const feeDisplay = formatUnits(feeUnits, 6);
  const totalDisplay = formatUnits(ticketPriceUnits + feeUnits, 6);
  const feePercentLabel = (PROTOCOL_FEE_BPS / 100).toString();

  const feeBreakdown = (
    <div className="bp-surface-strip bp-mb-md" style={{ borderColor: "rgba(76, 231, 255, 0.32)" }}>
      <div className="bp-flex bp-justify-between bp-text-xs">
        <span className="bp-text-muted">Ticket</span>
        <span>{event.ticket_price} USDC</span>
      </div>
      <div className="bp-flex bp-justify-between bp-text-xs bp-mt-xs">
        <span className="bp-text-muted">Service fee ({feePercentLabel}%)</span>
        <span>{feeDisplay} USDC</span>
      </div>
      <div
        className="bp-flex bp-justify-between bp-text-xs bp-mt-xs"
        style={{ borderTop: "1px solid rgba(114, 128, 168, 0.28)", paddingTop: "4px" }}
      >
        <span className="bp-text-primary">Total to lock</span>
        <strong className="bp-text-green">{totalDisplay} USDC</strong>
      </div>
    </div>
  );
  const votingPercent = Number(event.voting.percentage || 0);
  const bracketRounds = Array.from(new Set(event.brackets.map((match) => match.round)));

  return (
    <div className="bp-stack-lg">
      <section className="bp-card bp-overview-card">
        <div className="bp-flex bp-justify-between bp-items-center bp-gap-sm" style={{ flexWrap: "wrap" }}>
          <div className="bp-flex bp-gap-sm bp-items-center">
            {/* game_mode is tentative until creator picks it via /select-game-mode
                (post roster_locked). Show neutral "SETUP" badge before that. */}
            {event.status === "setup" && !event.roster_locked ? (
              <span className="bp-badge bp-badge-setup">SETUP</span>
            ) : (
              <span className={`bp-badge bp-badge-${event.game_mode}`}>
                {event.game_mode} {event.game_mode === "team" ? `(${event.team_size}v${event.team_size})` : ""}
              </span>
            )}
            {/* Access Type Badge */}
            {event.access_type === "password" && (
              <span className="bp-badge" style={{ borderColor: "var(--bp-warning)", color: "var(--bp-warning)", background: "rgba(255, 158, 79, 0.08)" }}>
                ■ PRIVATE: PASSWORD ■
              </span>
            )}
            {event.access_type === "invite_only" && (
              <span className="bp-badge" style={{ borderColor: "var(--bp-info)", color: "var(--bp-info)", background: "rgba(76, 231, 255, 0.08)" }}>
                ■ PRIVATE: INVITE ONLY ■
              </span>
            )}
          </div>
          <span className={`bp-badge bp-badge-${event.status}`}>{event.status}</span>
        </div>
        <div className="bp-stack-sm">
          <p className="bp-text-info bp-text-xs bp-font-display">■ EVENT CONTROL ROOM ■</p>
          <h1 className="bp-text-xl bp-text-primary">{event.title}</h1>
          <p className="bp-card-copy">
            Participant state, creator controls, voting progress, and arena flow are grouped below so each role can spot the next relevant action without scanning one long uniform column.
          </p>
        </div>
        <div className="bp-metric-grid bp-text-xs">
          <div className="bp-metric-item">
            <span className="bp-text-muted bp-font-display">TICKET PRICE</span>
            <strong className="bp-text-primary">{event.ticket_price} USDC</strong>
          </div>
          <div className="bp-metric-item">
            <span className="bp-text-muted bp-font-display">PRIZE POOL</span>
            <strong className="bp-text-green">{prizePool} USDC</strong>
          </div>
          <div className="bp-metric-item">
            <span className="bp-text-muted bp-font-display">PARTICIPANTS</span>
            <strong>{participantLimitLabel}</strong>
          </div>
        </div>
      </section>

      {event.status === "settlement_failed" && (
        <section className="bp-settlement-banner">
          <h3 className="bp-card-title bp-blink" data-tone="destructive">
            ■ SETTLEMENT FAILED ■
          </h3>
          <p className="bp-card-copy bp-mt-sm">
            The on-chain payout transaction reverted. Funds are still safe in the
            vault and the event has NOT been marked ended. The creator can retry
            below.
          </p>
          {event.settlement_error && (
            <pre
              className="bp-mt-md"
              style={{
                whiteSpace: "pre-wrap",
                wordBreak: "break-word",
                background: "rgba(7, 10, 21, 0.85)",
                border: "1px solid rgba(255, 92, 122, 0.4)",
                padding: "10px 12px",
                fontSize: "0.6rem",
                fontFamily: "var(--bp-font-body)",
              }}
            >
              {event.settlement_error}
            </pre>
          )}
          {event.settlement_tx_hash && (
            <p className="bp-mt-sm">
              <a
                href={getTxExplorerUrl(event.settlement_tx_hash)}
                target="_blank"
                rel="noreferrer"
                className="bp-text-xs bp-text-info"
                style={{ textDecoration: "underline" }}
              >
                View failed transaction on Blockscout
              </a>
            </p>
          )}
          {isCreator && (
            <div className="bp-mt-md">
              <button
                className="bp-btn bp-btn-accent"
                disabled={isRetrying}
                onClick={handleRetrySettlement}
              >
                {isRetrying ? "■ RETRYING... ■" : "■ RETRY SETTLEMENT ■"}
              </button>
              {retryError && (
                <p className="bp-text-xs bp-text-red bp-mt-sm" style={{ wordBreak: "break-word" }}>
                  Retry error: {retryError}
                </p>
              )}
            </div>
          )}
        </section>
      )}

      <div className="bp-dashboard-layout">
        <div className="bp-flex bp-flex-col bp-gap-lg">
          <div className="bp-card bp-panel-info">
            <h3 className="bp-card-title" data-tone="info">■ Player Console ■</h3>

            {event.status === "setup" && (
              <div>
                {/* Creator Restriction: block creators from registering */}
                {isCreator ? (
                  <div className="bp-card bp-panel-destructive bp-text-center">
                    <p className="bp-text-red bp-text-sm" style={{ letterSpacing: "1px" }}>■ CREATOR CANNOT PLAY ■</p>
                    <p className="bp-card-copy bp-mt-sm">
                      As the organizer or jury, you cannot participate in a tournament you created yourself.
                    </p>
                  </div>
                ) : event.roster_locked ? (
                  <div className="bp-card bp-panel-warning bp-text-center">
                    <p className="bp-text-accent bp-text-sm" style={{ letterSpacing: "1px" }}>■ REGISTRATION CLOSED ■</p>
                    <p className="bp-card-copy bp-mt-sm">
                      Registration has been closed by the organizer. The tournament is currently in the bracket drafting phase.
                    </p>
                  </div>
                ) : isRegistered ? (
                  <div className="bp-text-center">
                    <p className="bp-text-green bp-blink bp-text-sm">■ YOU ARE REGISTERED ■</p>
                    <p className="bp-card-copy bp-mt-sm">Waiting for the creator to start the tournament matches.</p>
                  </div>
                ) : event.max_participants && event.participants.length >= event.max_participants ? (
                  <div className="bp-card bp-panel-destructive bp-text-center">
                    <p className="bp-text-red bp-text-sm" style={{ letterSpacing: "1px" }}>■ SLOTS FULL ■</p>
                    <p className="bp-card-copy bp-mt-sm">
                      The tournament has reached its maximum capacity ({event.max_participants} registrants).
                    </p>
                  </div>
                ) : event.access_type === "password" ? (
                  /* Password-protected registration form */
                  <div>
                    <p className="bp-card-copy bp-mb-md">
                      This tournament requires a room code. Enter the password shared by the organizer to register.
                    </p>
                    {passwordError && (
                      <div className="bp-card bp-panel-destructive bp-text-center bp-text-red bp-text-xs bp-mb-sm">
                        {passwordError}
                      </div>
                    )}
                    <div className="bp-field">
                      <input
                        type="text"
                        className="bp-input"
                        placeholder="Enter room code..."
                        value={roomPassword}
                        onChange={(e) => { setRoomPassword(e.target.value); setPasswordError(null); }}
                        disabled={registering}
                        style={{ letterSpacing: "3px", textAlign: "center", textTransform: "uppercase" }}
                      />
                    </div>
                    {feeBreakdown}
                    <button
                      className="bp-btn bp-btn-primary bp-w-full"
                      onClick={() => handleRegister(roomPassword)}
                      disabled={registering || !roomPassword.trim()}
                    >
                      {registering ? statusMessage : "■ ENTER ROOM CODE ■"}
                    </button>
                  </div>
                ) : event.access_type === "invite_only" && !isWhitelisted ? (
                  /* Invite-only: user not on whitelist — RED denied banner */
                  <div className="bp-whitelist-banner denied">
                    ■ RESTRICTED: YOU ARE NOT INVITED ■
                    <p className="bp-card-copy bp-mt-sm" style={{ color: "var(--bp-muted)" }}>
                      This tournament is for invited participants only. Contact the organizer to request access.
                    </p>
                  </div>
                ) : (
                  /* Public or whitelisted invite-only: normal registration */
                  <div>
                    {/* Whitelist approved banner for invite-only events */}
                    {event.access_type === "invite_only" && isWhitelisted && (
                      <div className="bp-whitelist-banner approved">
                        ■ YOU ARE WHITELISTED ■
                      </div>
                    )}
                    <p className="bp-card-copy bp-mb-md">
                      Join this tournament by locking your entrance fee in our secure escrow.
                    </p>
                    {feeBreakdown}
                    <button
                      className="bp-btn bp-btn-primary bp-w-full"
                      onClick={() => handleRegister()}
                      disabled={registering}
                    >
                      {registering ? statusMessage : "■ Register & Lock USDC"}
                    </button>
                  </div>
                )}
              </div>
            )}

            {event.status === "active" && (
              <div className="bp-text-center">
                <p className="bp-text-green bp-text-sm">■ TOURNAMENT ACTIVE ■</p>
                <p className="bp-card-copy bp-mt-sm">Matches are currently playing in real-time. Follow bracket state below.</p>
              </div>
            )}

            {event.status === "voting" && (
              <div>
                <p className="bp-card-copy bp-mb-md">
                  Winners have been submitted by the jury. Consensus voting is open for 24 hours to confirm results.
                </p>
                <button
                  className="bp-btn bp-btn-accent bp-w-full"
                  onClick={() => router.push(`/events/${event.id}/vote`)}
                >
                  ■ Enter Voting Console
                </button>
              </div>
            )}

            {event.status === "ended" && (
              <div className="bp-text-center">
                <p className="bp-text-muted bp-text-sm">■ TOURNAMENT COMPLETED ■</p>
                <p className="bp-card-copy bp-mt-sm">Funds have been fully automated, settled and distributed.</p>
              </div>
            )}

            {event.status === "disputed" && (
              <div className="bp-text-center">
                <p className="bp-text-red bp-blink bp-text-sm">■ SYSTEM DISPUTED ■</p>
                <p className="bp-card-copy bp-mt-sm">The consensus vote tied 50/50. Waiting for creator to appeal revised winners.</p>
              </div>
            )}
          </div>


          {["voting", "ended", "disputed"].includes(event.status) && (
            <div className="bp-card bp-panel-info">
              <h3 className="bp-card-title" data-tone="info">■ Consensus Stats ■</h3>
              <p className="bp-card-copy bp-mb-md">
                Voting Status: {event.voting.total} Votes logged. Agree threshold: {event.consensus_threshold}%.
              </p>
              <div className="bp-flex bp-justify-between bp-text-xs bp-mb-xs">
                <span>Agree: {event.voting.agree}</span>
                <span>Reject: {event.voting.reject}</span>
              </div>
              <div className="bp-progress bp-mb-md">
                <div
                  className={`bp-progress-fill ${event.voting.reject > event.voting.agree ? "reject" : ""}`}
                  style={{ width: `${event.voting.percentage || 0}%` }}
                />
              </div>
              <div className="bp-text-center">
                <span className="bp-text-primary bp-text-xs">
                  CURRENT APPROVAL: {event.voting.percentage || "0.0"}%
                </span>
              </div>
            </div>
          )}

          <div className="bp-card">
            <h3 className="bp-card-title">■ Registered Roster ■</h3>

            {/* Whitelist Management + Social Connect — Creator Only, Invite-Only, Setup Phase */}
            {isCreator && event.status === "setup" && event.access_type === "invite_only" && (
              <div className="bp-card bp-panel-info bp-mb-md">
                <p className="bp-text-xs bp-text-info bp-font-display bp-mb-sm">
                  ■ WHITELIST MANAGEMENT ■
                </p>

                {/* Social Connect Lookup */}
                <div className="bp-surface-strip bp-mb-md" style={{ borderColor: "rgba(255, 158, 79, 0.32)" }}>
                  <p className="bp-card-copy bp-mb-sm">
                    ■ ENTER PLAYER EMAIL / PHONE NUMBER ■
                  </p>
                  <form onSubmit={async (e) => {
                    e.preventDefault();
                    handleSocialLookup(e);
                  }} className="bp-flex bp-gap-sm" style={{ alignItems: "flex-end" }}>
                    <input
                      type="text"
                      className="bp-input bp-text-xs"
                      placeholder="email@example.com or +123..."
                      value={socialInput}
                      onChange={(e) => {
                        setSocialInput(e.target.value);
                        setSocialLookupStatus("idle");
                        setResolvedAddress(null);
                      }}
                      style={{ flex: 1 }}
                    />
                    <button
                      type="submit"
                      className="bp-btn bp-btn-accent bp-text-xs"
                      disabled={socialLookupStatus === "loading" || !socialInput.trim()}
                      style={{ whiteSpace: "nowrap" }}
                    >
                      {socialLookupStatus === "loading" ? "■ CONTACTING DECENTRALIZED IDENTITY NETWORK... ■" : "■ FIND AND INVITE ■"}
                    </button>
                  </form>

                  {/* Lookup Result: Resolved — auto-add to whitelist */}
                  {socialLookupStatus === "resolved" && resolvedAddress && (
                    <div className="bp-card bp-panel-success bp-mt-sm">
                      <p className="bp-text-xs bp-text-green" style={{ marginBottom: "4px" }}>
                        ■ FOUND: {resolvedAddress.slice(0, 14)}...{resolvedAddress.slice(-8)}
                      </p>
                      <button
                        className="bp-btn bp-btn-green bp-text-xs bp-w-full"
                        onClick={() => {
                          handleAddToWhitelist(resolvedAddress);
                          setSocialInput("");
                          setSocialLookupStatus("idle");
                          setResolvedAddress(null);
                        }}
                        disabled={addingToWhitelist}
                      >
                        {addingToWhitelist ? "ADDING..." : "■ ADD TO WHITELIST ■"}
                      </button>
                    </div>
                  )}

                  {/* Lookup Result: Not Found */}
                  {socialLookupStatus === "not_resolved" && (
                    <div className="bp-card bp-panel-destructive bp-mt-sm">
                      <p className="bp-text-xs bp-text-red">
                      ■ IDENTITY NOT REGISTERED IN CELO SOCIAL CONNECT ■
                      </p>
                      <p className="bp-text-xs bp-text-muted" style={{ marginTop: "4px" }}>
                        Use the manual input below to enter a wallet address directly.
                      </p>
                    </div>
                  )}
                </div>

                {/* Manual wallet address input */}
                <p className="bp-card-copy bp-mb-xs">Or enter a wallet address manually:</p>
                <div className="bp-flex bp-gap-sm bp-mb-sm" style={{ alignItems: "flex-end" }}>
                  <input
                    type="text"
                    className="bp-input bp-text-xs"
                    placeholder="0x... wallet address"
                    value={whitelistManualAddr}
                    onChange={(e) => setWhitelistManualAddr(e.target.value)}
                    style={{ flex: 1 }}
                  />
                  <button
                    className="bp-btn bp-btn-accent bp-text-xs"
                    onClick={() => handleAddToWhitelist(whitelistManualAddr)}
                    disabled={addingToWhitelist || !whitelistManualAddr.trim()}
                    style={{ whiteSpace: "nowrap" }}
                  >
                    {addingToWhitelist ? "ADDING..." : "[ ADD ]"}
                  </button>
                </div>
              </div>
            )}

            {event.participants.length === 0 ? (
              <p className="bp-text-xs bp-text-muted">No players signed up yet.</p>
            ) : event.game_mode === "team" && event.status !== "setup" ? (
              /* Team mode: show grouped by team with visual distinction */
              <div>
                {[0, 1].map((teamId) => {
                  const teamPlayers = event.participants.filter((p) => p.team_id === teamId);
                  if (teamPlayers.length === 0) return null;
                  return (
                    <div key={teamId} className={`bp-team-group ${teamId === 0 ? "team-red" : "team-blue"}`}>
                      <div className="bp-team-group-title">
                        ■ {teamLabel(teamId).toUpperCase()} ■ ({teamPlayers.length})
                      </div>
                      {teamPlayers.map((p) => (
                        <div key={p.id} className="bp-flex bp-justify-between bp-items-center" style={{ padding: "4px 0", borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
                          <span className="bp-text-xs">
                            <span style={{ color: "var(--bp-green)" }}>{generateGamerTag(p.wallet_address)}</span>
                            <span className="bp-text-muted" style={{ fontSize: "0.35rem", marginLeft: "6px" }}>
                              {p.wallet_address.slice(0, 6)}...{p.wallet_address.slice(-4)}
                            </span>
                          </span>
                          <span className="bp-text-xs" style={{ color: p.status === "winner" ? "var(--bp-green)" : p.status === "eliminated" ? "var(--bp-red)" : "var(--bp-cyan)" }}>
                            {p.status.toUpperCase()}
                          </span>
                        </div>
                      ))}
                    </div>
                  );
                })}
              </div>
            ) : (
              /* Default roster list with gamer tags and delete button */
              <div style={{ maxHeight: "300px", overflowY: "auto" }}>
                <table className="bp-leaderboard">
                  <thead>
                    <tr>
                      <th>PLAYER</th>
                      <th>STATUS</th>
                    </tr>
                  </thead>
                  <tbody>
                    {event.participants.map((p) => (
                      <tr key={p.id}>
                        <td className="bp-text-xs">
                          <span style={{ color: "var(--bp-green)" }}>{generateGamerTag(p.wallet_address)}</span>
                          <span className="bp-text-muted" style={{ display: "block", fontSize: "0.35rem", marginTop: "2px" }}>
                            {p.wallet_address.slice(0, 10)}...{p.wallet_address.slice(-6)}
                          </span>
                        </td>
                        <td>
                          <span
                            className="bp-text-xs"
                            style={{
                              color: p.status === "winner" ? "var(--bp-green)" : p.status === "eliminated" ? "var(--bp-red)" : "var(--bp-cyan)",
                            }}
                          >
                            {p.status.toUpperCase()}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        {/* Right Side: Brackets / Leaderboard and Creator Admin Console */}
        <div className="bp-flex bp-flex-col bp-gap-lg">
          {/* Creator Panel */}
          {isCreator && (
            <div className="bp-card bp-panel-warning">
              <h3 className="bp-card-title" data-tone="warning">🛡️ Creator Control Console 🛡️</h3>

              {event.status === "setup" && !event.roster_locked && (
                <div>
                  <p className="bp-card-copy bp-mb-md">
                    Player registration is open ({event.participants.length}/{event.max_participants ? event.max_participants : "∞"} players). Close registration to lock the roster and open the bracket draft phase.
                  </p>
                  <button
                    className="bp-btn bp-btn-accent bp-w-full"
                    disabled={event.participants.length < 2}
                    onClick={async () => {
                      try {
                        const res = await fetch(`${API_BASE_URL}/events/${event.id}/lock-roster`, {
                          method: "POST",
                          headers: { "Content-Type": "application/json" },
                          body: JSON.stringify({ creator_address: address }),
                        });
                        const data = await res.json();
                        if (!res.ok) throw new Error(data.error || "Failed to lock roster");
                        toast.success("Registration closed. The participant roster is locked.");
                        fetchEventDetail();
                      } catch (err: any) {
                        toast.error(`Lock roster error: ${err.message}`);
                      }
                    }}
                  >
                    ■ CLOSE SIGNUPS ■
                  </button>
                  {event.participants.length < 2 && (
                    <p className="bp-text-red bp-text-xs bp-mt-xs bp-text-center">
                      * You need at least 2 participants to close registration.
                    </p>
                  )}
                </div>
              )}

              {event.status === "setup" && event.roster_locked && (
                <div>
                  {event.brackets.length === 0 ? (
                    /* Select Game Mode dynamically */
                    <div>
                      <p className="bp-card-copy bp-mb-md">
                        Roster locked ({event.participants.length} players). Please select the game mode for this tournament:
                      </p>
                      <div className="bp-field">
                        <label className="bp-label">MATCHPLAY FORMAT</label>
                        <select
                          className="bp-select"
                          style={{ appearance: "none", WebkitAppearance: "none", MozAppearance: "none" }}
                          value={selectedGameMode}
                          onChange={(e) => setSelectedGameMode(e.target.value as SelectableGameMode)}
                          disabled={isGeneratingBracket || isStartingEvent}
                        >
                          <option value="1v1">■ 1v1 PvP Tournament Bracket</option>
                          <option value="team">■ Team vs Team Showdown (2v2/Custom)</option>
                          <option value="ffa">■ Free For All Showdown</option>
                        </select>
                      </div>
                      <button
                        className="bp-btn bp-btn-primary bp-w-full bp-mt-md"
                        disabled={isGeneratingBracket || isStartingEvent}
                        onClick={handleGenerateBracketDraft}
                      >
                        {isGeneratingBracket
                          ? (selectedGameMode === "ffa" ? "STARTING..." : "GENERATING...")
                          : (selectedGameMode === "ffa" ? "■ START FFA EVENT ■" : "■ GENERATE BRACKET DRAFT ■")}
                      </button>
                    </div>
                  ) : (
                    /* Draft Bracket Panel */
                    <div>
                      <div className="bp-flex bp-justify-between bp-items-center bp-mb-md">
                        <span className="bp-text-xs bp-text-primary">ROUND 1 MATCH DRAFT</span>
                        <span className="bp-badge bp-badge-setup" style={{ fontSize: "0.4rem" }}>DRAFTING</span>
                      </div>

                      {event.game_mode === "1v1" ? (
                        <div style={{ maxHeight: "250px", overflowY: "auto", border: "1px solid rgba(114, 128, 168, 0.26)", padding: "8px", background: "rgba(7, 10, 21, 0.7)", marginBottom: "12px" }}>
                          {localDraftMatches.map((match, idx) => (
                            <div key={match.id || idx} style={{ borderBottom: "1px solid rgba(255,255,255,0.06)", paddingBottom: "8px", marginBottom: "8px" }}>
                              <p className="bp-text-muted" style={{ fontSize: "0.6rem", marginBottom: "4px" }}>
                                MATCH {match.match_index + 1}
                              </p>
                              <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                                {/* Slot Player A */}
                                <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                                  <span className="bp-text-xs bp-text-muted" style={{ width: "60px", fontSize: "0.6rem" }}>SLOT A:</span>
                                  <select
                                    className="bp-select bp-text-xs"
                                    style={{ flex: 1, padding: "4px", background: "#15151f", appearance: "none", WebkitAppearance: "none", MozAppearance: "none" }}
                                    value={match.player_a || ""}
                                    onChange={(e) => handleUpdateDraftSlot(match.match_index, "player_a", e.target.value)}
                                  >
                                    <option value="">[ CHOOSE PLAYER ]</option>
                                    <option value="BYE">[ BYE ]</option>
                                    {getAvailablePlayersForSlot(match.match_index, "player_a").map((p) => (
                                      <option key={p.id} value={p.wallet_address}>
                                        {generateGamerTag(p.wallet_address)} ({p.wallet_address.slice(0, 6)})
                                      </option>
                                    ))}
                                    {match.player_a && !getAvailablePlayersForSlot(match.match_index, "player_a").some(p => p.wallet_address === match.player_a) && match.player_a !== "BYE" && (
                                      <option value={match.player_a}>
                                        {generateGamerTag(match.player_a)} ({match.player_a.slice(0, 6)})
                                      </option>
                                    )}
                                  </select>
                                </div>
                                {/* Slot Player B */}
                                <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                                  <span className="bp-text-xs bp-text-muted" style={{ width: "60px", fontSize: "0.6rem" }}>SLOT B:</span>
                                  <select
                                    className="bp-select bp-text-xs"
                                    style={{ flex: 1, padding: "4px", background: "#15151f", appearance: "none", WebkitAppearance: "none", MozAppearance: "none" }}
                                    value={match.player_b || ""}
                                    onChange={(e) => handleUpdateDraftSlot(match.match_index, "player_b", e.target.value)}
                                  >
                                    <option value="">[ CHOOSE PLAYER ]</option>
                                    <option value="BYE">[ BYE ]</option>
                                    {getAvailablePlayersForSlot(match.match_index, "player_b").map((p) => (
                                      <option key={p.id} value={p.wallet_address}>
                                        {generateGamerTag(p.wallet_address)} ({p.wallet_address.slice(0, 6)})
                                      </option>
                                    ))}
                                    {match.player_b && !getAvailablePlayersForSlot(match.match_index, "player_b").some(p => p.wallet_address === match.player_b) && match.player_b !== "BYE" && (
                                      <option value={match.player_b}>
                                        {generateGamerTag(match.player_b)} ({match.player_b.slice(0, 6)})
                                      </option>
                                    )}
                                  </select>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="bp-surface-strip bp-mb-md" style={{ borderColor: "rgba(76, 231, 255, 0.4)" }}>
                          <div className="bp-flex bp-justify-between bp-items-center bp-mb-sm">
                            <p className="bp-text-xs bp-text-info bp-font-display">■ TEAM DRAFT ■</p>
                            <button
                              type="button"
                              className="bp-btn bp-btn-accent bp-text-xs"
                              disabled={isSavingTeams || isStartingEvent}
                              onClick={handleRandomizeTeams}
                              style={{ whiteSpace: "nowrap" }}
                            >
                              ■ RANDOMIZE ■
                            </button>
                          </div>
                          <p className="bp-card-copy bp-mb-sm">
                            Assign each player to a team, or randomize. Save before starting — teams are kept as set.
                          </p>
                          <div style={{ maxHeight: "220px", overflowY: "auto" }}>
                            {event.participants.map((p) => (
                              <div
                                key={p.id}
                                className="bp-flex bp-justify-between bp-items-center"
                                style={{ gap: "8px", padding: "4px 0", borderBottom: "1px solid rgba(255,255,255,0.06)" }}
                              >
                                <span className="bp-text-xs" style={{ color: "var(--bp-green)" }}>
                                  {generateGamerTag(p.wallet_address)}
                                  <span className="bp-text-muted" style={{ fontSize: "0.35rem", marginLeft: "6px" }}>
                                    {p.wallet_address.slice(0, 6)}...{p.wallet_address.slice(-4)}
                                  </span>
                                </span>
                                <select
                                  className="bp-select bp-text-xs"
                                  style={{ width: "110px", padding: "4px", background: "#15151f", appearance: "none", WebkitAppearance: "none", MozAppearance: "none" }}
                                  value={teamDraft[p.wallet_address] ?? 0}
                                  onChange={(e) => handleSetTeam(p.wallet_address, Number(e.target.value))}
                                >
                                  <option value={0}>{teamLabel(0)}</option>
                                  <option value={1}>{teamLabel(1)}</option>
                                </select>
                              </div>
                            ))}
                          </div>
                          <button
                            type="button"
                            className="bp-btn bp-w-full bp-mt-sm"
                            style={{ borderColor: "var(--bp-primary)", background: "transparent" }}
                            disabled={isSavingTeams || isStartingEvent}
                            onClick={handleSaveTeams}
                          >
                            {isSavingTeams ? "SAVING..." : "■ SAVE TEAMS ■"}
                          </button>
                        </div>
                      )}

                      <div className="bp-flex bp-flex-col bp-gap-sm">
                        {event.game_mode === "1v1" && (
                          <div style={{ display: "flex", gap: "8px" }}>
                            <button
                              className="bp-btn bp-btn-accent"
                              style={{ flex: 1 }}
                              disabled={isSavingDraft || isStartingEvent}
                              onClick={handleAutoShuffleDraft}
                            >
                              ■ AUTO SHUFFLE ■
                            </button>
                            <button
                              className="bp-btn"
                              style={{ flex: 1, borderColor: "var(--bp-primary)", background: "transparent" }}
                              disabled={isSavingDraft || isStartingEvent}
                              onClick={handleSaveDraftBracket}
                            >
                              ■ SAVE DRAFT ■
                            </button>
                          </div>
                        )}
                        <button
                          className="bp-btn bp-btn-green bp-w-full"
                          disabled={isSavingDraft || isStartingEvent}
                          onClick={handleStartTournamentProgresive}
                        >
                          {isStartingEvent ? "LAUNCHING..." : "■ START EVENT ■"}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {event.status === "active" && event.game_mode === "ffa" && (
                <div>
                  <p className="bp-card-copy bp-mb-md">
                    FFA mode is complete. Enter the top 3 winner addresses below to unlock the payout validation pool.
                  </p>
                  <div className="bp-field">
                    <label className="bp-label">1st Place Wallet</label>
                    <input
                      type="text"
                      className="bp-input bp-text-xs"
                      placeholder="0x..."
                      value={ffaWinner1}
                      onChange={(e) => setFfaWinner1(e.target.value)}
                    />
                  </div>
                  <div className="bp-field">
                    <label className="bp-label">2nd Place Wallet</label>
                    <input
                      type="text"
                      className="bp-input bp-text-xs"
                      placeholder="0x..."
                      value={ffaWinner2}
                      onChange={(e) => setFfaWinner2(e.target.value)}
                    />
                  </div>
                  <div className="bp-field">
                    <label className="bp-label">3rd Place Wallet</label>
                    <input
                      type="text"
                      className="bp-input bp-text-xs"
                      placeholder="0x..."
                      value={ffaWinner3}
                      onChange={(e) => setFfaWinner3(e.target.value)}
                    />
                  </div>
                  <button
                    className="bp-btn bp-btn-green bp-w-full"
                    onClick={() => {
                      const list = [ffaWinner1, ffaWinner2, ffaWinner3].filter(Boolean);
                      if (list.length === 0) {
                        toast.warning("Enter at least one winner wallet.");
                        return;
                      }
                      handleSubmitWinners(list);
                    }}
                  >
                    ■ Declare Winners & Open Voting
                  </button>
                </div>
              )}

              {event.status === "active" && (event.game_mode === "1v1" || event.game_mode === "team") && (
                <div>
                  <p className="bp-card-copy bp-mb-md">
                    Matches are currently running. Declare the winner of each box directly in the bracket panel on the right.
                  </p>
                  {/* If final match is completed, let creator finalize the tournament */}
                  {event.brackets.length > 0 && event.brackets[event.brackets.length - 1].winner && (
                    <button
                      className="bp-btn bp-btn-green bp-w-full"
                      onClick={() => {
                        const finalWinner = event.brackets[event.brackets.length - 1].winner;
                        if (finalWinner) {
                          if (finalWinner.startsWith("team-")) {
                            // Find all participants in that team
                            const teamId = Number(finalWinner.split("-")[1]);
                            const teamWinners = event.participants
                              .filter((p) => p.team_id === teamId)
                              .map((p) => p.wallet_address);
                            handleSubmitWinners(teamWinners);
                          } else {
                            handleSubmitWinners([finalWinner]);
                          }
                        }
                      }}
                    >
                      ■ Finalize Bracket & Start Voting
                    </button>
                  )}
                </div>
              )}

              {event.status === "voting" && (
                <div>
                  <p className="bp-card-copy bp-mb-md">
                    The tournament is currently in the voting phase. Payout happens
                    automatically once voting ends.
                  </p>

                  {/* Quorum Progress bar */}
                  <div className="bp-surface-strip bp-mb-md" style={{ borderColor: "rgba(245, 232, 95, 0.34)" }}>
                    <div className="bp-flex bp-justify-between bp-text-xs bp-mb-xs">
                      <span>VOTING QUORUM PROGRESS:</span>
                      <span style={{ color: "var(--bp-green)" }}>
                        {event.voting.percentage || "0"}%
                      </span>
                    </div>
                    <div style={{ height: "10px", width: "100%", background: "#111", border: "1px solid rgba(114, 128, 168, 0.28)", overflow: "hidden" }}>
                      <div
                        style={{
                          height: "100%",
                          width: `${Math.min(100, votingPercent)}%`,
                          background: "var(--bp-success)"
                        }}
                      />
                    </div>
                    <p className="bp-card-copy bp-mt-xs" style={{ fontSize: "0.78rem" }}>
                      Total Votes: {event.voting.total} / {event.participants.length} Players. Minimum quorum to settle: 51%.
                    </p>
                  </div>

                  {/* Manual distribute lives in the Voting Console (vote page) so
                      the creator sees ballot tallies + action in one screen. */}
                  <button
                    className="bp-btn bp-btn-accent bp-w-full"
                    onClick={() => router.push(`/events/${event.id}/vote`)}
                  >
                    ■ Open Voting Console to distribute ■
                  </button>
                </div>
              )}

              {event.status === "disputed" && (
                <div>
                  <p className="bp-card-copy bp-mb-md">
                    Consensus tied. Enter a revised, resolved list of winner wallets (comma separated) to appeal to voters.
                  </p>
                  <form onSubmit={handleAppeal} className="bp-flex bp-flex-col bp-gap-sm">
                    <input
                      type="text"
                      className="bp-input bp-text-xs"
                      placeholder="0xWinner1, 0xWinner2"
                      value={appealWinners}
                      onChange={(e) => setAppealWinners(e.target.value)}
                      required
                    />
                    <button type="submit" className="bp-btn bp-btn-primary">
                      ■ Resubmit Appeal & Re-Vote
                    </button>
                  </form>
                </div>
              )}

              {!["setup", "active", "voting", "disputed", "settlement_failed"].includes(event.status) && (
                <p className="bp-text-xs bp-text-muted">No admin actions required in state {event.status}.</p>
              )}
              {event.status === "settlement_failed" && (
                <p className="bp-text-xs bp-text-muted">
                  Settlement failed — recovery actions are in the red banner at the top of this page.
                </p>
              )}
            </div>
          )}

          {/* Visual Brackets or Leaderboard Display */}
          <div className="bp-card bp-panel-info">
            <h3 className="bp-card-title" data-tone="info">■ Arena Board ■</h3>

            {event.status === "setup" && (
              <div className="bp-text-center bp-text-muted" style={{ padding: "48px 0" }}>
                ARENA OFFLINE. WAITING FOR TOURNAMENT TO INITIALIZE.
              </div>
            )}

            {event.status !== "setup" && event.game_mode === "ffa" && (
              <div>
                <p className="bp-card-copy bp-mb-lg">
                  Free-For-All mode leaderboard. Once the creator declares final ranking, winners are showcased below:
                </p>
                <table className="bp-leaderboard">
                  <thead>
                    <tr>
                      <th>RANK</th>
                      <th>WINNER WALLET</th>
                    </tr>
                  </thead>
                  <tbody>
                    {event.participants.filter(p => p.status === "winner").map((p, idx) => (
                      <tr key={p.id}>
                        <td className={`bp-rank-${idx + 1}`}>{idx + 1}ST PLACE</td>
                        <td className="bp-text-xs" style={{ wordBreak: "break-all" }}>{p.wallet_address}</td>
                      </tr>
                    ))}
                    {event.participants.filter(p => p.status === "winner").length === 0 && (
                      <tr>
                        <td colSpan={2} className="bp-text-center bp-text-muted bp-text-xs">
                          Winners have not been declared by jury yet.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}

            {event.status !== "setup" && (event.game_mode === "1v1" || event.game_mode === "team") && (
              <div>
                <p className="bp-card-copy bp-mb-md">
                  Single elimination brackets. {isCreator && <span className="bp-text-primary">Jury Mode: Click on a player's box to advance them.</span>}
                </p>

                <div className="bp-bracket">
                  {/* Group matches by rounds */}
                  {bracketRounds.map((roundNum) => {
                    const roundMatches = event.brackets.filter((b) => b.round === roundNum);
                    return (
                      <div key={roundNum} className="bp-bracket-round">
                        <span className="bp-text-xs bp-text-muted" style={{ textAlign: "center" }}>
                          ROUND {roundNum}
                        </span>
                        {roundMatches.map((match) => (
                          <div key={match.id} className="bp-bracket-match">
                            {/* Player A */}
                            <div
                              className={`bp-bracket-player ${
                                match.winner === match.player_a ? "winner" : match.winner && match.winner !== match.player_a ? "eliminated" : ""
                              }`}
                              onClick={() => match.player_a && !match.winner && handleAdvanceBracket(match.id, match.player_a)}
                            >
                              {match.player_a ? (
                                <span style={{ wordBreak: "break-all" }}>
                                  {match.player_a.startsWith("team-") ? teamLabel(match.player_a) : `${match.player_a.slice(0, 6)}...${match.player_a.slice(-4)}`}
                                </span>
                              ) : (
                                <span className="bp-text-muted">EMPTY TBD</span>
                              )}
                            </div>

                            {/* Player B */}
                            <div
                              className={`bp-bracket-player ${
                                match.winner === match.player_b ? "winner" : match.winner && match.winner !== match.player_b ? "eliminated" : ""
                              }`}
                              onClick={() => match.player_b && !match.winner && handleAdvanceBracket(match.id, match.player_b)}
                            >
                              {match.player_b ? (
                                <span style={{ wordBreak: "break-all" }}>
                                  {match.player_b.startsWith("team-") ? teamLabel(match.player_b) : `${match.player_b.slice(0, 6)}...${match.player_b.slice(-4)}`}
                                </span>
                              ) : (
                                <span className="bp-text-muted">EMPTY TBD</span>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      <Modal
        open={!!modal}
        title={modal?.title}
        tone={modal?.tone}
        message={modal?.message}
        onClose={() => setModal(null)}
        onConfirm={modal?.onConfirm}
        confirmLabel={modal?.confirmLabel}
      />
    </div>
  );
}
