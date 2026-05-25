"use client";

import React, { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useAccount } from "wagmi";
import { API_BASE_URL } from "@/constants";
import { generateGamerTag } from "@/app/components/ConnectButtonClient";

interface Participant {
  id: string;
  wallet_address: string;
  status: "registered" | "eliminated" | "winner";
}

interface EventDetail {
  id: string;
  title: string;
  status: "setup" | "active" | "voting" | "ended" | "disputed";
  consensus_threshold: number;
  creator_address: string;
  participants: Participant[];
  voting: {
    total: number;
    agree: number;
    reject: number;
    percentage: string | null;
  };
}

export default function VotingConsolePage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const { address, isConnected } = useAccount();

  const [event, setEvent] = useState<EventDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [distributing, setDistributing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const fetchEventDetail = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/events/${id}`);
      if (!res.ok) throw new Error("Gagal mengambil data turnamen");
      const data = await res.json();
      setEvent(data);
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Failed to load details");
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
    return <div className="bp-text-center bp-blink bp-text-primary" style={{ padding: "80px 0" }}>SYNCHRONIZING_VOTING_CHANNELS...</div>;
  }

  if (error || !event) {
    return (
      <div className="bp-card bp-text-center bp-text-red" style={{ borderColor: "var(--bp-red)", padding: "48px 0" }}>
        ERROR: {error || "TOURNAMENT NOT FOUND"}
      </div>
    );
  }

  const isParticipant = address && event.participants.some(
    (p) => p.wallet_address.toLowerCase() === address.toLowerCase()
  );

  const isCreator = address && event.creator_address &&
    address.toLowerCase() === event.creator_address.toLowerCase();

  // Calculate quorum percentage
  const quorumPercent = event.participants.length > 0
    ? (event.voting.total / event.participants.length) * 100
    : 0;
  const quorumMet = quorumPercent >= 51;

  const winners = event.participants.filter((p) => p.status === "winner");

  const handleVote = async (isValid: boolean) => {
    if (!isConnected || !address) {
      alert("Please connect your wallet!");
      return;
    }
    if (!isParticipant) {
      alert("Only registered participants of this tournament can vote!");
      return;
    }

    setSubmitting(true);
    setError(null);
    setSuccessMsg(null);

    try {
      const res = await fetch(`${API_BASE_URL}/events/${event.id}/vote`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          voter_address: address,
          is_valid: isValid,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Gagal mensubmit vote");

      setSuccessMsg(`VOTE RECORDED SUCCESSFULY! INJECTING INTO BLOCKCHAIN...`);
      setTimeout(() => {
        setSuccessMsg(null);
        setSubmitting(false);
        fetchEventDetail();
      }, 2000);
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Failed to submit vote");
      setSubmitting(false);
    }
  };

  return (
    <div style={{ maxWidth: "700px", margin: "0 auto" }}>
      <h2 className="bp-section-title">■ Consensus Voting Console ■</h2>

      <div className="bp-card bp-mb-lg">
        <h3 className="bp-card-title">Event: {event.title}</h3>
        <p className="bp-text-xs bp-text-muted bp-mt-sm">
          Please audit the proposed winners submitted below. If the majority agrees, the escrow funds will automatically unlock and payout. If rejected, funds are refunded to all players.
        </p>
      </div>

      {/* Winners List */}
      <div className="bp-card bp-mb-lg" style={{ borderColor: "var(--bp-green)" }}>
        <h3 className="bp-card-title" style={{ color: "var(--bp-green)" }}>■ Proposed Winners ■</h3>
        <ul className="bp-text-xs bp-mt-md" style={{ listStyleType: "none", padding: 0 }}>
          {winners.map((p, index) => (
            <li key={p.id} className="bp-mb-md" style={{ display: "flex", gap: "12px", alignItems: "center" }}>
              <span className="bp-badge bp-badge-active" style={{ fontSize: "0.5rem" }}>
                RANK {index + 1}
              </span>
              <span>
                <span style={{ color: "var(--bp-green)" }}>{generateGamerTag(p.wallet_address)}</span>
                <span className="bp-text-muted" style={{ fontSize: "0.35rem", marginLeft: "6px" }}>
                  {p.wallet_address.slice(0, 10)}...{p.wallet_address.slice(-8)}
                </span>
              </span>
            </li>
          ))}
          {winners.length === 0 && (
            <li className="bp-text-muted">No proposed winners in this tournament round.</li>
          )}
        </ul>
      </div>

      {/* Status Messages */}
      {successMsg && (
        <div className="bp-card bp-text-center bp-text-green bp-blink bp-mb-lg" style={{ borderColor: "var(--bp-green)", padding: "12px" }}>
          {successMsg}
        </div>
      )}

      {error && (
        <div className="bp-card bp-text-center bp-text-red bp-mb-lg" style={{ borderColor: "var(--bp-red)", padding: "12px" }}>
          ERROR: {error}
        </div>
      )}

      {/* Voting panel (Active only during voting phase) */}
      {event.status === "voting" ? (
        <div>
          {/* Minority Penalty Warning Banner */}
          <div className="bp-penalty-warning">
            ■ WARNING: PENALTI -10 HP HANYA BERLAKU JIKA HASIL AKHIR >=85% SEPIHAK DAN ANDA BERADA DI PIHAK MINORITAS ■
          </div>

          {!isParticipant ? (
            <div className="bp-card bp-text-center bp-text-accent bp-mb-lg" style={{ borderColor: "var(--bp-accent)" }}>
              AUDITING MODE ONLY
              <p className="bp-text-xs bp-text-muted bp-mt-sm">
                Your wallet is not registered in this tournament. You may watch live consensus stats, but cannot submit votes.
              </p>
            </div>
          ) : (
            <div className="bp-vote-panel">
              <button
                className="bp-vote-btn bp-vote-agree"
                disabled={submitting}
                onClick={() => handleVote(true)}
              >
                ■ AGREE (PAY)
              </button>
              <button
                className="bp-vote-btn bp-vote-reject"
                disabled={submitting}
                onClick={() => handleVote(false)}
              >
                ■ REJECT (REFUND)
              </button>
            </div>
          )}

          {/* Distribute Prize Button — Creator only, quorum met */}
          {isCreator && quorumMet && (
            <div className="bp-card bp-mb-lg" style={{ borderColor: "var(--bp-green)", background: "rgba(57,255,20,0.05)" }}>
              <p className="bp-text-xs bp-text-muted bp-mb-md">
                Kuorum voting tercapai ({quorumPercent.toFixed(1)}%). Anda dapat mendistribusikan hadiah sekarang.
              </p>
              <button
                className="bp-btn-distribute"
                disabled={distributing}
                onClick={async () => {
                  setDistributing(true);
                  try {
                    const res = await fetch(`${API_BASE_URL}/events/${event.id}/distribute`, {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({ creator_address: address }),
                    });
                    const data = await res.json();
                    if (!res.ok) throw new Error(data.error || "Gagal mendistribusikan hadiah");
                    alert("Hadiah berhasil didistribusikan!");
                    fetchEventDetail();
                  } catch (err: any) {
                    alert(`Error: ${err.message}`);
                  } finally {
                    setDistributing(false);
                  }
                }}
              >
                {distributing ? "■ DISTRIBUTING... ■" : "■ DISTRIBUTE PRIZE ■"}
              </button>
            </div>
          )}
        </div>
      ) : (
        <div className="bp-card bp-text-center bp-mb-lg">
          VOTING IS CLOSED
          <p className="bp-text-xs bp-text-muted bp-mt-sm">
            This tournament consensus is resolved. Status: <span className="bp-text-primary">{event.status.toUpperCase()}</span>
          </p>
        </div>
      )}

      {/* Real-time progress bar stats */}
      <div className="bp-card">
        <h3 className="bp-card-title">■ Live Ballot Count ■</h3>
        <div className="bp-grid bp-grid-2 bp-text-xs bp-mt-md bp-mb-sm">
          <div>AGREE VOTES: <span className="bp-text-green">{event.voting.agree}</span></div>
          <div style={{ textAlign: "right" }}>REJECT VOTES: <span className="bp-text-red">{event.voting.reject}</span></div>
        </div>
        <div className="bp-progress bp-mb-md">
          <div
            className={`bp-progress-fill ${Number(event.voting.reject) > Number(event.voting.agree) ? "reject" : ""}`}
            style={{ width: `${event.voting.percentage || 0}%` }}
          />
        </div>
        <div className="bp-flex bp-justify-between bp-text-xs bp-text-muted">
          <span>Total Ballots: {event.voting.total}</span>
          <span>Required Consensus: {event.consensus_threshold}%</span>
        </div>
        <div className="bp-text-center bp-mt-lg">
          <button onClick={() => router.push(`/events/${event.id}`)} className="bp-btn bp-w-full">
            ■ Back to Console Dashboard
          </button>
        </div>
      </div>
    </div>
  );
}
