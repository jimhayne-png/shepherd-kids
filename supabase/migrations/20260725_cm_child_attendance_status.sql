-- Child-level attendance status: distinguishes children who are expected to
-- attend regularly from visitors/temporary attenders and children no longer
-- attending, so Attendance Consistency doesn't generate false missed-service
-- alerts for them. Follows the same text+CHECK pattern already used for
-- photo_permission_status on this table.
ALTER TABLE cm_visitor_children
  ADD COLUMN IF NOT EXISTS attendance_status text NOT NULL DEFAULT 'regular'
    CHECK (attendance_status IN ('regular', 'visitor', 'inactive'));
