"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { useAccount } from "wagmi";
import { API_BASE_URL } from "@/constants";

export default function CreateEventPage() {
  const router = useRouter();
  const { address, isConnected } = useAccount();

  const [title, setTitle] = useState("");
  const [gameMode, setGameMode] = useState<"1v1" | "team" | "ffa">("1v1");
  const [teamSize, setTeamSize] = useState(2);
  const [ticketPrice, setTicketPrice] = useState("");
  const [photoRequired, setPhotoRequired] = useState(false);
  const [consensusThreshold, setConsensusThreshold] = useState(51);

  // Private Events state
  const [accessType, setAccessType] = useState<"public" | "password" | "invite_only">("public");
  const [eventPassword, setEventPassword] = useState("");
  const [whitelistInput, setWhitelistInput] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isConnected || !address) {
      setError("Please connect your wallet first!");
      return;
    }
    if (!title || !ticketPrice) {
      setError("Please fill out all required fields!");
      return;
    }
    if (accessType === "password" && !eventPassword.trim()) {
      setError("Password is required for password-protected events!");
      return;
    }

    setLoading(true);
    setError(null);

    // Parse whitelist addresses from comma-separated input
    const whitelist = accessType === "invite_only"
      ? whitelistInput.split(",").map((s) => s.trim()).filter(Boolean)
      : undefined;

    try {
      const res = await fetch(`${API_BASE_URL}/events`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          game_mode: gameMode,
          team_size: gameMode === "team" ? Number(teamSize) : 1,
          ticket_price: ticketPrice,
          photo_required: photoRequired,
          consensus_threshold: Number(consensusThreshold),
          creator_address: address,
          access_type: accessType,
          password: accessType === "password" ? eventPassword.trim() : undefined,
          whitelist,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Gagal membuat turnamen");

      // Redirect to detail page
      router.push(`/events/${data.event.id}`);
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Failed to create event");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: "600px", margin: "0 auto" }}>
      <h2 className="bp-section-title">■ Create New Tournament ■</h2>

      {!isConnected ? (
        <div className="bp-card bp-text-center" style={{ borderColor: "var(--bp-accent)", padding: "32px 16px" }}>
          <p className="bp-text-accent bp-mb-md">WALLET NOT DETECTED</p>
          <p className="bp-text-xs bp-text-muted">
            Please connect your Web3 wallet using the connect button at the top header to initialize contract creation.
          </p>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="bp-card">
          {error && (
            <div className="bp-card bp-text-center bp-text-red bp-mb-lg" style={{ borderColor: "var(--bp-red)", padding: "12px" }}>
              ERROR: {error}
            </div>
          )}

          {/* Title */}
          <div className="bp-field">
            <label className="bp-label">Tournament Title *</label>
            <input
              type="text"
              className="bp-input"
              placeholder="e.g., Street Fighter Local Cup"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
              disabled={loading}
            />
          </div>

          {/* Game Mode */}
          <div className="bp-field">
            <label className="bp-label">Game Mode *</label>
            <select
              className="bp-select"
              value={gameMode}
              onChange={(e) => setGameMode(e.target.value as any)}
              disabled={loading}
            >
              <option value="1v1">1v1 PvP Bracket</option>
              <option value="team">Team PvP Bracket</option>
              <option value="ffa">Free For All (Leaderboard)</option>
            </select>
          </div>

          {/* Team Size (only if Team mode) */}
          {gameMode === "team" && (
            <div className="bp-field">
              <label className="bp-label">Team Size *</label>
              <input
                type="number"
                min="2"
                max="10"
                className="bp-input"
                value={teamSize}
                onChange={(e) => setTeamSize(Number(e.target.value))}
                required
                disabled={loading}
              />
            </div>
          )}

          {/* Ticket Price */}
          <div className="bp-field">
            <label className="bp-label">Entry Fee (cUSD) *</label>
            <input
              type="number"
              step="0.01"
              min="0.01"
              className="bp-input"
              placeholder="e.g., 1.50"
              value={ticketPrice}
              onChange={(e) => setTicketPrice(e.target.value)}
              required
              disabled={loading}
            />
          </div>

          {/* Access Type */}
          <div className="bp-field">
            <label className="bp-label">Access Type *</label>
            <select
              className="bp-select"
              value={accessType}
              onChange={(e) => setAccessType(e.target.value as any)}
              disabled={loading}
            >
              <option value="public">■ PUBLIC — Open to Everyone</option>
              <option value="password">■ PRIVATE: PASSWORD — Room Code Required</option>
              <option value="invite_only">■ PRIVATE: INVITE ONLY — Whitelist Only</option>
            </select>
          </div>

          {/* Password Input (only if Password access) */}
          {accessType === "password" && (
            <div className="bp-field">
              <label className="bp-label">Room Password *</label>
              <input
                type="text"
                className="bp-input"
                placeholder="Enter a secret room code for participants"
                value={eventPassword}
                onChange={(e) => setEventPassword(e.target.value)}
                required
                disabled={loading}
                style={{ letterSpacing: "2px" }}
              />
              <p className="bp-text-xs bp-text-muted" style={{ marginTop: "4px" }}>
                Share this room code privately with your intended players.
              </p>
            </div>
          )}

          {/* Whitelist Builder (only if Invite-Only access) */}
          {accessType === "invite_only" && (
            <div className="bp-field">
              <label className="bp-label">Invite Wallet Addresses</label>
              <textarea
                className="bp-input"
                placeholder={"0xAddress1, 0xAddress2, 0xAddress3..."}
                value={whitelistInput}
                onChange={(e) => setWhitelistInput(e.target.value)}
                disabled={loading}
                rows={4}
                style={{
                  resize: "vertical",
                  fontFamily: "var(--bp-font)",
                  fontSize: "0.5rem",
                  lineHeight: "1.6",
                }}
              />
              <p className="bp-text-xs bp-text-muted" style={{ marginTop: "4px" }}>
                Comma-separated wallet addresses. You can also add more invitees later from the event detail page.
              </p>
            </div>
          )}

          {/* Consensus Threshold */}
          <div className="bp-field">
            <label className="bp-label">Consensus Voting Threshold (%)</label>
            <input
              type="number"
              min="51"
              max="100"
              className="bp-input"
              value={consensusThreshold}
              onChange={(e) => setConsensusThreshold(Number(e.target.value))}
              disabled={loading}
            />
          </div>

          {/* Photo Required Toggle */}
          <div className="bp-field">
            <label className="bp-label">Audit Requirements</label>
            <div
              className={`bp-toggle ${photoRequired ? "active" : ""}`}
              onClick={() => !loading && setPhotoRequired(!photoRequired)}
              style={{ marginTop: "8px" }}
            >
              <div className="bp-toggle-track">
                <div className="bp-toggle-thumb" />
              </div>
              <span className="bp-text-xs">
                {photoRequired ? "Photo Proof Required" : "No Photo Proof Required"}
              </span>
            </div>
          </div>

          {/* Submit */}
          <div className="bp-flex bp-mt-xl">
            <button
              type="submit"
              className="bp-btn bp-btn-primary bp-w-full"
              disabled={loading}
            >
              {loading ? "INITIALIZING_ON_CHAIN_CONTRACT..." : "■ Deploy Contract"}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
