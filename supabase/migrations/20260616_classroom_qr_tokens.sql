-- Add secure random token to cm_checkin_rooms for QR-safe public access.
-- QR codes must never expose database primary keys.
ALTER TABLE cm_checkin_rooms
  ADD COLUMN IF NOT EXISTS classroom_qr_token TEXT
  DEFAULT encode(gen_random_bytes(18), 'hex');

-- Backfill any existing rows that pre-date this migration
UPDATE cm_checkin_rooms
SET classroom_qr_token = encode(gen_random_bytes(18), 'hex')
WHERE classroom_qr_token IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_cm_checkin_rooms_qr_token
  ON cm_checkin_rooms (classroom_qr_token);

-- Audit fields: when the token was first issued and who last regenerated it
ALTER TABLE cm_checkin_rooms
  ADD COLUMN IF NOT EXISTS classroom_qr_created_at TIMESTAMPTZ DEFAULT NOW();

ALTER TABLE cm_checkin_rooms
  ADD COLUMN IF NOT EXISTS classroom_qr_regenerated_by UUID NULL;
