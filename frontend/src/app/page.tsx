"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { API_BASE_URL } from "@/constants";

interface Event {
  id: string;
  title: string;
  game_mode: "1v1" | "team" | "ffa";
  team_size: number;
  ticket_price: string;
  status: "setup" | "active" | "voting" | "ended" | "disputed";
  access_type?: "password" | "invite_only";
  participant_count: number;
  created_at: string;
}

export default function HomePage() {
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchText, setSearchText] = useState("");
  const [selectedStage, setSelectedStage] = useState<"all" | "setup" | "active" | "ended">("all");

  useEffect(() => {
    async function fetchEvents() {
      try {
        const res = await fetch(`${API_BASE_URL}/events`);
        if (!res.ok) throw new Error("Gagal mengambil data turnamen");
        const data = await res.json();
        setEvents(data);
      } catch (err: any) {
        console.error(err);
        setError(err.message || "Something went wrong");
      } finally {
        setLoading(false);
      }
    }

    fetchEvents();
  }, []);

  return (
    <div>
      {/* Hero Section */}
      <section className="bp-hero">
        <h1 className="bp-hero-title bp-pulse">bitPatch</h1>
        <p className="bp-hero-subtitle">
          Pixel-accurate, decentralized 8-bit retro gaming tournament platform. Hold escrows, manage brackets, and vote on consensus via Celo cUSD.
        </p>
        <div style={{ display: "flex", justifyContent: "center", gap: "16px", flexWrap: "wrap" }}>
          <Link href="/events/create" className="bp-btn bp-btn-primary bp-btn-lg">
            ■ Create Event
          </Link>
          <a href="#explore" className="bp-btn bp-btn-accent bp-btn-lg">
            ■ Explore Brackets
          </a>
        </div>
      </section>

      {/* Highlights / Features Grid */}
      <section className="bp-section">
        <h2 className="bp-section-title">■ Features ■</h2>
        <div className="bp-grid bp-grid-3">
          <div className="bp-card">
            <h3 className="bp-card-title">Blind Escrow</h3>
            <p className="bp-text-xs bp-text-muted" style={{ lineHeight: "1.6" }}>
              Players stake cUSD entry fees into a secure smart contract. Zero developer custody. Zero trust required.
            </p>
          </div>
          <div className="bp-card">
            <h3 className="bp-card-title">Dynamic Brackets</h3>
            <p className="bp-text-xs bp-text-muted" style={{ lineHeight: "1.6" }}>
              Automated single-elimination bracket generation for 1v1 and Team modes, complete with linear visual connections.
            </p>
          </div>
          <div className="bp-card">
            <h3 className="bp-card-title">Minority Penalty</h3>
            <p className="bp-text-xs bp-text-muted" style={{ lineHeight: "1.6" }}>
              Consensus-based payout resolution. Trolls voting against the clear majority are penalized in reputation.
            </p>
          </div>
        </div>
      </section>

      {/* Events Listing Section */}
      <section id="explore" className="bp-section" style={{ scrollMarginTop: "100px" }}>
        <h2 className="bp-section-title">■ Active Tournaments ■</h2>

        {/* SELECT STAGE — Search & Filter Bar */}
        <div style={{ display: "flex", flexDirection: "column", gap: "12px", background: "rgba(255,255,255,0.02)", border: "1px solid #333", padding: "16px", marginBottom: "24px" }}>
          <p className="bp-text-xs" style={{ color: "var(--bp-primary)", letterSpacing: "1px" }}>■ SELECT STAGE & SEARCH CHANNEL ■</p>
          <div style={{ display: "flex", gap: "12px", flexWrap: "wrap", alignItems: "center" }}>
            {/* Search Input */}
            <input
              type="text"
              className="bp-input bp-text-xs"
              placeholder="SEARCH BY TITLE..."
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              style={{ flex: 1, minWidth: "200px" }}
            />
            {/* Stage Selector Buttons */}
            <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
              {(["all", "setup", "active", "ended"] as const).map((stage) => (
                <button
                  key={stage}
                  className={`bp-btn bp-text-xs ${selectedStage === stage ? "bp-btn-accent" : ""}`}
                  style={{
                    padding: "8px 12px",
                    background: selectedStage === stage ? "var(--bp-accent)" : "transparent",
                    borderColor: "#555"
                  }}
                  onClick={() => setSelectedStage(stage)}
                >
                  ■ {stage.toUpperCase()}
                </button>
              ))}
            </div>
          </div>
        </div>

        {loading && (
          <div className="bp-text-center bp-blink bp-text-primary" style={{ padding: "48px 0" }}>
            LOADING_DATA_PACKETS...
          </div>
        )}

        {error && (
          <div className="bp-card bp-text-center bp-text-red" style={{ padding: "24px", borderColor: "var(--bp-red)" }}>
            ERROR: {error}
          </div>
        )}

        {/* Filter local events list */}
        {!loading && !error && (() => {
          const filteredEvents = events.filter((e) => {
            const matchesSearch = e.title.toLowerCase().includes(searchText.toLowerCase()) ||
              e.game_mode.toLowerCase().includes(searchText.toLowerCase());

            if (selectedStage === "all") return matchesSearch;
            if (selectedStage === "setup") return matchesSearch && e.status === "setup";
            if (selectedStage === "active") return matchesSearch && e.status === "active";
            if (selectedStage === "ended") return matchesSearch && (e.status === "ended" || e.status === "voting" || e.status === "disputed");
            return matchesSearch;
          });

          if (filteredEvents.length === 0) {
            return (
              <div className="bp-card bp-text-center" style={{ padding: "48px 24px" }}>
                <p className="bp-text-muted">NO TOURNAMENTS MATCHING THIS STAGE</p>
                <Link href="/events/create" className="bp-btn bp-btn-primary bp-mt-md">
                  Start A New Event
                </Link>
              </div>
            );
          }

          return (
            <div className="bp-grid bp-grid-2">
              {filteredEvents.map((event) => (
                <div key={event.id} className="bp-card">
                  <div className="bp-flex bp-justify-between bp-items-center bp-mb-md">
                    <div className="bp-flex bp-gap-sm bp-items-center" style={{ flexWrap: "wrap" }}>
                      <span className={`bp-badge bp-badge-${event.game_mode}`}>
                        {event.game_mode} {event.game_mode === "team" ? `(${event.team_size}v${event.team_size})` : ""}
                      </span>
                      {event.access_type === "password" && (
                        <span className="bp-badge" style={{ borderColor: "var(--bp-accent)", color: "var(--bp-accent)", background: "rgba(255,193,7,0.1)", fontSize: "0.4rem" }}>
                          ■ PASSWORD ■
                        </span>
                      )}
                      {event.access_type === "invite_only" && (
                        <span className="bp-badge" style={{ borderColor: "var(--bp-cyan)", color: "var(--bp-cyan)", background: "rgba(0,255,255,0.1)", fontSize: "0.4rem" }}>
                          ■ INVITE ■
                        </span>
                      )}
                    </div>
                    <span className={`bp-badge bp-badge-${event.status}`}>{event.status}</span>
                  </div>
                  <h3 className="bp-card-title" style={{ fontSize: "1rem", minHeight: "2.4rem" }}>
                    {event.title}
                  </h3>
                  <div className="bp-card-meta">
                    <p>Ticket Price: <span className="bp-text-primary">{event.ticket_price} cUSD</span></p>
                    <p>Registered: <span className="bp-text-green">{event.participant_count} Players</span></p>
                  </div>
                  <div className="bp-flex bp-mt-lg">
                    <Link href={`/events/${event.id}`} className="bp-btn bp-btn-primary bp-w-full">
                      Enter Tournament Console
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          );
        })()}
      </section>
    </div>
  );
}
