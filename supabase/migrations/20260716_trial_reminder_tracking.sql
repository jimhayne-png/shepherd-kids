-- Persistent tracking of trial reminder emails so each fires at most once per church.
-- Columns remain NULL until a confirmed delivery; failed sends leave them NULL for retry.
ALTER TABLE churches
  ADD COLUMN IF NOT EXISTS trial_day10_email_sent_at timestamptz,
  ADD COLUMN IF NOT EXISTS trial_day14_email_sent_at timestamptz;
