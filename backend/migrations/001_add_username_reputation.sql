-- Migration: Add username and reputation_score columns to participants table
-- Run this migration on your Supabase SQL Editor

-- Add optional username column for custom gamer tags
ALTER TABLE participants
ADD COLUMN IF NOT EXISTS username TEXT DEFAULT NULL;

-- Add reputation_score column (default 100 for new players)
ALTER TABLE participants
ADD COLUMN IF NOT EXISTS reputation_score INTEGER DEFAULT 100;

-- Create reputation_tracking table if it doesn't exist yet
CREATE TABLE IF NOT EXISTS reputation_tracking (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  wallet_address TEXT NOT NULL,
  event_id UUID REFERENCES events(id) ON DELETE CASCADE,
  was_minority BOOLEAN DEFAULT FALSE,
  reputation_score INTEGER NOT NULL DEFAULT 100,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create index on reputation_tracking for efficient lookups
CREATE INDEX IF NOT EXISTS idx_reputation_wallet ON reputation_tracking(wallet_address);
CREATE INDEX IF NOT EXISTS idx_reputation_created ON reputation_tracking(created_at DESC);
