-- Label mode and QR feature toggles per church
-- label_mode: 'smart' (badge + QR) or 'classic' (print details inline, optional QR)
-- smart_label_qr_enabled: whether to print a QR code on child check-in labels
-- volunteer_checkin_qr_enabled: whether classroom/volunteer QR workflow is active

ALTER TABLE churches
  ADD COLUMN IF NOT EXISTS label_mode TEXT NOT NULL DEFAULT 'smart';

ALTER TABLE churches
  ADD COLUMN IF NOT EXISTS smart_label_qr_enabled BOOLEAN NOT NULL DEFAULT TRUE;

ALTER TABLE churches
  ADD COLUMN IF NOT EXISTS volunteer_checkin_qr_enabled BOOLEAN NOT NULL DEFAULT TRUE;

-- Snapshot QR settings on print jobs so labels render correctly
-- even if church settings change after check-in.
ALTER TABLE cm_label_print_jobs
  ADD COLUMN IF NOT EXISTS label_mode TEXT NULL,
  ADD COLUMN IF NOT EXISTS smart_label_qr_enabled BOOLEAN NULL;
