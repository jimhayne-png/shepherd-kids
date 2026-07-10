-- Canonical child record: add authorized_pickups and photo_permission_status to cm_visitor_children.
-- These fields were previously only tracked in the legacy children_ministry_children table.
-- cm_visitor_children is the canonical ShepherdKids child record; children_ministry_children
-- is preserved but is legacy-only.
--
-- photo_permission_status is intentionally designed to support the upcoming Annual Family Safety
-- Review workflow, where parents explicitly grant or deny photo permission during their annual
-- review. A boolean cannot distinguish "never asked" from "explicitly denied."

-- Step 1: Add columns
ALTER TABLE cm_visitor_children
  ADD COLUMN IF NOT EXISTS authorized_pickups      text,
  ADD COLUMN IF NOT EXISTS photo_permission_status text NOT NULL DEFAULT 'not_reviewed'
    CHECK (photo_permission_status IN ('not_reviewed', 'granted', 'denied'));

-- Step 2: Backfill from children_ministry_children where the match is reliable.
--
-- Match criteria:
--   • same church_id
--   • case-insensitive, trimmed first_name + last_name
--   • exactly one legacy row matches (no ambiguity)
--   • exactly one canonical row matches (no ambiguity)
--
-- Do NOT update if:
--   • more than one legacy row has the same name in the same church
--   • more than one canonical row has the same name in the same church
--   • church_ids differ
--
-- authorized_pickups: legacy is text[]; canonical is text.
--   Convert via array_to_string(, ', '). Empty arrays → NULL (no data to backfill).
--
-- photo_permission_status: map from legacy boolean:
--   TRUE  → 'granted'
--   FALSE → 'denied'
--   (no NULL case — legacy column was NOT NULL DEFAULT false)
--   Canonical default 'not_reviewed' is only used for rows with no legacy match.

WITH legacy_counts AS (
  SELECT
    church_id,
    lower(trim(first_name)) AS fn,
    lower(trim(last_name))  AS ln,
    count(*)                AS cnt
  FROM children_ministry_children
  GROUP BY church_id, lower(trim(first_name)), lower(trim(last_name))
),
legacy_unique AS (
  SELECT
    cmc.church_id,
    lower(trim(cmc.first_name))                             AS fn,
    lower(trim(cmc.last_name))                              AS ln,
    NULLIF(array_to_string(cmc.authorized_pickups, ', '), '') AS ap,
    CASE WHEN cmc.photo_permission THEN 'granted' ELSE 'denied' END AS permission_status
  FROM children_ministry_children cmc
  JOIN legacy_counts lc
    ON  lc.church_id = cmc.church_id
    AND lc.fn        = lower(trim(cmc.first_name))
    AND lc.ln        = lower(trim(cmc.last_name))
    AND lc.cnt       = 1
),
canonical_counts AS (
  SELECT
    church_id,
    lower(trim(first_name)) AS fn,
    lower(trim(last_name))  AS ln,
    count(*)                AS cnt
  FROM cm_visitor_children
  GROUP BY church_id, lower(trim(first_name)), lower(trim(last_name))
),
canonical_unique AS (
  SELECT
    cv.id,
    cv.church_id,
    lower(trim(cv.first_name)) AS fn,
    lower(trim(cv.last_name))  AS ln
  FROM cm_visitor_children cv
  JOIN canonical_counts cc
    ON  cc.church_id = cv.church_id
    AND cc.fn        = lower(trim(cv.first_name))
    AND cc.ln        = lower(trim(cv.last_name))
    AND cc.cnt       = 1
)
UPDATE cm_visitor_children cv
SET
  -- COALESCE: canonical column is freshly added (NULL), so legacy value fills it.
  -- Do not overwrite if somehow already non-null.
  authorized_pickups      = COALESCE(cv.authorized_pickups, lu.ap),
  -- Only overwrite if still at default 'not_reviewed'; don't demote an already-set status.
  photo_permission_status = CASE
    WHEN cv.photo_permission_status = 'not_reviewed' THEN lu.permission_status
    ELSE cv.photo_permission_status
  END
FROM legacy_unique lu
JOIN canonical_unique cu
  ON  cu.church_id = lu.church_id
  AND cu.fn        = lu.fn
  AND cu.ln        = lu.ln
WHERE cv.id = cu.id;

-- Rows in cm_visitor_children with authorized_pickups IS NULL after this migration were either:
--   (a) never present in children_ministry_children (e.g. infants/toddlers below grade 3rd), or
--   (b) ambiguous — multiple legacy rows with the same name in the same church, or
--   (c) ambiguous — multiple canonical rows with the same name in the same family.
-- Those rows retain photo_permission_status = 'not_reviewed' (the DEFAULT).
--
-- To review unmatched canonical rows:
--   SELECT id, church_id, first_name, last_name
--   FROM cm_visitor_children
--   WHERE authorized_pickups IS NULL
--   ORDER BY church_id, last_name, first_name;
--
-- To review ambiguous legacy rows (multiple children with same name in same church):
--   SELECT church_id, first_name, last_name, count(*)
--   FROM children_ministry_children
--   GROUP BY church_id, lower(trim(first_name)), lower(trim(last_name))
--   HAVING count(*) > 1;
