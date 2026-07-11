-- Ensure pastor fields exist on the churches table.
-- Safe to run on instances created before these columns were added to the base schema.
ALTER TABLE churches
  ADD COLUMN IF NOT EXISTS senior_pastor   text,
  ADD COLUMN IF NOT EXISTS children_pastor text;
