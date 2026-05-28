-- ============================================================
-- bitPact — Supabase PostgreSQL Schema Migration
-- ============================================================
-- Execute this script in the Supabase SQL Editor to initialise
-- all tables, constraints, and indices required by bitPact.
-- ============================================================

-- 1. Events
CREATE TABLE IF NOT EXISTS events (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    creator_address     TEXT NOT NULL,
    title               TEXT NOT NULL,
    game_mode           TEXT NOT NULL CHECK (game_mode IN ('1v1', 'team', 'ffa')),
    team_size           INT DEFAULT 1,
    ticket_price        NUMERIC NOT NULL CHECK (ticket_price >= 0),
    consensus_threshold NUMERIC DEFAULT 51 CHECK (consensus_threshold > 0 AND consensus_threshold <= 100),
    status              TEXT DEFAULT 'setup' CHECK (status IN ('setup', 'active', 'voting', 'ended', 'disputed')),
    winners_submitted_at TIMESTAMP,
    created_at          TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_events_status ON events (status);
CREATE INDEX IF NOT EXISTS idx_events_creator ON events (creator_address);

-- 2. Participants
CREATE TABLE IF NOT EXISTS participants (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id            UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    wallet_address      TEXT NOT NULL,
    team_id             INT,
    status              TEXT DEFAULT 'registered' CHECK (status IN ('registered', 'eliminated', 'winner'))
);

CREATE INDEX IF NOT EXISTS idx_participants_event ON participants (event_id);
CREATE INDEX IF NOT EXISTS idx_participants_wallet ON participants (wallet_address);
CREATE UNIQUE INDEX IF NOT EXISTS idx_participants_unique_event_wallet
    ON participants (event_id, wallet_address);

-- 3. Votes
CREATE TABLE IF NOT EXISTS votes (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id            UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    voter_address       TEXT NOT NULL,
    is_valid            BOOLEAN NOT NULL,
    created_at          TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_votes_event ON votes (event_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_votes_unique_event_voter
    ON votes (event_id, voter_address);

-- 4. Brackets
CREATE TABLE IF NOT EXISTS brackets (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id            UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    round               INT NOT NULL,
    match_index         INT NOT NULL,
    player_a            TEXT,
    player_b            TEXT,
    winner              TEXT,
    created_at          TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_brackets_event ON brackets (event_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_brackets_unique_match
    ON brackets (event_id, round, match_index);

-- 5. Reputation Tracking (Anti-Troll / Minority Penalty)
CREATE TABLE IF NOT EXISTS reputation_tracking (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    wallet_address      TEXT NOT NULL,
    event_id            UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    was_minority        BOOLEAN NOT NULL,
    reputation_score    NUMERIC DEFAULT 100,
    created_at          TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_reputation_wallet ON reputation_tracking (wallet_address);
CREATE INDEX IF NOT EXISTS idx_reputation_event ON reputation_tracking (event_id);
