-- Smart Labels: QR code scan infrastructure

-- Sessions: timestamp when closed (needed for expiry calculation)
-- and configurable label expiry window
ALTER TABLE cm_checkin_sessions
  ADD COLUMN IF NOT EXISTS closed_at TIMESTAMPTZ NULL,
  ADD COLUMN IF NOT EXISTS label_expiry_minutes INTEGER NOT NULL DEFAULT 15;

-- Checkin records: unique scan token per check-in, and medical notes
ALTER TABLE cm_checkin_records
  ADD COLUMN IF NOT EXISTS qr_token TEXT NULL,
  ADD COLUMN IF NOT EXISTS medical_notes TEXT NULL;

-- Fast token lookups
CREATE UNIQUE INDEX IF NOT EXISTS idx_cm_checkin_records_qr_token
  ON cm_checkin_records (qr_token) WHERE qr_token IS NOT NULL;

-- Print jobs: carry the token so it can be rendered on reprinted labels
ALTER TABLE cm_label_print_jobs
  ADD COLUMN IF NOT EXISTS qr_token TEXT NULL;

-- Audit log: every scan attempt, success or otherwise
CREATE TABLE IF NOT EXISTS cm_label_scan_log (
  id                 UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  church_id          TEXT        NOT NULL,
  qr_token           TEXT        NOT NULL,
  checkin_record_id  UUID        NULL,
  session_id         TEXT        NULL,
  scanned_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  scanned_by         UUID        NULL,
  result             TEXT        NOT NULL CHECK (result IN ('valid', 'expired', 'not_found'))
);

CREATE INDEX IF NOT EXISTS idx_cm_label_scan_log_token
  ON cm_label_scan_log (qr_token);

CREATE INDEX IF NOT EXISTS idx_cm_label_scan_log_church
  ON cm_label_scan_log (church_id, scanned_at DESC);
