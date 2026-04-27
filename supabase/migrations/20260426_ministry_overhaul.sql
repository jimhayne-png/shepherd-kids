-- Ministry Architecture Overhaul — new tables for visitor tracking and Metamorphosis program

-- Ministry-specific visitor tracking (before they become full roster members)
create table if not exists ministry_visitors (
  id uuid primary key default gen_random_uuid(),
  church_id uuid not null,
  ministry_type text not null,
  first_name text not null,
  last_name text not null,
  email text,
  phone text,
  visit_count int not null default 1,
  first_visit_date date not null default current_date,
  last_visit_date date not null default current_date,
  promoted_to_member boolean not null default false,
  promoted_at timestamptz,
  notes text,
  status text not null default 'visitor'
    check (status in ('visitor','flagged','promoted','declined')),
  -- flagged = system flagged for promotion (3+ visits)
  -- promoted = added to main roster
  -- declined = staff chose not to promote
  created_at timestamptz not null default now()
);

-- Tracks which sessions a ministry visitor attended
create table if not exists ministry_visitor_attendance (
  id uuid primary key default gen_random_uuid(),
  church_id uuid not null,
  ministry_type text not null,
  visitor_id uuid not null,
  session_date date not null,
  created_at timestamptz not null default now(),
  unique(visitor_id, session_date)
);

-- Metamorphosis cohorts (transition program between ministry levels)
create table if not exists metamorphosis_cohorts (
  id uuid primary key default gen_random_uuid(),
  church_id uuid not null,
  name text not null,
  cohort_type text not null check (cohort_type in ('junior','senior')),
  -- junior: 6th grade → middle school (mentored by 11th/12th graders)
  -- senior: 8th grade → high school (mentored by young adults)
  start_date date not null,
  end_date date not null,
  status text not null default 'upcoming'
    check (status in ('upcoming','active','completed')),
  graduation_date date,
  graduation_celebrated boolean not null default false,
  notes text,
  created_at timestamptz not null default now()
);

-- Students enrolled in a Metamorphosis cohort
create table if not exists metamorphosis_students (
  id uuid primary key default gen_random_uuid(),
  church_id uuid not null,
  cohort_id uuid not null,
  member_id uuid not null,
  first_name text not null,
  last_name text not null,
  current_ministry text,
  destination_ministry text,
  completed boolean not null default false,
  graduated boolean not null default false,
  created_at timestamptz not null default now()
);

-- Mentors assigned to a Metamorphosis cohort
create table if not exists metamorphosis_mentors (
  id uuid primary key default gen_random_uuid(),
  church_id uuid not null,
  cohort_id uuid not null,
  member_id uuid not null,
  first_name text not null,
  last_name text not null,
  grade text,
  age int,
  mentor_type text not null check (mentor_type in ('junior_mentor','senior_mentor')),
  -- junior_mentor: 11th/12th grader for Metamorphosis Jr.
  -- senior_mentor: Young Adult for Metamorphosis Sr.
  assigned_student_ids text[] not null default '{}',
  created_at timestamptz not null default now()
);

-- Weekly sessions within a Metamorphosis cohort
create table if not exists metamorphosis_sessions (
  id uuid primary key default gen_random_uuid(),
  church_id uuid not null,
  cohort_id uuid not null,
  week_number int not null,
  session_date date,
  topic text,
  notes text,
  attendance_count int not null default 0,
  created_at timestamptz not null default now()
);

-- Mentor check-ins with individual students
create table if not exists metamorphosis_mentor_checkins (
  id uuid primary key default gen_random_uuid(),
  church_id uuid not null,
  cohort_id uuid not null,
  mentor_id uuid,
  student_id uuid,
  week_number int,
  checkin_date date,
  notes text,
  created_at timestamptz not null default now()
);

-- Indexes
create index if not exists idx_mv_church on ministry_visitors(church_id);
create index if not exists idx_mv_type on ministry_visitors(ministry_type);
create index if not exists idx_mv_status on ministry_visitors(status);
create index if not exists idx_mva_visitor on ministry_visitor_attendance(visitor_id);
create index if not exists idx_mva_church on ministry_visitor_attendance(church_id);
create index if not exists idx_mva_date on ministry_visitor_attendance(session_date);
create index if not exists idx_mc_church on metamorphosis_cohorts(church_id);
create index if not exists idx_ms_cohort on metamorphosis_students(cohort_id);
create index if not exists idx_ms_church on metamorphosis_students(church_id);
create index if not exists idx_mm_cohort on metamorphosis_mentors(cohort_id);
create index if not exists idx_mm_church on metamorphosis_mentors(church_id);
create index if not exists idx_mse_cohort on metamorphosis_sessions(cohort_id);
create index if not exists idx_mmc_cohort on metamorphosis_mentor_checkins(cohort_id);
create index if not exists idx_mmc_mentor on metamorphosis_mentor_checkins(mentor_id);
create index if not exists idx_mmc_student on metamorphosis_mentor_checkins(student_id);

-- RLS (service role bypasses; policies added per module)
alter table ministry_visitors enable row level security;
alter table ministry_visitor_attendance enable row level security;
alter table metamorphosis_cohorts enable row level security;
alter table metamorphosis_students enable row level security;
alter table metamorphosis_mentors enable row level security;
alter table metamorphosis_sessions enable row level security;
alter table metamorphosis_mentor_checkins enable row level security;
