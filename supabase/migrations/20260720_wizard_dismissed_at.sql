-- Allow users to intentionally dismiss the Getting Started wizard without completing it.
-- NULL = never dismissed. Non-null = user clicked "Finish Later" at that timestamp.
-- The dashboard redirect only fires when both is_complete=false AND dismissed_at IS NULL.
ALTER TABLE church_setup_wizard
  ADD COLUMN IF NOT EXISTS dismissed_at timestamptz;
