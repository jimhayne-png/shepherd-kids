-- Household Members: structured guardian/grandparent/authorized-pickup roster
-- for the household record page. Distinct from cm_visitor_children.authorized_pickups
-- (the free-text field kiosk/classroom checkout already uses for pickup verification) —
-- this table is a staff-facing directory only and is not wired into that flow.

create table if not exists cm_household_members (
  id uuid primary key default gen_random_uuid(),
  church_id uuid not null,
  family_id uuid not null,
  first_name text not null,
  last_name text not null,
  relationship text not null check (relationship in ('parent_guardian','grandparent','authorized_pickup','other_trusted_adult')),
  phone text,
  email text,
  authorized_pickup boolean not null default false,
  pickup_scope text check (pickup_scope in ('all_children','specific_children')),
  emergency_contact boolean not null default false,
  notes text,
  created_by uuid not null,
  created_by_name text,
  created_at timestamptz not null default now(),
  updated_at timestamptz,
  archived_at timestamptz,
  archived_by uuid
);

create index if not exists idx_cm_household_members_family on cm_household_members(family_id);
create index if not exists idx_cm_household_members_church on cm_household_members(church_id);

alter table cm_household_members enable row level security;

-- Junction: only populated when pickup_scope = 'specific_children'.
create table if not exists cm_household_member_children (
  id uuid primary key default gen_random_uuid(),
  church_id uuid not null,
  household_member_id uuid not null references cm_household_members(id) on delete cascade,
  child_id uuid not null,
  created_at timestamptz not null default now(),
  unique(household_member_id, child_id)
);

create index if not exists idx_cm_hh_member_children_member on cm_household_member_children(household_member_id);
create index if not exists idx_cm_hh_member_children_child on cm_household_member_children(child_id);

alter table cm_household_member_children enable row level security;
