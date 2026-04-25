-- Attendance Events: one row per check-in session opened by staff
create table if not exists attendance_events (
  id uuid primary key default gen_random_uuid(),
  church_id uuid not null,
  event_id uuid,                       -- soft link to events.id, no FK
  event_name text not null,
  event_date date not null,
  check_in_token text unique not null, -- used in /check-in/[token] public URL
  check_in_open boolean default true,
  created_at timestamptz default now()
);

-- Attendance Records: one row per person per session
create table if not exists attendance_records (
  id uuid primary key default gen_random_uuid(),
  attendance_event_id uuid references attendance_events(id) on delete cascade not null,
  church_id uuid not null,
  member_id uuid,                      -- null for guests
  guest_name text,                     -- non-null when member_id is null
  guest_email text,
  checked_in_at timestamptz default now(),
  checked_in_by text default 'staff', -- 'self' for public check-in
  unique (attendance_event_id, member_id) -- prevents double member check-in; NULLs exempt
);

-- Indexes for common queries
create index if not exists idx_att_events_church on attendance_events(church_id);
create index if not exists idx_att_records_event on attendance_records(attendance_event_id);
create index if not exists idx_att_records_member on attendance_records(member_id);
