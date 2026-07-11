-- cm_visitor_journey_touches: records second-week follow-up actions per visitor family.
--
-- This is distinct from cm_followup_log (keyed by session+record, first-week welcome)
-- and cm_child_shepherd_touches (per-child, 3 fixed touches). This table captures the
-- ministry follow-up that happens after a family's first visit, tracking whether they
-- were contacted and how, as part of the Visitor Journey workflow.

CREATE TABLE IF NOT EXISTS cm_visitor_journey_touches (
  id           uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  church_id    uuid        NOT NULL,
  family_id    uuid        NOT NULL REFERENCES cm_visitor_families(id) ON DELETE CASCADE,
  method       text        NOT NULL CHECK (method IN ('email','phone_call','handwritten_card','in_person','no_follow_up')),
  completed_at timestamptz NOT NULL DEFAULT now(),
  completed_by text        NOT NULL,
  created_at   timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_cm_vjt_church_family
  ON cm_visitor_journey_touches (church_id, family_id);

CREATE INDEX IF NOT EXISTS idx_cm_vjt_church_date
  ON cm_visitor_journey_touches (church_id, completed_at DESC);
