-- Adds typical class duration so the kiosk can compute a correct close window.
-- closeAt = scheduled_time + typical_class_duration_minutes + check_in_closes_minutes_after

ALTER TABLE churches
  ADD COLUMN IF NOT EXISTS typical_class_duration_minutes INTEGER NOT NULL DEFAULT 60;
