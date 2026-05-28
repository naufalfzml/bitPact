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
  status: "setup" | "active" | "voting" | "ended" | "disputed" | "settlement_failed";
  access_type?: "public" | "password" | "invite_only";
  roster_locked?: boolean;
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
        if (!res.ok) throw new Error("Failed to load tournaments");
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

  const filteredEvents = events.filter((event) => {
    const query = searchText.toLowerCase();
    const matchesSearch =
      event.title.toLowerCase().includes(query) ||
      event.game_mode.toLowerCase().includes(query);

    if (selectedStage === "all") return matchesSearch;
    if (selectedStage === "setup") return matchesSearch && event.status === "setup";
    if (selectedStage === "active") return matchesSearch && event.status === "active";
    if (selectedStage === "ended") {
      // Include settlement_failed here: the tournament is effectively over but
      // funds need recovery, so it should NOT disappear from the default scan.
      return (
        matchesSearch &&
        (event.status === "ended" ||
          event.status === "voting" ||
          event.status === "disputed" ||
          event.status === "settlement_failed")
      );
    }

    return matchesSearch;
  });

  return (
    <div className="bp-stack-xl">
      <section className="bp-hero">
        <p className="bp-text-info bp-text-xs bp-font-display">■ ARCADE ESCROW LOBBY ■</p>
        <h1 className="bp-hero-title bp-pulse">bitPact</h1>
        <p className="bp-hero-subtitle">
          Pixel-accurate tournament escrow on Celo with a cleaner signal path for players, creators, live voting, and payout resolution.
        </p>
        <div className="bp-metric-grid bp-mb-lg">
          <div className="bp-metric-item">
            <span className="bp-text-xs bp-text-muted bp-font-display">ESCROW ROLE</span>
            <strong>USDC locked before play starts</strong>
          </div>
          <div className="bp-metric-item">
            <span className="bp-text-xs bp-text-muted bp-font-display">BRACKET ROLE</span>
            <strong>Draft, launch, and track match flow</strong>
          </div>
          <div className="bp-metric-item">
            <span className="bp-text-xs bp-text-muted bp-font-display">CONSENSUS ROLE</span>
            <strong>Vote, settle, and protect payouts</strong>
          </div>
        </div>
        <div className="bp-flex bp-gap-md bp-items-center" style={{ justifyContent: "center", flexWrap: "wrap" }}>
          <Link href="/events/create" className="bp-btn bp-btn-primary bp-btn-create bp-btn-lg">
            ■ Create Event
          </Link>
          <a href="#explore" className="bp-btn bp-btn-accent bp-btn-lg">
            ■ Explore Events
          </a>
        </div>
      </section>

      <section className="bp-section">
        <h2 className="bp-section-title">■ Features ■</h2>
        <div className="bp-grid bp-grid-3">
          <div className="bp-card bp-home-feature-card">
            <h3 className="bp-card-title">Blind Escrow</h3>
            <p className="bp-card-copy">
              Players stake USDC entry fees into a secure smart contract. Zero developer custody. Zero trust required.
            </p>
          </div>
          <div className="bp-card bp-home-feature-card bp-panel-info">
            <h3 className="bp-card-title" data-tone="info">Dynamic Brackets</h3>
            <p className="bp-card-copy">
              Automated single-elimination bracket generation for 1v1 and Team modes, complete with linear visual connections.
            </p>
          </div>
          <div className="bp-card bp-home-feature-card bp-panel-warning">
            <h3 className="bp-card-title" data-tone="warning">Minority Penalty</h3>
            <p className="bp-card-copy">
              Consensus-based payout resolution. Trolls voting against the clear majority are penalized in reputation.
            </p>
          </div>
        </div>
      </section>

      <section id="explore" className="bp-section" style={{ scrollMarginTop: "100px" }}>
        <h2 className="bp-section-title">■ Active Tournaments ■</h2>

        <div className="bp-card bp-panel-info bp-home-filter bp-mb-lg">
          <div className="bp-split-note">
            <p className="bp-text-info bp-text-xs bp-font-display">■ SELECT STAGE & SEARCH CHANNEL ■</p>
            <p>
              Brand yellow now stays focused on titles and primary outcomes. Use the filters below to scan event state, access requirements, and ticket details without every block competing equally.
            </p>
          </div>
          <div className="bp-flex bp-gap-md bp-items-center" style={{ flexWrap: "wrap" }}>
            <input
              type="text"
              className="bp-input"
              placeholder="Search by title or mode..."
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              style={{ flex: 1, minWidth: "200px" }}
            />
            <div className="bp-home-stage-list">
              {(["all", "setup", "active", "ended"] as const).map((stage) => (
                <button
                  key={stage}
                  className={`bp-btn ${selectedStage === stage ? "bp-btn-accent" : "bp-btn-ghost"}`}
                  onClick={() => setSelectedStage(stage)}
                >
                  ■ {stage}
                </button>
              ))}
            </div>
          </div>
        </div>

        {loading && (
          <div className="bp-card bp-text-center bp-panel-info bp-blink">
            LOADING_DATA_PACKETS...
          </div>
        )}

        {error && (
          <div className="bp-card bp-panel-destructive bp-text-center bp-text-red">
            ERROR: {error}
          </div>
        )}

        {!loading && !error && filteredEvents.length === 0 && (
          <div className="bp-card bp-text-center">
            <p className="bp-card-copy">NO TOURNAMENTS MATCHING THIS STAGE</p>
            <Link href="/events/create" className="bp-btn bp-btn-primary bp-btn-create bp-mt-md">
              Start A New Event
            </Link>
          </div>
        )}

        {!loading && !error && filteredEvents.length > 0 && (
          <div className="bp-grid bp-grid-2">
            {filteredEvents.map((event) => (
              <div key={event.id} className="bp-card bp-card-interactive bp-home-event-card">
                <div className="bp-flex bp-justify-between bp-items-center bp-gap-sm" style={{ flexWrap: "wrap" }}>
                  <div className="bp-flex bp-gap-sm bp-items-center" style={{ flexWrap: "wrap" }}>
                    {/* game_mode is only meaningful after the creator picks it
                        via /select-game-mode (post roster_locked). Until then,
                        show a neutral SETUP badge to avoid pretense. */}
                    {event.status === "setup" && !event.roster_locked ? (
                      <span className="bp-badge bp-badge-setup">SETUP</span>
                    ) : (
                      <span className={`bp-badge bp-badge-${event.game_mode}`}>
                        {event.game_mode} {event.game_mode === "team" ? `(${event.team_size}v${event.team_size})` : ""}
                      </span>
                    )}
                    {event.access_type === "password" && (
                      <span
                        className="bp-badge"
                        style={{ borderColor: "var(--bp-warning)", color: "var(--bp-warning)", background: "rgba(255, 158, 79, 0.08)" }}
                      >
                        ■ PASSWORD ■
                      </span>
                    )}
                    {event.access_type === "invite_only" && (
                      <span
                        className="bp-badge"
                        style={{ borderColor: "var(--bp-info)", color: "var(--bp-info)", background: "rgba(76, 231, 255, 0.08)" }}
                      >
                        ■ INVITE ■
                      </span>
                    )}
                    {event.status === "settlement_failed" && (
                      <span className="bp-badge bp-badge-settlement_failed">RECOVERY</span>
                    )}
                  </div>
                  <span className={`bp-badge bp-badge-${event.status}`}>{event.status}</span>
                </div>
                <div className="bp-stack-sm">
                  <h3 className="bp-card-title" style={{ fontSize: "0.9rem" }}>
                    {event.title}
                  </h3>
                  <p className="bp-card-copy">
                    Created {new Date(event.created_at).toLocaleDateString()}
                    {event.status !== "setup" || event.roster_locked
                      ? ` for ${event.game_mode.toUpperCase()} competition`
                      : ""}
                    {" "}with a clean payout route.
                  </p>
                </div>
                <div className="bp-home-event-meta">
                  <p>
                    Ticket Price: <span className="bp-text-primary">{event.ticket_price} USDC</span>
                  </p>
                  <p>
                    Registered: <span className="bp-text-green">{event.participant_count} players</span>
                  </p>
                  <p>
                    Access: <span className="bp-text-info">{event.access_type ?? "public"}</span>
                  </p>
                </div>
                <div className="bp-home-card-footer">
                  <Link href={`/events/${event.id}`} className="bp-btn bp-btn-primary bp-w-full">
                    Enter Tournament Console
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
