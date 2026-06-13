-- ============================================================
-- ShepherdKids Minimum Base Schema
-- Run this FIRST in Supabase SQL Editor before any migrations.
--
-- Contains only tables not covered by any migration file:
--   churches, church_users, departments,
--   letter_templates (extracted from partial adult migration),
--   cm_followup_log (not in any migration file)
-- ============================================================

-- ─── CHURCHES ────────────────────────────────────────────────
create table if not exists churches (
  id                     uuid        primary key default gen_random_uuid(),
  name                   text        not null,
  slug                   text        unique not null,
  email                  text,
  phone                  text,
  website                text,
  address                text,
  city                   text,
  state                  text,
  zip                    text,
  logo_url               text,
  qr_checkin_enabled     boolean     not null default false,
  pastor_email           text,
  senior_pastor          text,
  children_pastor        text,
  youth_pastor           text,
  choir_director         text,
  mens_ministry_leader   text,
  womens_ministry_leader text,
  young_adult_leader     text,
  senior_ministry_leader text,
  subscription_status    text        not null default 'trial',
  subscription_tier      text,
  trial_ends_at          timestamptz,
  timezone               text        not null default 'America/Los_Angeles',
  created_at             timestamptz not null default now()
);

alter table churches enable row level security;

create policy "Church admins see their church"
  on churches for all
  using (id in (select church_id from church_users where user_id = auth.uid()));

-- ─── CHURCH USERS ────────────────────────────────────────────
create table if not exists church_users (
  id         uuid        primary key default gen_random_uuid(),
  church_id  uuid        not null references churches(id) on delete cascade,
  user_id    uuid        not null references auth.users(id) on delete cascade,
  role       text        not null default 'admin',
  created_at timestamptz not null default now(),
  unique(church_id, user_id)
);

alter table church_users enable row level security;

create policy "Users see their own church memberships"
  on church_users for all
  using (user_id = auth.uid());

-- ─── DEPARTMENTS ─────────────────────────────────────────────
-- Kept only for onboarding compatibility (create-church inserts defaults).
-- No CM page reads departments directly. Sprint 2: simplify or remove.
create table if not exists departments (
  id          uuid        primary key default gen_random_uuid(),
  church_id   uuid        not null references churches(id) on delete cascade,
  name        text        not null,
  description text,
  color       text,
  icon        text,
  created_at  timestamptz not null default now()
);

alter table departments enable row level security;

create policy "Church staff see their departments"
  on departments for all
  using (church_id in (select church_id from church_users where user_id = auth.uid()));

create index if not exists idx_departments_church on departments(church_id);

-- ─── LETTER TEMPLATES ────────────────────────────────────────
-- Extracted from 20260425_ministry_system.sql (PARTIAL migration).
-- Used by app/api/children-ministry/letter-template/ for parent emails.
create table if not exists letter_templates (
  id            uuid        primary key default gen_random_uuid(),
  church_id     uuid        not null,
  template_type text        not null,
  subject       text,
  body_html     text,
  is_default    boolean     not null default true,
  created_at    timestamptz not null default now()
);

alter table letter_templates enable row level security;

create policy "Church staff see letter templates"
  on letter_templates for all
  using (church_id in (select church_id from church_users where user_id = auth.uid()));

create index if not exists idx_letter_templates_church on letter_templates(church_id);
create index if not exists idx_letter_templates_type on letter_templates(template_type);

-- ─── CM FOLLOWUP LOG ─────────────────────────────────────────
-- Not in any migration file. Used by:
--   app/api/checkin/followup/route.ts (writes)
--   app/api/checkin/new-visitors/route.ts (reads)
--   app/api/cron/checkin-followup/ (reads + writes)
create table if not exists cm_followup_log (
  id                   uuid        primary key default gen_random_uuid(),
  church_id            uuid        not null,
  session_id           text        not null,
  record_id            text        not null,
  parent_email         text,
  parent_name          text,
  child_names          text[]      not null default '{}',
  follow_up_type       text        not null,
  status               text        not null default 'pending',
  personalized_message text,
  auto_send            boolean     not null default false,
  sent_at              timestamptz,
  created_at           timestamptz not null default now()
);

alter table cm_followup_log enable row level security;

create policy "Church staff see CM followup log"
  on cm_followup_log for all
  using (church_id in (select church_id from church_users where user_id = auth.uid()));

create index if not exists idx_cm_followup_log_church  on cm_followup_log(church_id);
create index if not exists idx_cm_followup_log_session on cm_followup_log(session_id);
create index if not exists idx_cm_followup_log_record  on cm_followup_log(record_id);
