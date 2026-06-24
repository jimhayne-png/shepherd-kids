-- Persistent onboarding state for church admin accounts created by Master Admin.
-- setup_token is a durable secret that identifies the setup link and works
-- repeatedly until the admin sets their password (password_set = true).

ALTER TABLE church_users
  ADD COLUMN IF NOT EXISTS password_set          boolean     NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS setup_token           text        UNIQUE,
  ADD COLUMN IF NOT EXISTS setup_token_expires_at timestamptz;

-- Existing rows already have passwords (default true is correct).
-- New admin rows created via Master Admin flow will be inserted with
-- password_set = false and a unique setup_token.
