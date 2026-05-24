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
        if (!res.ok) throw new Error("Gagal mengambil data leaderboard");
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
    <div style={{ maxWidth: "700px", margin: "0 auto" }}>
      <h2 className="bp-section-title">■ Reputation Leaderboard ■</h2>

      <div className="bp-card bp-mb-lg">
        <p className="bp-text-xs bp-text-muted" style={{ lineHeight: "1.6" }}>
          Papan peringkat reputasi pemain bitPact. Skor HP berkurang jika pemain
          secara konsisten memilih di pihak minoritas saat voting konsensus.
          Pemain tepercaya memiliki HP tinggi.
        </p>
      </div>

      {loading && (
        <div
          className="bp-text-center bp-blink bp-text-primary"
          style={{ padding: "48px 0" }}
        >
          LOADING_LEADERBOARD_DATA...
        </div>
      )}

      {error && (
        <div
          className="bp-card bp-text-center bp-text-red"
          style={{ borderColor: "var(--bp-red)", padding: "24px" }}
        >
          ERROR: {error}
        </div>
      )}

      {!loading && !error && entries.length === 0 && (
        <div className="bp-card bp-text-center" style={{ padding: "48px 24px" }}>
          <p className="bp-text-muted">
            BELUM ADA DATA REPUTASI. MAINKAN TURNAMEN DAN VOTE UNTUK MEMULAI.
          </p>
        </div>
      )}

      {!loading && !error && entries.length > 0 && (
        <div className="bp-card">
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
                        fontSize: "0.35rem",
                        marginTop: "2px",
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
