-- Visitors: one row per person who visits
create table if not exists visitors (
  id uuid primary key default gen_random_uuid(),
  church_id uuid not null,
  first_name text not null,
  last_name text not null,
  email text,
  phone text,
  visit_date date not null default current_date,
  source text not null default 'manual',         -- qr | manual
  attended_event_id uuid,                        -- soft link to attendance_records.id
  department_id uuid,                            -- soft link to departments.id (interest)
  status text not null default 'new',            -- new | in_sequence | converted | opted_out
  notes text,
  created_at timestamptz default now()
);

-- Visitor Sequences: a named series of follow-up steps
create table if not exists visitor_sequences (
  id uuid primary key default gen_random_uuid(),
  church_id uuid not null,
  department_id uuid,                            -- NULL = church-wide default
  name text not null,
  is_active boolean not null default true,
  created_at timestamptz default now()
);

-- Visitor Sequence Steps: individual steps in a sequence
create table if not exists visitor_sequence_steps (
  id uuid primary key default gen_random_uuid(),
  sequence_id uuid references visitor_sequences(id) on delete cascade not null,
  step_number int not null,
  day_offset int not null default 0,             -- days after enrollment
  step_type text not null default 'email',       -- email | task
  email_subject text,
  email_body text,
  task_description text,
  assigned_to_role text                          -- pastor | staff (for task steps)
);

-- Visitor Sequence Enrollments: tracks a visitor's progress through a sequence
create table if not exists visitor_sequence_enrollments (
  id uuid primary key default gen_random_uuid(),
  visitor_id uuid references visitors(id) on delete cascade not null,
  sequence_id uuid references visitor_sequences(id) on delete cascade not null,
  church_id uuid not null,
  enrolled_at timestamptz default now(),
  current_step int not null default 1,
  status text not null default 'active',         -- active | completed | opted_out
  next_step_at timestamptz
);

-- Visitor Sequence Log: audit trail of executed steps
create table if not exists visitor_sequence_log (
  id uuid primary key default gen_random_uuid(),
  enrollment_id uuid references visitor_sequence_enrollments(id) on delete cascade not null,
  step_id uuid references visitor_sequence_steps(id) on delete cascade not null,
  executed_at timestamptz default now(),
  result text not null                           -- sent | skipped | failed
);

-- RLS: enable for all tables
alter table visitors enable row level security;
alter table visitor_sequences enable row level security;
alter table visitor_sequence_steps enable row level security;
alter table visitor_sequence_enrollments enable row level security;
alter table visitor_sequence_log enable row level security;

-- RLS policies (service role bypasses; these guard direct client access)
create policy "Church staff see their visitors"
  on visitors for all
  using (church_id in (select church_id from church_users where user_id = auth.uid()));

create policy "Church staff see their sequences"
  on visitor_sequences for all
  using (church_id in (select church_id from church_users where user_id = auth.uid()));

create policy "Church staff see sequence steps"
  on visitor_sequence_steps for all
  using (sequence_id in (
    select id from visitor_sequences
    where church_id in (select church_id from church_users where user_id = auth.uid())
  ));

create policy "Church staff see enrollments"
  on visitor_sequence_enrollments for all
  using (church_id in (select church_id from church_users where user_id = auth.uid()));

create policy "Church staff see sequence log"
  on visitor_sequence_log for all
  using (enrollment_id in (
    select id from visitor_sequence_enrollments
    where church_id in (select church_id from church_users where user_id = auth.uid())
  ));

-- Indexes
create index if not exists idx_visitors_church on visitors(church_id);
create index if not exists idx_visitors_email on visitors(email);
create index if not exists idx_visitor_sequences_church on visitor_sequences(church_id);
create index if not exists idx_visitor_enrollments_visitor on visitor_sequence_enrollments(visitor_id);
create index if not exists idx_visitor_enrollments_next on visitor_sequence_enrollments(next_step_at) where status = 'active';
