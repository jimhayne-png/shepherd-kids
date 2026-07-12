-- !! SUPERSEDED — DO NOT APPLY !!
-- This file has been superseded by 20260711_volunteer_foundation_consolidated.sql.
-- It remains here for history only. Applying it independently against production
-- will fail because it assumes cm_volunteers already exists (from a prior migration
-- that was never applied), causing a silent rollback.

-- Phase 2: Vetted volunteer columns on cm_volunteers

ALTER TABLE cm_volunteers
  ADD COLUMN IF NOT EXISTS approved       boolean     NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS approved_at    timestamptz NULL,
  ADD COLUMN IF NOT EXISTS approved_by    text        NULL,
  ADD COLUMN IF NOT EXISTS pin_hash       text        NULL,
  ADD COLUMN IF NOT EXISTS updated_at     timestamptz NOT NULL DEFAULT now();

-- Rename 'failed' → 'denied' and widen the check constraint

ALTER TABLE cm_volunteers
  DROP CONSTRAINT IF EXISTS cm_volunteers_background_check_status_check;

UPDATE cm_volunteers
  SET background_check_status = 'denied'
  WHERE background_check_status = 'failed';

ALTER TABLE cm_volunteers
  ADD CONSTRAINT cm_volunteers_background_check_status_check
  CHECK (background_check_status IN ('pending','cleared','expired','denied','not_recorded'));

-- Phase 3: Classroom-level volunteer assignments

CREATE TABLE IF NOT EXISTS cm_volunteer_classroom_assignments (
  id           uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  church_id    uuid        NOT NULL,
  volunteer_id uuid        NOT NULL REFERENCES cm_volunteers(id) ON DELETE CASCADE,
  room_id      uuid        NOT NULL REFERENCES cm_checkin_rooms(id) ON DELETE CASCADE,
  active       boolean     NOT NULL DEFAULT true,
  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now(),
  UNIQUE(volunteer_id, room_id)
);

CREATE INDEX IF NOT EXISTS idx_cm_vca_church    ON cm_volunteer_classroom_assignments(church_id);
CREATE INDEX IF NOT EXISTS idx_cm_vca_volunteer ON cm_volunteer_classroom_assignments(volunteer_id);
CREATE INDEX IF NOT EXISTS idx_cm_vca_room      ON cm_volunteer_classroom_assignments(room_id);

ALTER TABLE cm_volunteer_classroom_assignments ENABLE ROW LEVEL SECURITY;

-- Phase 6: Volunteer access sessions (created on phone+PIN verification)

CREATE TABLE IF NOT EXISTS cm_volunteer_sessions (
  id                  uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  church_id           uuid        NOT NULL,
  volunteer_id        uuid        NOT NULL REFERENCES cm_volunteers(id) ON DELETE CASCADE,
  room_id             uuid        NOT NULL REFERENCES cm_checkin_rooms(id) ON DELETE CASCADE,
  -- SHA-256 hash of the raw token; raw token exists only in the HttpOnly vk_session cookie.
  session_token_hash  text        NOT NULL UNIQUE,
  signed_in_at        timestamptz NOT NULL DEFAULT now(),
  expires_at          timestamptz NOT NULL DEFAULT (now() + interval '4 hours'),
  invalidated_at      timestamptz NULL
);

CREATE INDEX IF NOT EXISTS idx_cm_vs_token     ON cm_volunteer_sessions(session_token_hash);
CREATE INDEX IF NOT EXISTS idx_cm_vs_church    ON cm_volunteer_sessions(church_id, signed_in_at DESC);
CREATE INDEX IF NOT EXISTS idx_cm_vs_volunteer ON cm_volunteer_sessions(volunteer_id);

ALTER TABLE cm_volunteer_sessions ENABLE ROW LEVEL SECURITY;

-- Phase 13: Extend scan audit log with volunteer attribution

ALTER TABLE cm_label_scan_log
  ADD COLUMN IF NOT EXISTS volunteer_session_id uuid NULL,
  ADD COLUMN IF NOT EXISTS volunteer_id         uuid NULL;

-- Extend result values to include 'unauthorized' (invalid/expired volunteer session)

ALTER TABLE cm_label_scan_log
  DROP CONSTRAINT IF EXISTS cm_label_scan_log_result_check;

ALTER TABLE cm_label_scan_log
  ADD CONSTRAINT cm_label_scan_log_result_check
  CHECK (result IN ('valid','expired','not_found','unauthorized'));
