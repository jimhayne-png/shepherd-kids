-- Family Care: household-level care notes, prayer requests, assigned leader,
-- and sensitive family notes for the household record page.
-- All tables are scoped by church_id + family_id (cm_visitor_families.id).
-- RLS is enabled but no policies are added: API routes use the service-role
-- admin client and enforce church_id/family_id scoping manually, matching
-- the existing cm_family_safety_reviews convention.

create table if not exists cm_family_care_notes (
  id uuid primary key default gen_random_uuid(),
  church_id uuid not null,
  family_id uuid not null,
  note_text text not null,
  created_by uuid not null,
  created_by_name text,
  created_at timestamptz not null default now(),
  updated_at timestamptz,
  archived_at timestamptz,
  archived_by uuid
);

create index if not exists idx_cm_family_care_notes_family on cm_family_care_notes(family_id);
create index if not exists idx_cm_family_care_notes_church on cm_family_care_notes(church_id);

alter table cm_family_care_notes enable row level security;

create table if not exists cm_family_prayer_requests (
  id uuid primary key default gen_random_uuid(),
  church_id uuid not null,
  family_id uuid not null,
  request_text text not null,
  status text not null default 'active' check (status in ('active','answered','archived')),
  created_by uuid not null,
  created_by_name text,
  created_at timestamptz not null default now(),
  updated_at timestamptz,
  answered_at timestamptz
);

create index if not exists idx_cm_family_prayer_requests_family on cm_family_prayer_requests(family_id);
create index if not exists idx_cm_family_prayer_requests_church on cm_family_prayer_requests(church_id);

alter table cm_family_prayer_requests enable row level security;

create table if not exists cm_family_leader_assignments (
  id uuid primary key default gen_random_uuid(),
  church_id uuid not null,
  family_id uuid not null unique,
  leader_user_id uuid not null,
  leader_name text,
  assigned_by uuid not null,
  assigned_by_name text,
  assigned_at timestamptz not null default now(),
  updated_at timestamptz
);

create index if not exists idx_cm_family_leader_assignments_family on cm_family_leader_assignments(family_id);
create index if not exists idx_cm_family_leader_assignments_church on cm_family_leader_assignments(church_id);

alter table cm_family_leader_assignments enable row level security;

create table if not exists cm_family_sensitive_notes (
  id uuid primary key default gen_random_uuid(),
  church_id uuid not null,
  family_id uuid not null,
  note_text text not null,
  created_by uuid not null,
  created_by_name text,
  created_at timestamptz not null default now(),
  updated_at timestamptz,
  archived_at timestamptz,
  archived_by uuid
);

create index if not exists idx_cm_family_sensitive_notes_family on cm_family_sensitive_notes(family_id);
create index if not exists idx_cm_family_sensitive_notes_church on cm_family_sensitive_notes(church_id);

alter table cm_family_sensitive_notes enable row level security;
