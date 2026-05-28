-- Add session_group to cm_checkin_sessions for concurrent multi-session check-in.
-- Sessions sharing the same session_group on the same date + church_id are treated as concurrent.
ALTER TABLE cm_checkin_sessions ADD COLUMN IF NOT EXISTS session_group text;
