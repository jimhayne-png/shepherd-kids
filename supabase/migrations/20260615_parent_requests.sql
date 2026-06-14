-- Logs every Request Parent text sent through the platform
CREATE TABLE IF NOT EXISTS cm_parent_requests (
  id                 UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  church_id          TEXT        NOT NULL,
  checkin_record_id  UUID        NOT NULL,
  session_id         TEXT        NOT NULL,
  parent_phone       TEXT        NOT NULL,
  child_name         TEXT        NOT NULL,
  sent_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  sent_by            UUID        NULL,
  source             TEXT        NOT NULL DEFAULT 'scan'
                                 CHECK (source IN ('scan', 'classroom')),
  delivery_status    TEXT        NOT NULL DEFAULT 'sent'
);

CREATE INDEX IF NOT EXISTS idx_cm_parent_requests_record
  ON cm_parent_requests (checkin_record_id, sent_at DESC);

CREATE INDEX IF NOT EXISTS idx_cm_parent_requests_church
  ON cm_parent_requests (church_id, sent_at DESC);
