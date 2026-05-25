"use client";

import React, { useEffect, useState } from "react";
import { API_BASE_URL } from "@/constants";
import { generateGamerTag } from "@/app/components/ConnectButtonClient";

interface ReputationEntry {
  wallet_address: string;
  reputation_score: number;
  created_at: string;
}

export default function LeaderboardPage() {
  const [entries, setEntries] = useState<ReputationEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchLeaderboard() {
      try {
        const res = await fetch(`${API_BASE_URL}/events/leaderboard/reputation`);
        if (!res.ok) throw new Error("Failed to load leaderboard");
        const data = await res.json();
        setEntries(data);
      } catch (err: any) {
        console.error(err);
        setError(err.message || "Failed to load leaderboard");
      } finally {
        setLoading(false);
      }
    }
    fetchLeaderboard();
  }, []);

  return (
    <div className="bp-form-shell bp-stack-lg">
      <div className="bp-page-intro">
        <h2 className="bp-section-title">■ Reputation Leaderboard ■</h2>
        <p className="bp-page-copy">
          Reputation is the health bar for trustworthy competitors. Higher scores signal players who consistently vote with consensus and help tournaments settle cleanly.
        </p>
      </div>

      <div className="bp-card bp-panel-info bp-mb-lg">
        <p className="bp-card-copy">
          bitPact's player reputation leaderboard. HP decreases when a player
          consistently votes with the minority during consensus rounds.
          Trusted players maintain high HP.
        </p>
      </div>

      {loading && (
        <div className="bp-card bp-panel-info bp-text-center bp-blink bp-text-primary">
          LOADING_LEADERBOARD_DATA...
        </div>
      )}

      {error && (
        <div className="bp-card bp-panel-destructive bp-text-center bp-text-red">
          ERROR: {error}
        </div>
      )}

      {!loading && !error && entries.length === 0 && (
        <div className="bp-card bp-text-center">
          <p className="bp-card-copy">
            NO REPUTATION DATA YET. PLAY TOURNAMENTS AND VOTE TO GET STARTED.
          </p>
        </div>
      )}

      {!loading && !error && entries.length > 0 && (
        <div className="bp-card">
          <h3 className="bp-card-title">■ HP Rankings ■</h3>
          <p className="bp-card-copy bp-mb-md">
            Top players keep their consensus record strong, protect settlements, and avoid minority penalties.
          </p>
          <table className="bp-leaderboard">
            <thead>
              <tr>
                <th>RANK</th>
                <th>PLAYER</th>
                <th>HP</th>
              </tr>
            </thead>
            <tbody>
              {entries.map((entry, idx) => (
                <tr key={entry.wallet_address}>
                  <td
                    className="bp-text-xs"
                    style={{
                      color:
                        idx === 0
                          ? "var(--bp-primary)"
                          : idx === 1
                          ? "var(--bp-accent)"
                          : idx === 2
                          ? "var(--bp-cyan)"
                          : "var(--bp-muted)",
                      fontWeight: idx < 3 ? "bold" : "normal",
                    }}
                  >
                    #{idx + 1}
                  </td>
                  <td className="bp-text-xs">
                    <span style={{ color: "var(--bp-green)" }}>
                      {generateGamerTag(entry.wallet_address)}
                    </span>
                    <span
                      className="bp-text-muted"
                      style={{
                        display: "block",
                        fontSize: "0.7rem",
                        marginTop: "4px",
                      }}
                    >
                      {entry.wallet_address.slice(0, 10)}...
                      {entry.wallet_address.slice(-6)}
                    </span>
                  </td>
                  <td>
                    <span
                      className="bp-text-xs"
                      style={{
                        color:
                          entry.reputation_score >= 80
                            ? "var(--bp-green)"
                            : entry.reputation_score >= 50
                            ? "var(--bp-accent)"
                            : "var(--bp-red)",
                      }}
                    >
                      {entry.reputation_score}/100
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
