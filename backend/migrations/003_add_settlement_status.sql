-- ============================================================
-- DDL Migration: Settlement failure status + bookkeeping columns
-- ============================================================
-- Execute this script in the Supabase SQL Editor.
-- Supports F2 (escrow-payout-integrity): an event only becomes
-- 'ended' after a successful on-chain receipt; failures are
-- surfaced as 'settlement_failed' and can be retried.
--
-- Idempotent: safe to run more than once.
-- ============================================================

-- Widen the status CHECK constraint to include 'settlement_failed'.
ALTER TABLE events DROP CONSTRAINT IF EXISTS events_status_check;
ALTER TABLE events ADD CONSTRAINT events_status_check
  CHECK (status IN ('setup', 'active', 'voting', 'ended', 'disputed', 'settlement_failed'));

-- Bookkeeping for a failed settlement so it can be inspected and retried.
ALTER TABLE events ADD COLUMN IF NOT EXISTS settlement_error TEXT;
ALTER TABLE events ADD COLUMN IF NOT EXISTS settlement_tx_hash TEXT;
