-- Allow admin overrides to be set before a church has a Stripe customer
ALTER TABLE church_subscriptions ALTER COLUMN stripe_customer_id DROP NOT NULL;

-- Admin billing override fields
ALTER TABLE church_subscriptions ADD COLUMN IF NOT EXISTS admin_override_enabled  boolean     NOT NULL DEFAULT false;
ALTER TABLE church_subscriptions ADD COLUMN IF NOT EXISTS admin_override_reason   text;
ALTER TABLE church_subscriptions ADD COLUMN IF NOT EXISTS admin_override_until    timestamptz;

-- Internal discount tracking (not applied to Stripe automatically)
ALTER TABLE church_subscriptions ADD COLUMN IF NOT EXISTS discount_percent        integer;
ALTER TABLE church_subscriptions ADD COLUMN IF NOT EXISTS discount_reason         text;
ALTER TABLE church_subscriptions ADD COLUMN IF NOT EXISTS discount_until          timestamptz;
