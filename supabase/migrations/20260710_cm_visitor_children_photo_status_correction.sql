-- Corrective migration: replace photo_permission (boolean) with photo_permission_status (text)
-- on cm_visitor_children.
--
-- Context: migration 20260709_cm_visitor_children_safety_fields.sql originally added a boolean
-- photo_permission column. A boolean cannot distinguish "never asked" from "explicitly denied",
-- so it is replaced with an explicit status field before any parent-facing review workflow exists.
--
-- photo_permission_status is intentionally designed to support the upcoming Annual Family Safety
-- Review workflow, where parents explicitly grant or deny photo permission during their annual
-- review. Allowed values: 'not_reviewed' | 'granted' | 'denied'.
--
-- This migration is safe to run even if the original migration was not applied:
--   ADD COLUMN IF NOT EXISTS ensures idempotency.
--   The DO block conditionally copies and drops the old boolean only if it still exists.

-- Step 1: Add the new status column if not already present.
ALTER TABLE cm_visitor_children
  ADD COLUMN IF NOT EXISTS photo_permission_status text NOT NULL DEFAULT 'not_reviewed'
    CHECK (photo_permission_status IN ('not_reviewed', 'granted', 'denied'));

-- Step 2: If the old boolean column still exists, copy its values then drop it.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_name  = 'cm_visitor_children'
      AND column_name = 'photo_permission'
  ) THEN
    -- Copy: TRUE → 'granted', FALSE → 'denied'.
    -- Only update rows still at the default 'not_reviewed' to avoid overwriting
    -- any value that may have been set by other means.
    UPDATE cm_visitor_children
    SET photo_permission_status = CASE
      WHEN photo_permission = true  THEN 'granted'
      WHEN photo_permission = false THEN 'denied'
      ELSE 'not_reviewed'
    END
    WHERE photo_permission_status = 'not_reviewed';

    ALTER TABLE cm_visitor_children DROP COLUMN photo_permission;
  END IF;
END
$$;
