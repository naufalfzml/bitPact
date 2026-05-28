-- ============================================================
-- DDL Migration: Drop photo-audit feature
-- ============================================================
-- Execute this script in the Supabase SQL Editor.
-- The photo-proof / audit feature was removed: the create form no longer
-- offers it, there is no upload endpoint, and /end no longer gates on it.
-- This drops the now-unused columns.
--
-- Idempotent: safe to run more than once.
-- ============================================================

ALTER TABLE events DROP COLUMN IF EXISTS photo_required;
ALTER TABLE participants DROP COLUMN IF EXISTS uploaded_photo_url;

-- Optional: if a Supabase Storage bucket named "photos" was created for this
-- feature and is no longer used, delete it from the Storage dashboard. There
-- is no SQL statement for that here.
