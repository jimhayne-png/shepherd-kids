-- Annual Family Safety Review history
-- Tracks when each family has reviewed and confirmed their safety information.
-- One row per review attempt. Completed reviews are never overwritten — preserved as audit history.

CREATE TABLE IF NOT EXISTS cm_family_safety_reviews (
  id                    UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  church_id             UUID        NOT NULL,
  family_id             UUID        NOT NULL REFERENCES cm_visitor_families(id) ON DELETE CASCADE,
  status                TEXT        NOT NULL DEFAULT 'draft'
                                    CHECK (status IN ('draft', 'completed')),
  completed_at          TIMESTAMPTZ,
  completed_by_name     TEXT,
  completed_by_email    TEXT,
  confirmation_accepted BOOLEAN     NOT NULL DEFAULT false,
  had_changes           BOOLEAN,
  change_summary        JSONB,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes: lookup by church, family, and completion date
CREATE INDEX IF NOT EXISTS idx_cm_fsr_church    ON cm_family_safety_reviews(church_id);
CREATE INDEX IF NOT EXISTS idx_cm_fsr_family    ON cm_family_safety_reviews(family_id);
CREATE INDEX IF NOT EXISTS idx_cm_fsr_completed ON cm_family_safety_reviews(completed_at DESC)
  WHERE status = 'completed';
CREATE INDEX IF NOT EXISTS idx_cm_fsr_church_status ON cm_family_safety_reviews(church_id, status);

-- RLS (service role bypasses; policies govern direct client access)
ALTER TABLE cm_family_safety_reviews ENABLE ROW LEVEL SECURITY;

CREATE POLICY "church staff family safety reviews" ON cm_family_safety_reviews FOR ALL
  USING (church_id IN (SELECT church_id FROM church_users WHERE user_id = auth.uid()));
