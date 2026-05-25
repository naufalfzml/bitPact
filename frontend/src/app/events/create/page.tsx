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
  const [photoRequired, setPhotoRequired] = useState(false);
  const [consensusThreshold, setConsensusThreshold] = useState(51);

  // Private Events state
  const [accessType, setAccessType] = useState<"public" | "password" | "invite_only">("public");
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
      const res = await fetch(`${API_BASE_URL}/events`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          game_mode: "1v1",
          max_participants: Number(maxParticipants),
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
              onChange={(e) => setAccessType(e.target.value as "public" | "password" | "invite_only")}
              disabled={loading}
            >
              <option value="public">■ PUBLIC — Anyone Can Join</option>
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
              <label className="bp-label">■ INVITE PLAYERS ■</label>

              {/* Social Connect Lookup */}
              <div style={{ padding: "12px", border: "1px solid var(--bp-cyan)", background: "rgba(0,255,255,0.05)", marginBottom: "12px" }}>
                <p className="bp-text-xs" style={{ color: "var(--bp-cyan)", marginBottom: "8px" }}>
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
                  <div style={{ marginTop: "8px", padding: "8px", border: "1px solid var(--bp-green)", background: "rgba(0,255,0,0.05)" }}>
                    <p className="bp-text-xs bp-text-green">
                      ■ FOUND: {socialResolvedAddr.slice(0, 14)}...{socialResolvedAddr.slice(-8)} — automatically added to the whitelist
                    </p>
                  </div>
                )}

                {/* Lookup result: not resolved */}
                {socialSearchStatus === "not_resolved" && (
                  <div style={{ marginTop: "8px", padding: "8px", border: "1px solid var(--bp-red)", background: "rgba(255,0,0,0.05)" }}>
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
                <div style={{ padding: "12px", border: "1px solid var(--bp-accent)", background: "rgba(255,193,7,0.05)", marginBottom: "12px" }}>
                  <p className="bp-text-xs bp-text-muted" style={{ marginBottom: "8px" }}>Enter a wallet address manually:</p>
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
                <div style={{ padding: "8px", border: "1px solid var(--bp-border)", marginTop: "8px" }}>
                  <p className="bp-text-xs bp-text-muted" style={{ marginBottom: "4px" }}>■ INVITE LIST ({whitelistAddresses.length}):</p>
                  {whitelistAddresses.map((addr, i) => (
                    <div key={i} className="bp-flex bp-justify-between bp-items-center" style={{ padding: "4px 0", borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
                      <span className="bp-text-xs bp-text-green" style={{ fontFamily: "var(--bp-font)" }}>
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
