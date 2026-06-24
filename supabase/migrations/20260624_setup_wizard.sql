-- First-time setup wizard progress for each church.
-- One row per church; created lazily when the wizard is first accessed.

CREATE TABLE IF NOT EXISTS church_setup_wizard (
  church_id        uuid        PRIMARY KEY REFERENCES churches(id) ON DELETE CASCADE,
  current_step     integer     NOT NULL DEFAULT 1,
  completed_steps  integer[]   NOT NULL DEFAULT '{}',
  is_complete      boolean     NOT NULL DEFAULT false,
  created_at       timestamptz NOT NULL DEFAULT now(),
  updated_at       timestamptz NOT NULL DEFAULT now()
);
