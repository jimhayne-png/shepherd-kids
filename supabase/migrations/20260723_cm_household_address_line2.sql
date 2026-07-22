-- Household Settings address editor needs a second address line.
-- `address` (cm_visitor_families) remains the canonical line-1 field already
-- read/written by the Annual Family Safety Review; this column is additive
-- and is not exposed to that review workflow.
ALTER TABLE cm_visitor_families
  ADD COLUMN IF NOT EXISTS address_line2 text;
