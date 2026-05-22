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

  // ── Registration Flow ──
  const handleRegister = async () => {
    if (!isConnected || !address) {
      alert("Please connect your wallet!");
      return;
    }
    setRegistering(true);
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

      // 3. Update Database Backend
      const res = await fetch(`${API_BASE_URL}/events/${event.id}/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          wallet_address: address,
          tx_hash: registerTx,
        }),
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || "Gagal mendaftar di database");
      }

      setStatusMessage("REGISTRATION SUCCESSFUL! WELCOME PLAYER.");
      setTimeout(() => {
        setStatusMessage("");
        setRegistering(false);
        fetchEventDetail();
      }, 2000);
    } catch (err: any) {
      console.error(err);
      alert(`Registration Failed: ${err.message || "Unknown error"}`);
      setStatusMessage("");
      setRegistering(false);
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

  return (
    <div>
      {/* Event Header Banner */}
      <section className="bp-card bp-mb-lg">
        <div className="bp-flex bp-justify-between bp-items-center bp-mb-md">
          <span className={`bp-badge bp-badge-${event.game_mode}`}>
            {event.game_mode} {event.game_mode === "team" ? `(${event.team_size}v${event.team_size})` : ""}
          </span>
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
                {isRegistered ? (
                  <div className="bp-text-center">
                    <p className="bp-text-green bp-blink bp-text-sm">■ YOU ARE REGISTERED ■</p>
                    <p className="bp-text-xs bp-text-muted bp-mt-sm">Waiting for the creator to start the tournament matches.</p>
                  </div>
                ) : (
                  <div>
                    <p className="bp-text-xs bp-text-muted bp-mb-md">
                      Join this tournament by locking your {event.ticket_price} cUSD entrance fee in our secure escrow.
                    </p>
                    <button
                      className="bp-btn bp-btn-primary bp-w-full"
                      onClick={handleRegister}
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
