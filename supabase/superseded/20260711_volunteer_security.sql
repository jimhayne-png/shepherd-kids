-- !! SUPERSEDED — DO NOT APPLY !!
-- This file has been superseded by 20260711_volunteer_foundation_consolidated.sql.
-- It remains here for history only. The consolidated migration incorporates all
-- corrections this file was intended to make.

-- Corrective migration: run only on databases that already applied 20260711_volunteer_vetted.sql
-- with the plaintext `pin` column. Renames to `pin_hash` and wipes stored values
-- (admins must re-enter PINs; plaintext PINs must not be retained).

-- Rename pin → pin_hash if the old column still exists
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'cm_volunteers' AND column_name = 'pin'
  ) THEN
    -- Wipe any stored plaintext PINs before rename
    UPDATE cm_volunteers SET pin = NULL;
    ALTER TABLE cm_volunteers RENAME COLUMN pin TO pin_hash;
  END IF;
END $$;

-- Ensure pin_hash exists even on clean installs that ran the corrected migration
ALTER TABLE cm_volunteers
  ADD COLUMN IF NOT EXISTS pin_hash text NULL;

-- Extend cm_parent_requests with volunteer attribution
ALTER TABLE cm_parent_requests
  ADD COLUMN IF NOT EXISTS volunteer_id         uuid NULL,
  ADD COLUMN IF NOT EXISTS volunteer_session_id uuid NULL,
  ADD COLUMN IF NOT EXISTS room_id              uuid NULL;

-- Widen source constraint to include volunteer-initiated scans
ALTER TABLE cm_parent_requests
  DROP CONSTRAINT IF EXISTS cm_parent_requests_source_check;

ALTER TABLE cm_parent_requests
  ADD CONSTRAINT cm_parent_requests_source_check
  CHECK (source IN ('scan', 'classroom', 'volunteer_scan'));

-- Index for audit queries
CREATE INDEX IF NOT EXISTS idx_cm_pr_volunteer ON cm_parent_requests(volunteer_id);
CREATE INDEX IF NOT EXISTS idx_cm_pr_room      ON cm_parent_requests(room_id);

-- Rename session_token → session_token_hash in cm_volunteer_sessions.
-- Existing sessions stored raw tokens; they are unusable after this rename because
-- the application now hashes the cookie before lookup. Invalidate all existing sessions
-- so volunteers must sign in again to receive a properly hashed session.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'cm_volunteer_sessions' AND column_name = 'session_token'
  ) THEN
    UPDATE cm_volunteer_sessions SET invalidated_at = now() WHERE invalidated_at IS NULL;
    ALTER TABLE cm_volunteer_sessions RENAME COLUMN session_token TO session_token_hash;
    ALTER TABLE cm_volunteer_sessions ALTER COLUMN session_token_hash DROP DEFAULT;
  END IF;
END $$;
