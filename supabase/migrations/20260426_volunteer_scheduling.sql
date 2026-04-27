-- Children's Ministry Volunteer Scheduling

create table if not exists cm_volunteer_roles (
  id uuid primary key default gen_random_uuid(),
  church_id uuid not null,
  name text not null,
  description text,
  color text not null default '#6366f1',
  is_active boolean not null default true,
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists cm_volunteers (
  id uuid primary key default gen_random_uuid(),
  church_id uuid not null,
  member_id uuid,
  first_name text not null,
  last_name text not null,
  email text,
  phone text,
  roles text[] not null default '{}',
  is_active boolean not null default true,
  background_check_status text not null default 'pending'
    check (background_check_status in ('pending','cleared','expired','failed')),
  background_check_date date,
  notes text,
  reliability_score int not null default 100,
  created_at timestamptz not null default now()
);

create table if not exists cm_service_events (
  id uuid primary key default gen_random_uuid(),
  church_id uuid not null,
  title text not null,
  event_date date not null,
  start_time time,
  end_time time,
  notes text,
  status text not null default 'scheduled'
    check (status in ('scheduled','completed','cancelled')),
  created_at timestamptz not null default now()
);

create table if not exists cm_volunteer_assignments (
  id uuid primary key default gen_random_uuid(),
  church_id uuid not null,
  event_id uuid not null,
  volunteer_id uuid not null,
  role_name text not null,
  status text not null default 'assigned'
    check (status in ('assigned','confirmed','declined','no_show')),
  reminder_sent boolean not null default false,
  reminder_sent_at timestamptz,
  confirmation_sent boolean not null default false,
  notes text,
  created_at timestamptz not null default now(),
  unique(event_id, volunteer_id)
);

create table if not exists cm_volunteer_availability (
  id uuid primary key default gen_random_uuid(),
  church_id uuid not null,
  volunteer_id uuid not null,
  unavailable_date date not null,
  reason text,
  created_at timestamptz not null default now(),
  unique(volunteer_id, unavailable_date)
);

-- Indexes
create index if not exists idx_cm_vr_church on cm_volunteer_roles(church_id);
create index if not exists idx_cm_vol_church on cm_volunteers(church_id);
create index if not exists idx_cm_vol_member on cm_volunteers(member_id);
create index if not exists idx_cm_se_church on cm_service_events(church_id);
create index if not exists idx_cm_se_date on cm_service_events(event_date desc);
create index if not exists idx_cm_va_event on cm_volunteer_assignments(event_id);
create index if not exists idx_cm_va_vol on cm_volunteer_assignments(volunteer_id);
create index if not exists idx_cm_avail_vol on cm_volunteer_availability(volunteer_id);
create index if not exists idx_cm_avail_date on cm_volunteer_availability(unavailable_date);

-- RLS
alter table cm_volunteer_roles enable row level security;
alter table cm_volunteers enable row level security;
alter table cm_service_events enable row level security;
alter table cm_volunteer_assignments enable row level security;
alter table cm_volunteer_availability enable row level security;
