-- Ministry Rosters
create table if not exists ministry_rosters (
  id uuid primary key default gen_random_uuid(),
  church_id uuid not null,
  ministry_type text not null,
  member_id uuid not null,
  joined_date date default current_date,
  status text not null default 'active' check (status in ('active','inactive')),
  pipeline_stage text,
  notes text,
  created_at timestamptz not null default now(),
  unique(church_id, ministry_type, member_id)
);

-- Ministry Attendance
create table if not exists ministry_attendance (
  id uuid primary key default gen_random_uuid(),
  church_id uuid not null,
  ministry_type text not null,
  member_id uuid not null,
  session_date date not null,
  present boolean not null default true,
  consecutive_weeks int not null default 1,
  notes text,
  created_at timestamptz not null default now(),
  unique(ministry_type, member_id, session_date)
);

-- Ministry Follow Up Settings
create table if not exists ministry_followup_settings (
  id uuid primary key default gen_random_uuid(),
  church_id uuid not null,
  ministry_type text not null,
  frequency text not null default 'monthly' check (frequency in ('monthly','bimonthly')),
  touch1_label text not null default 'Phone Call',
  touch2_label text not null default 'Personal Letter',
  touch3_label text not null default 'Personal Visit',
  created_at timestamptz not null default now(),
  unique(church_id, ministry_type)
);

-- Ministry Follow Up Log
create table if not exists ministry_followup_log (
  id uuid primary key default gen_random_uuid(),
  church_id uuid not null,
  ministry_type text not null,
  member_id uuid not null,
  period_year int not null,
  period_month int not null,
  touch1_completed boolean not null default false,
  touch1_date date,
  touch1_note text,
  touch2_completed boolean not null default false,
  touch2_date date,
  touch2_note text,
  touch3_completed boolean not null default false,
  touch3_date date,
  touch3_note text,
  assigned_to uuid,
  created_at timestamptz not null default now(),
  unique(church_id, ministry_type, member_id, period_year, period_month)
);

-- Shepherd Groups
create table if not exists shepherd_groups (
  id uuid primary key default gen_random_uuid(),
  church_id uuid not null,
  ministry_type text not null,
  volunteer_name text not null,
  volunteer_email text,
  volunteer_phone text,
  volunteer_user_id uuid,
  leadership_kid_id uuid,
  created_at timestamptz not null default now()
);

-- Shepherd Group Members
create table if not exists shepherd_group_members (
  id uuid primary key default gen_random_uuid(),
  church_id uuid not null,
  group_id uuid not null,
  member_id uuid not null,
  joined_at timestamptz not null default now(),
  unique(group_id, member_id)
);

-- Shepherd Group Contacts
create table if not exists shepherd_group_contacts (
  id uuid primary key default gen_random_uuid(),
  church_id uuid not null,
  group_id uuid not null,
  member_id uuid not null,
  period_year int not null,
  period_month int not null,
  phone_call_done boolean not null default false,
  phone_call_date date,
  phone_call_note text,
  two_on_one_done boolean not null default false,
  two_on_one_date date,
  two_on_one_note text,
  letter_done boolean not null default false,
  letter_date date,
  letter_note text,
  letter_generated_at timestamptz,
  created_at timestamptz not null default now(),
  unique(group_id, member_id, period_year, period_month)
);

-- Bible Study Pods
create table if not exists bible_study_pods (
  id uuid primary key default gen_random_uuid(),
  church_id uuid not null,
  name text not null,
  description text,
  leader_member_id uuid,
  location_description text,
  meeting_day text,
  meeting_time time,
  curriculum_name text,
  curriculum_week int not null default 1,
  ministry_type text,
  status text not null default 'active' check (status in ('active','inactive')),
  created_at timestamptz not null default now()
);

-- Bible Study Pod Members
create table if not exists bible_study_pod_members (
  id uuid primary key default gen_random_uuid(),
  church_id uuid not null,
  pod_id uuid not null,
  member_id uuid not null,
  joined_at timestamptz not null default now(),
  unique(pod_id, member_id)
);

-- Bible Study Pod Attendance
create table if not exists bible_study_pod_attendance (
  id uuid primary key default gen_random_uuid(),
  church_id uuid not null,
  pod_id uuid not null,
  member_id uuid not null,
  session_date date not null,
  present boolean not null default true,
  created_at timestamptz not null default now(),
  unique(pod_id, member_id, session_date)
);

