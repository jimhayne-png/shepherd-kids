-- Automatic check-in window settings per church.
-- check_in_opens_minutes_before: kiosk shows sessions this many minutes before scheduled_time
-- check_in_closes_minutes_after: kiosk hides sessions this many minutes after scheduled_time
ALTER TABLE churches
  ADD COLUMN IF NOT EXISTS check_in_opens_minutes_before integer NOT NULL DEFAULT 30;

ALTER TABLE churches
  ADD COLUMN IF NOT EXISTS check_in_closes_minutes_after integer NOT NULL DEFAULT 30;
