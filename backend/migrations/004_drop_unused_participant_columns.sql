-- ============================================================
-- DDL Migration: Drop unused participant columns
-- ============================================================
-- Execute this script in the Supabase SQL Editor.
-- Supports N17 (backend-correctness-cleanup): the `username` and
-- `reputation_score` columns added in `001_add_username_reputation.sql`
-- were never read or written by any application code (verified by grep).
-- They are removed to keep the schema honest.
--
-- Reputation is now tracked exclusively via the `reputation_tracking`
-- table (see `getRegeneratedReputation` in backend/lib/reputationHelper.js).
-- Custom gamer-tag username is handled client-side by `generateGamerTag`
-- (frontend/src/app/components/ConnectButtonClient.tsx).
--
-- Idempotent: safe to run more than once.
-- ============================================================

ALTER TABLE participants DROP COLUMN IF EXISTS username;
ALTER TABLE participants DROP COLUMN IF EXISTS reputation_score;
