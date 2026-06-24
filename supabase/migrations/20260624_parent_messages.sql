-- Free-form parent messages: drafts and sent records per church.

CREATE TABLE IF NOT EXISTS church_parent_messages (
  id         uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  church_id  uuid        NOT NULL REFERENCES churches(id) ON DELETE CASCADE,
  title      text        NOT NULL DEFAULT '',
  body       text        NOT NULL DEFAULT '',
  audience   text        NOT NULL DEFAULT 'all_parents'
                         CHECK (audience IN ('all_parents', 'checked_in_today', 'first_time', 'selected_room')),
  room_id    uuid        REFERENCES cm_checkin_rooms(id) ON DELETE SET NULL,
  status     text        NOT NULL DEFAULT 'draft'
                         CHECK (status IN ('draft', 'sent')),
  sent_at    timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_cpm_church ON church_parent_messages(church_id);
CREATE INDEX IF NOT EXISTS idx_cpm_status ON church_parent_messages(church_id, status);
