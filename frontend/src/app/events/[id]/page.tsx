"use client";

import React, { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useAccount, useWriteContract } from "wagmi";
import { parseEther, keccak256, stringToBytes } from "viem";
import { API_BASE_URL, VAULT_CONTRACT_ADDRESS, CUSD_TOKEN_ADDRESS, VAULT_ABI, CUSD_ABI } from "@/constants";

interface Participant {
  id: string;
  wallet_address: string;
  team_id: number | null;
  status: "registered" | "eliminated" | "winner";
  uploaded_photo_url: string | null;
}

interface BracketMatch {
  id: string;
  round: number;
  match_index: number;
  player_a: string;
  player_b: string;
  winner: string | null;
}

interface EventDetail {
  id: string;
  title: string;
  game_mode: "1v1" | "team" | "ffa";
  team_size: number;
  ticket_price: string;
  consensus_threshold: number;
  photo_required: boolean;
  status: "setup" | "active" | "voting" | "ended" | "disputed";
  creator_address: string;
  created_at: string;
  access_type: "public" | "password" | "invite_only";
  participants: Participant[];
  brackets: BracketMatch[];
  voting: {
    total: number;
    agree: number;
    reject: number;
    percentage: string | null;
  };
}

export default function EventDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const { address, isConnected } = useAccount();
  const { writeContractAsync } = useWriteContract();

  const [event, setEvent] = useState<EventDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [registering, setRegistering] = useState(false);
  const [statusMessage, setStatusMessage] = useState("");
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);

  // Manual Winner inputs for FFA Mode
  const [ffaWinner1, setFfaWinner1] = useState("");
  const [ffaWinner2, setFfaWinner2] = useState("");
  const [ffaWinner3, setFfaWinner3] = useState("");

  // Dispute / Appeal revised winners input
  const [appealWinners, setAppealWinners] = useState("");

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
  const [addingViaLookup, setAddingViaLookup] = useState(false);

  const fetchEventDetail = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/events/${id}`);
      if (!res.ok) throw new Error("Gagal mengambil detail turnamen");
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

  if (loading) {
    return <div className="bp-text-center bp-blink bp-text-primary" style={{ padding: "80px 0" }}>LOADING_DASHBOARD_PANEL...</div>;
  }

  if (!event) {
    return (
      <div className="bp-card bp-text-center bp-text-red" style={{ borderColor: "var(--bp-red)", padding: "48px 0" }}>
        ERROR: TOURNAMENT NOT FOUND
      </div>
    );
  }

  const isCreator = address && address.toLowerCase() === event.creator_address.toLowerCase();
  const isRegistered = address && event.participants.some(p => p.wallet_address.toLowerCase() === address.toLowerCase());
  const myParticipantObj = address ? event.participants.find(p => p.wallet_address.toLowerCase() === address.toLowerCase()) : null;

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

  // ── Registration Flow ──
  const handleRegister = async (passwordOverride?: string) => {
    if (!isConnected || !address) {
      alert("Please connect your wallet!");
      return;
    }
    setRegistering(true);
    setPasswordError(null);
    setStatusMessage("STEP 1: APPROVING CUSD TRANSACTIONS...");
    try {
      const ticketPriceWei = parseEther(event.ticket_price);
      const eventIdBytes32 = keccak256(stringToBytes(event.id));

      // 1. Approve cUSD Transfer
      const approveTx = await writeContractAsync({
        address: CUSD_TOKEN_ADDRESS,
        abi: CUSD_ABI,
        functionName: "approve",
        args: [VAULT_CONTRACT_ADDRESS, ticketPriceWei],
      });
      console.log("Approve Tx Hash:", approveTx);

      setStatusMessage("STEP 2: DEPOSITING cUSD INTO VAULT ESCROW...");

      // 2. Register inside Contract
      const registerTx = await writeContractAsync({
        address: VAULT_CONTRACT_ADDRESS,
        abi: VAULT_ABI,
        functionName: "register",
        args: [eventIdBytes32],
      });
      console.log("Register Tx Hash:", registerTx);

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
          setPasswordError(errorData.error || "Password turnamen tidak valid");
        }
        throw new Error(errorData.error || "Gagal mendaftar di database");
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
      alert(`Registration Failed: ${err.message || "Unknown error"}`);
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
      alert(`${walletAddr.slice(0, 10)}... added to whitelist!`);
      setWhitelistManualAddr("");
      fetchEventDetail();
    } catch (err: any) {
      alert(`Whitelist Error: ${err.message}`);
    } finally {
      setAddingToWhitelist(false);
    }
  };

  // ── Creator Control Flow ──
  const handleStartTournament = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/events/${event.id}/start`, {
        method: "POST",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Gagal memulai turnamen");
      fetchEventDetail();
    } catch (err: any) {
      alert(`Error: ${err.message}`);
    }
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
      if (!res.ok) throw new Error("Gagal mengupdate pemenang");
      fetchEventDetail();
    } catch (err: any) {
      alert(`Error: ${err.message}`);
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
      if (!res.ok) throw new Error(data.error || "Gagal mensubmit pemenang");
      fetchEventDetail();
    } catch (err: any) {
      alert(`Error: ${err.message}`);
    }
  };

  // ── Photo Audit Upload Flow ──
  const handlePhotoUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!photoFile || !address) return;

    setUploadingPhoto(true);
    const formData = new FormData();
    formData.append("photo", photoFile);
    formData.append("wallet_address", address);

    try {
      const res = await fetch(`${API_BASE_URL}/events/${event.id}/photo`, {
        method: "POST",
        body: formData,
      });
      if (!res.ok) throw new Error("Gagal mengupload bukti foto");
      alert("Photo Proof uploaded successfully!");
      setPhotoFile(null);
      fetchEventDetail();
    } catch (err: any) {
      alert(`Upload Error: ${err.message}`);
    } finally {
      setUploadingPhoto(false);
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
      if (!res.ok) throw new Error("Gagal mengajukan banding");
      alert("Appeal successfully submitted! Voting reopened.");
      setAppealWinners("");
      fetchEventDetail();
    } catch (err: any) {
      alert(`Appeal Error: ${err.message}`);
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

  const handleAddResolvedPlayer = async () => {
    if (!resolvedAddress || !event) return;
    setAddingViaLookup(true);
    try {
      // Register the resolved wallet address directly into the database roster
      const res = await fetch(`${API_BASE_URL}/events/${event.id}/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          wallet_address: resolvedAddress,
          tx_hash: "social-connect-invite", // Placeholder — on-chain deposit handled separately by the invited player
        }),
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || "Failed to add player");
      }

      alert(`Player ${resolvedAddress.slice(0, 10)}... added to roster!`);
      setSocialInput("");
      setSocialLookupStatus("idle");
      setResolvedAddress(null);
      fetchEventDetail();
    } catch (err: any) {
      alert(`Add Player Error: ${err.message}`);
    } finally {
      setAddingViaLookup(false);
    }
  };

  return (
    <div>
      {/* Event Header Banner */}
      <section className="bp-card bp-mb-lg">
        <div className="bp-flex bp-justify-between bp-items-center bp-mb-md">
          <div className="bp-flex bp-gap-sm bp-items-center">
            <span className={`bp-badge bp-badge-${event.game_mode}`}>
              {event.game_mode} {event.game_mode === "team" ? `(${event.team_size}v${event.team_size})` : ""}
            </span>
            {/* Access Type Badge */}
            {event.access_type === "password" && (
              <span className="bp-badge" style={{ borderColor: "var(--bp-accent)", color: "var(--bp-accent)", background: "rgba(255,193,7,0.1)" }}>
                ■ PRIVATE: PASSWORD ■
              </span>
            )}
            {event.access_type === "invite_only" && (
              <span className="bp-badge" style={{ borderColor: "var(--bp-cyan)", color: "var(--bp-cyan)", background: "rgba(0,255,255,0.1)" }}>
                ■ PRIVATE: INVITE ONLY ■
              </span>
            )}
          </div>
          <span className={`bp-badge bp-badge-${event.status}`}>{event.status}</span>
        </div>
        <h1 className="bp-text-xl bp-text-primary bp-mb-md">{event.title}</h1>
        <div className="bp-grid bp-grid-3 bp-text-xs">
          <div>
            <span className="bp-text-muted">TICKET PRICE:</span>
            <p className="bp-text-sm bp-text-primary" style={{ marginTop: "4px" }}>
              {event.ticket_price} cUSD
            </p>
          </div>
          <div>
            <span className="bp-text-muted">TOTAL PRIZE POOL:</span>
            <p className="bp-text-sm bp-text-green" style={{ marginTop: "4px" }}>
              {(Number(event.ticket_price) * event.participants.length).toFixed(2)} cUSD
            </p>
          </div>
          <div>
            <span className="bp-text-muted">PARTICIPANTS:</span>
            <p className="bp-text-sm" style={{ marginTop: "4px" }}>
              {event.participants.length} Players Registered
            </p>
          </div>
        </div>
      </section>

      {/* Main Details Panel */}
      <div className="bp-grid bp-grid-2">
        {/* Left Side: General Info, Registration & Voting Stats */}
        <div className="bp-flex bp-flex-col bp-gap-lg">
          {/* Registration / Active Console */}
          <div className="bp-card">
            <h3 className="bp-card-title">■ Player Console ■</h3>

            {event.status === "setup" && (
              <div>
                {/* Creator Restriction: block creators from registering */}
                {isCreator ? (
                  <div className="bp-text-center" style={{ padding: "16px 8px", border: "2px solid var(--bp-red)", background: "rgba(255,0,0,0.05)" }}>
                    <p className="bp-text-red bp-text-sm" style={{ letterSpacing: "1px" }}>■ KREATUR TIDAK BISA IKUT BERMAIN ■</p>
                    <p className="bp-text-xs bp-text-muted bp-mt-sm">
                      Sebagai penyelenggara/juri, Anda tidak dapat berpartisipasi di turnamen buatan sendiri.
                    </p>
                  </div>
                ) : isRegistered ? (
                  <div className="bp-text-center">
                    <p className="bp-text-green bp-blink bp-text-sm">■ YOU ARE REGISTERED ■</p>
                    <p className="bp-text-xs bp-text-muted bp-mt-sm">Waiting for the creator to start the tournament matches.</p>
                  </div>
                ) : event.access_type === "password" ? (
                  /* Password-protected registration form */
                  <div>
                    <p className="bp-text-xs bp-text-muted bp-mb-md">
                      This tournament requires a room code. Enter the password shared by the organizer to register.
                    </p>
                    {passwordError && (
                      <div className="bp-text-center bp-text-red bp-text-xs bp-mb-sm" style={{ padding: "8px", border: "1px solid var(--bp-red)" }}>
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
                    <button
                      className="bp-btn bp-btn-primary bp-w-full"
                      onClick={() => handleRegister(roomPassword)}
                      disabled={registering || !roomPassword.trim()}
                    >
                      {registering ? statusMessage : "■ ENTER ROOM CODE ■"}
                    </button>
                  </div>
                ) : event.access_type === "invite_only" && !isWhitelisted ? (
                  /* Invite-only: user not on whitelist */
                  <div className="bp-text-center" style={{ padding: "16px 8px", border: "2px solid var(--bp-cyan)", background: "rgba(0,255,255,0.05)" }}>
                    <p className="bp-text-xs" style={{ color: "var(--bp-cyan)", letterSpacing: "1px" }}>■ KHUSUS UNDANGAN ■</p>
                    <p className="bp-text-xs bp-text-muted bp-mt-sm">
                      Turnamen ini hanya untuk peserta yang diundang. Hubungi penyelenggara untuk mendapatkan akses.
                    </p>
                  </div>
                ) : (
                  /* Public or whitelisted invite-only: normal registration */
                  <div>
                    <p className="bp-text-xs bp-text-muted bp-mb-md">
                      Join this tournament by locking your {event.ticket_price} cUSD entrance fee in our secure escrow.
                    </p>
                    <button
                      className="bp-btn bp-btn-primary bp-w-full"
                      onClick={() => handleRegister()}
                      disabled={registering}
                    >
                      {registering ? statusMessage : "■ Register & Lock cUSD"}
                    </button>
                  </div>
                )}
              </div>
            )}

            {event.status === "active" && (
              <div className="bp-text-center">
                <p className="bp-text-green bp-text-sm">■ TOURNAMENT ACTIVE ■</p>
                <p className="bp-text-xs bp-text-muted bp-mt-sm">Matches are currently playing in real-time. Follow bracket state below.</p>
              </div>
            )}

            {event.status === "voting" && (
              <div>
                <p className="bp-text-xs bp-text-muted bp-mb-md">
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
                <p className="bp-text-xs bp-text-muted bp-mt-sm">Funds have been fully automated, settled and distributed.</p>
              </div>
            )}

            {event.status === "disputed" && (
              <div className="bp-text-center">
                <p className="bp-text-red bp-blink bp-text-sm">■ SYSTEM DISPUTED ■</p>
                <p className="bp-text-xs bp-text-muted bp-mt-sm">The consensus vote tied 50/50. Waiting for creator to appeal revised winners.</p>
              </div>
            )}
          </div>

          {/* Proof Upload (Audit requirements) */}
          {event.photo_required && isRegistered && myParticipantObj?.status === "winner" && (
            <div className="bp-card" style={{ borderColor: "var(--bp-accent)" }}>
              <h3 className="bp-card-title" style={{ color: "var(--bp-accent)" }}>■ Photo Audit Proof Required ■</h3>
              <p className="bp-text-xs bp-text-muted bp-mb-md">
                Jury designated you as a winner! You MUST upload screenshot proof of your match results before rewards can be unlocked.
              </p>
              {myParticipantObj.uploaded_photo_url ? (
                <div>
                  <p className="bp-text-xs bp-text-green">✓ PHOTO SUBMITTED SUCCESSFULY</p>
                  <a
                    href={myParticipantObj.uploaded_photo_url}
                    target="_blank"
                    rel="noreferrer"
                    className="bp-text-xs"
                    style={{ textDecoration: "underline" }}
                  >
                    View uploaded proof image
                  </a>
                </div>
              ) : (
                <form onSubmit={handlePhotoUpload} className="bp-flex bp-flex-col bp-gap-sm">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => setPhotoFile(e.target.files?.[0] || null)}
                    required
                    style={{ fontFamily: "var(--bp-font)", fontSize: "0.5rem" }}
                  />
                  <button
                    type="submit"
                    className="bp-btn bp-btn-accent"
                    disabled={uploadingPhoto || !photoFile}
                  >
                    {uploadingPhoto ? "UPLOADING..." : "Submit Proof Screen"}
                  </button>
                </form>
              )}
            </div>
          )}

          {/* Voting progress (Only if Voting / Ended / Disputed) */}
          {["voting", "ended", "disputed"].includes(event.status) && (
            <div className="bp-card">
              <h3 className="bp-card-title">■ Consensus Consensus Stats ■</h3>
              <p className="bp-text-xs bp-text-muted bp-mb-md">
                Voting Status: {event.voting.total} Votes logged. Agree threshold: {event.consensus_threshold}%.
              </p>
              <div className="bp-flex bp-justify-between bp-text-xs bp-mb-xs">
                <span>Agree: {event.voting.agree}</span>
                <span>Reject: {event.voting.reject}</span>
              </div>
              <div className="bp-progress bp-mb-md">
                <div
                  className="bp-progress-fill"
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

          {/* Participants list */}
          <div className="bp-card">
            <h3 className="bp-card-title">■ Registered Roster ■</h3>

            {/* Whitelist Management — Creator Only, Invite-Only, Setup Phase */}
            {isCreator && event.status === "setup" && event.access_type === "invite_only" && (
              <div style={{ marginBottom: "16px", padding: "12px", border: "1px solid var(--bp-cyan)", background: "rgba(0,255,255,0.05)" }}>
                <p className="bp-text-xs" style={{ color: "var(--bp-cyan)", marginBottom: "8px" }}>
                  ■ WHITELIST MANAGEMENT ■
                </p>

                {/* Manual wallet address input */}
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

            {/* Social Connect Invite — Creator Only, Setup Phase */}
            {isCreator && event.status === "setup" && (
              <div style={{ marginBottom: "16px", padding: "12px", border: "1px solid var(--bp-accent)", background: "rgba(0,0,0,0.3)" }}>
                <p className="bp-text-xs bp-text-muted" style={{ marginBottom: "8px" }}>
                  [ SOCIAL CONNECT ] Invite players by email or phone number:
                </p>
                <form onSubmit={handleSocialLookup} className="bp-flex bp-gap-sm" style={{ alignItems: "flex-end" }}>
                  <input
                    type="text"
                    className="bp-input bp-text-xs"
                    placeholder="email or phone (e.g. +628...)"
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
                    {socialLookupStatus === "loading" ? "SEARCHING..." : "[ SEARCH ]"}
                  </button>
                </form>

                {/* Lookup Result */}
                {socialLookupStatus === "resolved" && resolvedAddress && (
                  <div style={{ marginTop: "8px", padding: "8px", border: "1px solid var(--bp-green)", background: "rgba(0,255,0,0.05)" }}>
                    <p className="bp-text-xs bp-text-green" style={{ marginBottom: "4px" }}>
                      ■ RESOLVED: {resolvedAddress.slice(0, 14)}...{resolvedAddress.slice(-8)}
                    </p>
                    <button
                      className="bp-btn bp-btn-green bp-text-xs bp-w-full"
                      onClick={() => {
                        if (event.access_type === "invite_only") {
                          handleAddToWhitelist(resolvedAddress);
                        } else {
                          handleAddResolvedPlayer();
                        }
                      }}
                      disabled={addingViaLookup || addingToWhitelist}
                    >
                      {(addingViaLookup || addingToWhitelist) ? "ADDING..." : event.access_type === "invite_only" ? "[ ADD TO WHITELIST ]" : "[ ADD TO ROSTER ]"}
                    </button>
                  </div>
                )}

                {socialLookupStatus === "not_resolved" && (
                  <div style={{ marginTop: "8px", padding: "8px", border: "1px solid var(--bp-red)", background: "rgba(255,0,0,0.05)" }}>
                    <p className="bp-text-xs bp-text-red">
                      ■ NOT FOUND — Identity not registered in Social Connect. Try a wallet address instead.
                    </p>
                  </div>
                )}
              </div>
            )}

            {event.participants.length === 0 ? (
              <p className="bp-text-xs bp-text-muted">No players signed up yet.</p>
            ) : (
              <div style={{ maxHeight: "250px", overflowY: "auto" }}>
                <table className="bp-leaderboard">
                  <thead>
                    <tr>
                      <th>WALLET ADDRESS</th>
                      <th>STATUS</th>
                    </tr>
                  </thead>
                  <tbody>
                    {event.participants.map((p) => (
                      <tr key={p.id}>
                        <td className="bp-text-xs" style={{ wordBreak: "break-all" }}>
                          {p.wallet_address.slice(0, 10)}...{p.wallet_address.slice(-8)}
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
            <div className="bp-card" style={{ borderColor: "var(--bp-primary)" }}>
              <h3 className="bp-card-title">🛡️ Creator Control Console 🛡️</h3>

              {event.status === "setup" && (
                <div>
                  <p className="bp-text-xs bp-text-muted bp-mb-md">
                    Start the tournament to lock signups, team distributions, and generate the dynamic matchups.
                  </p>
                  <button
                    className="bp-btn bp-btn-primary bp-w-full"
                    onClick={handleStartTournament}
                  >
                    ■ Start Tournament & Shuffler
                  </button>
                </div>
              )}

              {event.status === "active" && event.game_mode === "ffa" && (
                <div>
                  <p className="bp-text-xs bp-text-muted bp-mb-md">
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
                        alert("Must enter at least one winner!");
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
                  <p className="bp-text-xs bp-text-muted bp-mb-md">
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

              {event.status === "disputed" && (
                <div>
                  <p className="bp-text-xs bp-text-muted bp-mb-md">
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

              {!["setup", "active", "disputed"].includes(event.status) && (
                <p className="bp-text-xs bp-text-muted">No admin actions required in state {event.status}.</p>
              )}
            </div>
          )}

          {/* Visual Brackets or Leaderboard Display */}
          <div className="bp-card">
            <h3 className="bp-card-title">■ Arena Board ■</h3>

            {event.status === "setup" && (
              <div className="bp-text-center bp-text-muted" style={{ padding: "48px 0" }}>
                ARENA OFFLINE. WAITING FOR TOURNAMENT TO INITIALIZE.
              </div>
            )}

            {event.status !== "setup" && event.game_mode === "ffa" && (
              <div>
                <p className="bp-text-xs bp-text-muted bp-mb-lg">
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
                <p className="bp-text-xs bp-text-muted bp-mb-md">
                  Single elimination brackets. {isCreator && <span className="bp-text-primary">Jury Mode: Click on a player's box to advance them.</span>}
                </p>

                <div className="bp-bracket">
                  {/* Group matches by rounds */}
                  {Array.from(new Set(event.brackets.map((b) => b.round))).map((roundNum) => {
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
                                  {match.player_a.startsWith("team-") ? match.player_a.toUpperCase() : `${match.player_a.slice(0, 6)}...${match.player_a.slice(-4)}`}
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
                                  {match.player_b.startsWith("team-") ? match.player_b.toUpperCase() : `${match.player_b.slice(0, 6)}...${match.player_b.slice(-4)}`}
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
    </div>
  );
}
