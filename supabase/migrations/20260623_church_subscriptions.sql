-- church_subscriptions: mirrors Stripe subscription state for each church.
-- churches.subscription_status is kept in sync by the webhook handler.

create table if not exists church_subscriptions (
  id                     uuid        primary key default gen_random_uuid(),
  church_id              uuid        not null references churches(id) on delete cascade,
  stripe_customer_id     text        not null,
  stripe_subscription_id text,
  stripe_price_id        text,
  status                 text        not null default 'incomplete',
  current_period_start   timestamptz,
  current_period_end     timestamptz,
  cancel_at_period_end   boolean     not null default false,
  trial_end              timestamptz,
  created_at             timestamptz not null default now(),
  updated_at             timestamptz not null default now(),
  unique (church_id),
  unique (stripe_customer_id)
);

-- Allow non-null subscription IDs to be unique while permitting multiple NULLs
create unique index if not exists idx_church_subscriptions_stripe_sub
  on church_subscriptions (stripe_subscription_id)
  where stripe_subscription_id is not null;

create index if not exists idx_church_subscriptions_church_id
  on church_subscriptions (church_id);

create index if not exists idx_church_subscriptions_stripe_customer
  on church_subscriptions (stripe_customer_id);

alter table church_subscriptions enable row level security;

create policy "Church admins see their own subscription"
  on church_subscriptions for select
  using (church_id in (select church_id from church_users where user_id = auth.uid()));
