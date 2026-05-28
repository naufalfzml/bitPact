"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { useAccount } from "wagmi";
import { API_BASE_URL } from "@/constants";

export default function CreateEventPage() {
  const router = useRouter();
  const { address, isConnected } = useAccount();

  const [title, setTitle] = useState("");
  const [maxParticipants, setMaxParticipants] = useState<number>(16);
  const [ticketPrice, setTicketPrice] = useState("");
  const [consensusThreshold, setConsensusThreshold] = useState(51);

  // Private Events state — bitPact events are private-only (no public option)
  const [accessType, setAccessType] = useState<"password" | "invite_only">("password");
  const [eventPassword, setEventPassword] = useState("");
  const [whitelistInput, setWhitelistInput] = useState("");
  const [whitelistAddresses, setWhitelistAddresses] = useState<string[]>([]);

  // Social Connect lookup state
  const [socialSearchInput, setSocialSearchInput] = useState("");
  const [socialSearchStatus, setSocialSearchStatus] = useState<"idle" | "loading" | "resolved" | "not_resolved">("idle");
  const [socialResolvedAddr, setSocialResolvedAddr] = useState<string | null>(null);
  const [showManualFallback, setShowManualFallback] = useState(false);

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

    // Use collected whitelist addresses for invite-only events
    const whitelist = accessType === "invite_only" && whitelistAddresses.length > 0
      ? whitelistAddresses
      : undefined;

    try {
      // `game_mode` is intentionally NOT sent here. The real mode is chosen
      // later by the creator via `/select-game-mode` after roster lock. The
      // backend default ("1v1") is treated as a placeholder until then;
      // the UI hides the mode badge while status === "setup" && !roster_locked.
      const res = await fetch(`${API_BASE_URL}/events`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          max_participants: Number(maxParticipants),
          ticket_price: ticketPrice,
          consensus_threshold: Number(consensusThreshold),
          creator_address: address,
          access_type: accessType,
          password: accessType === "password" ? eventPassword.trim() : undefined,
          whitelist,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to create tournament");

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
    <div className="bp-form-shell bp-stack-lg">
      <div className="bp-page-intro">
        <h2 className="bp-section-title">■ Create New Tournament ■</h2>
        <p className="bp-page-copy">
          Set up the bracket room, choose the access model, and prepare the escrow flow with cleaner form rhythm and clearer role-based panels.
        </p>
      </div>

      {!isConnected ? (
        <div className="bp-card bp-panel-warning bp-text-center">
          <p className="bp-text-accent bp-mb-md">WALLET NOT DETECTED</p>
          <p className="bp-card-copy">
            Please connect your Web3 wallet using the connect button at the top header to initialize contract creation.
          </p>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="bp-card">
          {error && (
            <div className="bp-card bp-panel-destructive bp-text-center bp-text-red bp-mb-lg">
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

          {/* Max Participants */}
          <div className="bp-field">
            <label className="bp-label">Max Participants *</label>
            <select
              className="bp-select"
              style={{ appearance: "none", WebkitAppearance: "none", MozAppearance: "none" }}
              value={maxParticipants}
              onChange={(e) => setMaxParticipants(Number(e.target.value))}
              disabled={loading}
            >
              <option value={0}>■ NOT SET (Unlimited Players)</option>
              <option value={4}>4 Players (Mini-Bracket)</option>
              <option value={8}>8 Players (Quarter-Finals)</option>
              <option value={16}>16 Players (Standard)</option>
              <option value={32}>32 Players (Grand Stage)</option>
              <option value={64}>64 Players (Epic Tournament)</option>
            </select>
          </div>

          {/* Ticket Price */}
          <div className="bp-field">
            <label className="bp-label">Entry Fee (USDC) *</label>
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
              onChange={(e) => setAccessType(e.target.value as "password" | "invite_only")}
              disabled={loading}
            >
              <option value="password">■ PRIVATE: PASSWORD — Room Code Required</option>
              <option value="invite_only">■ PRIVATE: INVITE ONLY — Whitelist Only</option>
            </select>
          </div>

          {/* Password Input (only if Password access) */}
          {accessType === "password" && (
            <div className="bp-field bp-card bp-panel-warning">
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
              <p className="bp-card-copy bp-mt-xs">
                Share this room code privately with your intended players.
              </p>
            </div>
          )}

          {/* Whitelist Builder (only if Invite-Only access) */}
          {accessType === "invite_only" && (
            <div className="bp-field bp-card bp-panel-info">
              <label className="bp-label">■ INVITE PLAYERS ■</label>

              {/* Social Connect Lookup */}
              <div className="bp-surface-strip bp-mb-md" style={{ borderColor: "rgba(76, 231, 255, 0.4)" }}>
                <p className="bp-text-xs bp-text-info bp-font-display bp-mb-sm">
                  ■ ENTER PLAYER EMAIL / PHONE NUMBER ■
                </p>
                <div className="bp-flex bp-gap-sm" style={{ alignItems: "flex-end" }}>
                  <input
                    type="text"
                    className="bp-input bp-text-xs"
                    placeholder="player@example.com or +123..."
                    value={socialSearchInput}
                    onChange={(e) => {
                      setSocialSearchInput(e.target.value);
                      setSocialSearchStatus("idle");
                      setSocialResolvedAddr(null);
                      setShowManualFallback(false);
                    }}
                    disabled={loading || socialSearchStatus === "loading"}
                    style={{ flex: 1 }}
                  />
                  <button
                    type="button"
                    className="bp-btn bp-btn-accent bp-text-xs"
                    disabled={loading || socialSearchStatus === "loading" || !socialSearchInput.trim()}
                    onClick={async () => {
                      setSocialSearchStatus("loading");
                      setSocialResolvedAddr(null);
                      setShowManualFallback(false);
                      try {
                        const res = await fetch(`${API_BASE_URL}/social-connect/lookup`, {
                          method: "POST",
                          headers: { "Content-Type": "application/json" },
                          body: JSON.stringify({ identifier: socialSearchInput.trim() }),
                        });
                        const data = await res.json();
                        if (data.status === "RESOLVED" && data.address) {
                          setSocialSearchStatus("resolved");
                          setSocialResolvedAddr(data.address);
                          // Auto-add to whitelist
                          const addr = data.address.toLowerCase();
                          if (!whitelistAddresses.includes(addr)) {
                            setWhitelistAddresses((prev) => [...prev, addr]);
                          }
                          setSocialSearchInput("");
                        } else {
                          setSocialSearchStatus("not_resolved");
                        }
                      } catch {
                        setSocialSearchStatus("not_resolved");
                      }
                    }}
                    style={{ whiteSpace: "nowrap" }}
                  >
                    {socialSearchStatus === "loading" ? "■ CONTACTING DECENTRALIZED IDENTITY NETWORK... ■" : "■ FIND AND INVITE ■"}
                  </button>
                </div>

                {/* Lookup result: resolved */}
                {socialSearchStatus === "resolved" && socialResolvedAddr && (
                  <div className="bp-card bp-panel-success bp-mt-sm">
                    <p className="bp-text-xs bp-text-green">
                      ■ FOUND: {socialResolvedAddr.slice(0, 14)}...{socialResolvedAddr.slice(-8)} — automatically added to the whitelist
                    </p>
                  </div>
                )}

                {/* Lookup result: not resolved */}
                {socialSearchStatus === "not_resolved" && (
                  <div className="bp-card bp-panel-destructive bp-mt-sm">
                    <p className="bp-text-xs bp-text-red" style={{ marginBottom: "6px" }}>
                      ■ IDENTITY NOT REGISTERED IN CELO SOCIAL CONNECT ■
                    </p>
                    <button
                      type="button"
                      className="bp-btn bp-btn-accent bp-text-xs bp-w-full"
                      onClick={() => {
                        setShowManualFallback(true);
                        setSocialSearchStatus("idle");
                      }}
                    >
                      ■ ENTER MANUALLY ■
                    </button>
                  </div>
                )}
              </div>

              {/* Manual wallet input fallback */}
              {showManualFallback && (
                <div className="bp-surface-strip bp-mb-md" style={{ borderColor: "rgba(255, 158, 79, 0.38)" }}>
                  <p className="bp-card-copy bp-mb-sm">Enter a wallet address manually:</p>
                  <div className="bp-flex bp-gap-sm" style={{ alignItems: "flex-end" }}>
                    <input
                      type="text"
                      className="bp-input bp-text-xs"
                      placeholder="0xABC...DEF"
                      value={whitelistInput}
                      onChange={(e) => setWhitelistInput(e.target.value)}
                      disabled={loading}
                      style={{ flex: 1 }}
                    />
                    <button
                      type="button"
                      className="bp-btn bp-btn-accent bp-text-xs"
                      disabled={loading || !whitelistInput.trim()}
                      onClick={() => {
                        const addr = whitelistInput.trim().toLowerCase();
                        if (addr && !whitelistAddresses.includes(addr)) {
                          setWhitelistAddresses((prev) => [...prev, addr]);
                        }
                        setWhitelistInput("");
                      }}
                      style={{ whiteSpace: "nowrap" }}
                    >
                      [ ADD ]
                    </button>
                  </div>
                </div>
              )}

              {/* Whitelist roster preview */}
              {whitelistAddresses.length > 0 && (
                <div className="bp-surface-strip" style={{ borderColor: "rgba(245, 232, 95, 0.34)" }}>
                  <p className="bp-text-xs bp-text-muted bp-font-display bp-mb-xs">■ INVITE LIST ({whitelistAddresses.length}):</p>
                  {whitelistAddresses.map((addr, i) => (
                    <div key={i} className="bp-flex bp-justify-between bp-items-center" style={{ padding: "4px 0", borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
                      <span className="bp-text-xs bp-text-green" style={{ fontFamily: "var(--bp-font-body)" }}>
                        {addr.slice(0, 14)}...{addr.slice(-8)}
                      </span>
                      <button
                        type="button"
                        className="bp-text-xs bp-text-red"
                        style={{ background: "none", border: "none", cursor: "pointer", fontFamily: "var(--bp-font)" }}
                        onClick={() => setWhitelistAddresses((prev) => prev.filter((_, idx) => idx !== i))}
                      >
                        [ DEL ]
                      </button>
                    </div>
                  ))}
                </div>
              )}
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
