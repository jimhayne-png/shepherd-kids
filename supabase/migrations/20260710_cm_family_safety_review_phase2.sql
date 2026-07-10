-- Annual Family Safety Review Phase 2: Secure parent review workflow.
--
-- 1. Adds missing contact fields to cm_visitor_families:
--    city, state, zip, emergency_contact_name, emergency_contact_phone
--
-- 2. Adds secure token infrastructure to cm_family_safety_reviews:
--    token_hash, token_expires_at, requested_at, opened_at
--
--    Token design:
--      • Staff generates a 32-byte cryptographically random token (in application code).
--      • Only the SHA-256 hex digest (token_hash) is stored here. Raw token is never persisted.
--      • Token is single-use: token_hash is set to NULL after a review is completed.
--      • Token expires after 30 days (enforced by application logic comparing token_expires_at).
--      • One pending draft per family at a time: generating a new link expires previous drafts.
--
--    Review lifecycle:
--      draft      → parent has not yet submitted (token valid)
--      completed  → parent submitted successfully (token_hash cleared, history preserved)
--
--    This token infrastructure is intentionally designed to support the upcoming Annual
--    Family Safety Review workflow, where parents submit updates via a secure one-time link.

-- Step 1: Extend cm_visitor_families with address breakdown and emergency contact
ALTER TABLE cm_visitor_families
  ADD COLUMN IF NOT EXISTS city                    text,
  ADD COLUMN IF NOT EXISTS state                   text,
  ADD COLUMN IF NOT EXISTS zip                     text,
  ADD COLUMN IF NOT EXISTS emergency_contact_name  text,
  ADD COLUMN IF NOT EXISTS emergency_contact_phone text;

-- Step 2: Add token fields to cm_family_safety_reviews
ALTER TABLE cm_family_safety_reviews
  ADD COLUMN IF NOT EXISTS token_hash       text,
  ADD COLUMN IF NOT EXISTS token_expires_at timestamptz,
  ADD COLUMN IF NOT EXISTS requested_at     timestamptz,
  ADD COLUMN IF NOT EXISTS opened_at        timestamptz;

-- Unique partial index on token_hash (NULL values excluded, so completed rows don't conflict)
CREATE UNIQUE INDEX IF NOT EXISTS idx_cm_fsr_token_hash
  ON cm_family_safety_reviews (token_hash)
  WHERE token_hash IS NOT NULL;

-- Index for finding pending draft requests per family
CREATE INDEX IF NOT EXISTS idx_cm_fsr_family_draft
  ON cm_family_safety_reviews (family_id, status)
  WHERE status = 'draft';
