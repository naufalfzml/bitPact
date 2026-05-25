-- ============================================================
-- bitPact — Private Events Migration
-- ============================================================
-- Adds access control columns to `events` table and creates
-- a new `event_whitelist` table for invite-only tournaments.
-- Execute this script in the Supabase SQL Editor.
-- ============================================================

-- 1. Add access_type column to events (default 'public' for backward compatibility)
ALTER TABLE events
  ADD COLUMN IF NOT EXISTS access_type TEXT DEFAULT 'public'
    CHECK (access_type IN ('public', 'password', 'invite_only'));

-- 2. Add password_hash column to events (nullable, only used when access_type = 'password')
ALTER TABLE events
  ADD COLUMN IF NOT EXISTS password_hash TEXT;

-- 3. Create event_whitelist table for invite-only tournaments
CREATE TABLE IF NOT EXISTS event_whitelist (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id        UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    wallet_address  TEXT NOT NULL,
    created_at      TIMESTAMP DEFAULT NOW()
);

-- 4. Unique index to prevent duplicate whitelist entries
CREATE UNIQUE INDEX IF NOT EXISTS idx_event_whitelist_unique
    ON event_whitelist (event_id, wallet_address);

-- 5. Index for fast lookups by event_id
CREATE INDEX IF NOT EXISTS idx_event_whitelist_event
    ON event_whitelist (event_id);
