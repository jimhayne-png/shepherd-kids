-- cm_tablet_sessions: device-specific classroom tablet authorization.
-- Each browser that locks into a classroom gets one row here, identified by an
-- HttpOnly cookie containing a raw token (hash stored in DB, token never persisted).
-- cm_volunteer_sessions.tablet_session_id links each volunteer sign-in to a device,
-- so classroom-sessions, classroom-signout, and parent-request are device-scoped.

CREATE TABLE IF NOT EXISTS cm_tablet_sessions (
  id           uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  church_id    uuid        NOT NULL REFERENCES churches(id),
  room_id      uuid        NOT NULL REFERENCES cm_checkin_rooms(id),
  token_hash   text        NOT NULL UNIQUE,
  created_at   timestamptz NOT NULL DEFAULT now(),
  expires_at   timestamptz NOT NULL DEFAULT (now() + interval '3 hours'),
  revoked_at   timestamptz,
  last_seen_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_cm_tablet_sessions_token_hash ON cm_tablet_sessions (token_hash);
CREATE INDEX IF NOT EXISTS idx_cm_tablet_sessions_room       ON cm_tablet_sessions (room_id);

ALTER TABLE cm_volunteer_sessions
  ADD COLUMN IF NOT EXISTS tablet_session_id uuid REFERENCES cm_tablet_sessions(id);

CREATE INDEX IF NOT EXISTS idx_cm_volunteer_sessions_tablet
  ON cm_volunteer_sessions (tablet_session_id);
