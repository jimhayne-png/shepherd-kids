ALTER TABLE churches ADD COLUMN IF NOT EXISTS timezone text NOT NULL DEFAULT 'America/Los_Angeles';
