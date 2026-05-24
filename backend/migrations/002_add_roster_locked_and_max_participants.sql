-- ============================================================
-- DDL Migration: Add roster_locked and max_participants Columns
-- ============================================================
-- Execute this script in the Supabase SQL Editor to support
-- the dynamic draft brackets and deferred game mode lifecycle.
-- ============================================================

ALTER TABLE events
ADD COLUMN IF NOT EXISTS roster_locked BOOLEAN DEFAULT false;

ALTER TABLE events
ADD COLUMN IF NOT EXISTS max_participants INT DEFAULT 16;
