-- Children's Ministry Kiosk Check-In
-- No FK references; RLS enabled only.

create table if not exists cm_service_templates (
  id uuid primary key default gen_random_uuid(),
  church_id text not null,
  name text not null,
  typical_day text,
  typical_time time,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists cm_checkin_rooms (
  id uuid primary key default gen_random_uuid(),
  church_id text not null,
  name text not null,
  min_age int,
  max_age int,
  capacity int,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists cm_checkin_sessions (
  id uuid primary key default gen_random_uuid(),
  church_id text not null,
  service_template_id text,
  service_name text not null,
  date date not null,
  scheduled_time time,
  status text not null default 'open' check (status in ('open', 'closed')),
  kiosk_pin text not null,
  created_at timestamptz not null default now()
);

create table if not exists cm_checkin_records (
  id uuid primary key default gen_random_uuid(),
  session_id text not null,
  church_id text not null,
  child_name text not null,
  parent_name text not null,
  parent_phone text not null,
  room_id text,
  security_code text not null,
  is_new_visitor boolean not null default false,
  allergies text[] not null default '{}',
  allergy_other text,
  authorized_pickups text,
  checked_in_at timestamptz not null default now(),
  checked_out_at timestamptz,
  checked_out_by text
);

create index if not exists idx_cm_service_templates_church on cm_service_templates(church_id);
create index if not exists idx_cm_checkin_rooms_church on cm_checkin_rooms(church_id);
create index if not exists idx_cm_checkin_sessions_church on cm_checkin_sessions(church_id);
create index if not exists idx_cm_checkin_records_session on cm_checkin_records(session_id);
create index if not exists idx_cm_checkin_records_phone on cm_checkin_records(parent_phone);
create index if not exists idx_cm_checkin_records_church on cm_checkin_records(church_id);

alter table cm_service_templates enable row level security;
alter table cm_checkin_rooms enable row level security;
alter table cm_checkin_sessions enable row level security;
alter table cm_checkin_records enable row level security;