-- Pastoral Staff
create table if not exists pastoral_staff (
  id uuid primary key default gen_random_uuid(),
  church_id uuid not null,
  name text not null,
  title text,
  email text,
  phone text,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

-- Annual Pastor Touch Settings
create table if not exists annual_pastor_touch_settings (
  id uuid primary key default gen_random_uuid(),
  church_id uuid not null,
  year int not null,
  mode text not null default 'single' check (mode in ('single','multi')),
  created_at timestamptz not null default now(),
  unique(church_id, year)
);

-- Annual Pastor Touch Assignments
create table if not exists annual_pastor_touch_assignments (
  id uuid primary key default gen_random_uuid(),
  church_id uuid not null,
  year int not null,
  member_id uuid not null,
  pastor_id uuid not null,
  week_number int not null,
  created_at timestamptz not null default now(),
  unique(church_id, year, member_id)
);

-- Annual Pastor Touch Log
create table if not exists annual_pastor_touch_log (
  id uuid primary key default gen_random_uuid(),
  church_id uuid not null,
  year int not null,
  member_id uuid not null,
  pastor_id uuid not null,
  call_done boolean not null default false,
  call_date date,
  call_note text,
  letter_done boolean not null default false,
  letter_date date,
  letter_note text,
  letter_generated_at timestamptz,
  letter_edited_content text,
  prayer_done boolean not null default false,
  prayer_date date,
  prayer_note text,
  created_at timestamptz not null default now(),
  unique(church_id, year, member_id)
);

-- Ministry Communications
create table if not exists ministry_communications (
  id uuid primary key default gen_random_uuid(),
  church_id uuid not null,
  ministry_type text not null,
  title text not null,
  body text not null,
  sent_by uuid,
  sent_at timestamptz,
  email_sent boolean not null default false,
  created_at timestamptz not null default now()
);

-- Letter Templates
create table if not exists letter_templates (
  id uuid primary key default gen_random_uuid(),
  church_id uuid not null,
  template_type text not null,
  subject text,
  body_html text,
  is_default boolean not null default true,
  created_at timestamptz not null default now()
);

-- RLS: enable for all tables (service role bypasses; policies added per module)
alter table ministry_rosters enable row level security;
alter table ministry_attendance enable row level security;
alter table ministry_followup_settings enable row level security;
alter table ministry_followup_log enable row level security;
alter table shepherd_groups enable row level security;
alter table shepherd_group_members enable row level security;
alter table shepherd_group_contacts enable row level security;
alter table bible_study_pods enable row level security;
alter table bible_study_pod_members enable row level security;
alter table bible_study_pod_attendance enable row level security;
alter table pastoral_staff enable row level security;
alter table annual_pastor_touch_settings enable row level security;
alter table annual_pastor_touch_assignments enable row level security;
alter table annual_pastor_touch_log enable row level security;
alter table ministry_communications enable row level security;
alter table letter_templates enable row level security;

-- Indexes
create index if not exists idx_ministry_rosters_church on ministry_rosters(church_id);
create index if not exists idx_ministry_rosters_type on ministry_rosters(ministry_type);
create index if not exists idx_ministry_rosters_member on ministry_rosters(member_id);

create index if not exists idx_ministry_attendance_church on ministry_attendance(church_id);
create index if not exists idx_ministry_attendance_type on ministry_attendance(ministry_type);
create index if not exists idx_ministry_attendance_member on ministry_attendance(member_id);
create index if not exists idx_ministry_attendance_date on ministry_attendance(session_date);

create index if not exists idx_ministry_followup_log_church on ministry_followup_log(church_id);
create index if not exists idx_ministry_followup_log_type on ministry_followup_log(ministry_type);
create index if not exists idx_ministry_followup_log_period on ministry_followup_log(period_year, period_month);

create index if not exists idx_shepherd_groups_church on shepherd_groups(church_id);
create index if not exists idx_shepherd_groups_type on shepherd_groups(ministry_type);

create index if not exists idx_shepherd_group_members_group on shepherd_group_members(group_id);
create index if not exists idx_shepherd_group_members_member on shepherd_group_members(member_id);

create index if not exists idx_shepherd_group_contacts_group on shepherd_group_contacts(group_id);
create index if not exists idx_shepherd_group_contacts_period on shepherd_group_contacts(period_year, period_month);

create index if not exists idx_bible_study_pods_church on bible_study_pods(church_id);

create index if not exists idx_bible_study_pod_members_pod on bible_study_pod_members(pod_id);

create index if not exists idx_bible_study_pod_attendance_pod on bible_study_pod_attendance(pod_id);
create index if not exists idx_bible_study_pod_attendance_date on bible_study_pod_attendance(session_date);

create index if not exists idx_pastoral_staff_church on pastoral_staff(church_id);

create index if not exists idx_pastor_touch_assignments_church on annual_pastor_touch_assignments(church_id);
create index if not exists idx_pastor_touch_assignments_year on annual_pastor_touch_assignments(year);
create index if not exists idx_pastor_touch_assignments_pastor on annual_pastor_touch_assignments(pastor_id);
create index if not exists idx_pastor_touch_assignments_week on annual_pastor_touch_assignments(week_number);

create index if not exists idx_pastor_touch_log_church on annual_pastor_touch_log(church_id);
create index if not exists idx_pastor_touch_log_year on annual_pastor_touch_log(year);
create index if not exists idx_pastor_touch_log_pastor on annual_pastor_touch_log(pastor_id);

create index if not exists idx_ministry_communications_church on ministry_communications(church_id);
create index if not exists idx_ministry_communications_type on ministry_communications(ministry_type);

create index if not exists idx_letter_templates_church on letter_templates(church_id);
create index if not exists idx_letter_templates_type on letter_templates(template_type);
