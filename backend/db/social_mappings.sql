-- ============================================
-- Social Connect (ODIS) Mock Mapping Table
-- ============================================
-- Simulates the Celo Social Connect protocol
-- by storing mappings from social identifiers
-- (email / phone number) to wallet addresses.
-- ============================================

CREATE TABLE IF NOT EXISTS social_mappings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    identifier TEXT UNIQUE NOT NULL,
    wallet_address TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Index for fast lookups by identifier
CREATE INDEX IF NOT EXISTS idx_social_mappings_identifier ON social_mappings(identifier);

-- Example seed data for local testing (optional):
-- INSERT INTO social_mappings (identifier, wallet_address) VALUES
--   ('+6281234567890', '0x1234567890abcdef1234567890abcdef12345678'),
--   ('player@example.com', '0xabcdef1234567890abcdef1234567890abcdef12');
