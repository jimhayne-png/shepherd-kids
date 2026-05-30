-- Children's Ministry — Seasons
create table if not exists children_ministry_seasons (
  id uuid primary key default gen_random_uuid(),
  church_id uuid not null,
  name text not null,
  start_date date not null,
  end_date date not null,
  reward_description text,
  reward_date date,
  status text not null default 'upcoming' check (status in ('active', 'completed', 'upcoming')),
  season_length_weeks int,
  created_at timestamptz not null default now()
);

-- Children Ministry
create table if not exists children_ministry_children (
  id uuid primary key default gen_random_uuid(),
  church_id uuid not null,
  member_id uuid,
  first_name text not null,
  last_name text not null,
  grade text not null check (grade in ('3rd', '4th', '5th', '6th')),
  date_of_birth date,
  allergies text,
  medical_notes text,
  parent1_name text,
  parent1_email text,
  parent1_phone text,
  parent2_name text,
  parent2_email text,
  parent2_phone text,
  authorized_pickups text[] not null default '{}',
  photo_permission boolean not null default false,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

-- Teams (one per season)
create table if not exists children_ministry_teams (
  id uuid primary key default gen_random_uuid(),
  church_id uuid not null,
  season_id uuid not null,
  name text not null,
  color text not null,
  mascot text,
  volunteer_leader_name text,
  volunteer_leader_email text,
  captain_child_id uuid,
  co_captain_child_id uuid,
  total_points bigint not null default 0,
  member_count int not null default 0,
  created_at timestamptz not null default now()
);

-- Team membership (child ↔ team per season)
create table if not exists children_ministry_team_members (
  id uuid primary key default gen_random_uuid(),
  church_id uuid not null,
  season_id uuid not null,
  team_id uuid not null,
  child_id uuid not null,
  joined_at timestamptz not null default now(),
  unique(child_id, season_id)
);

-- Points ledger
create table if not exists children_ministry_points (
  id uuid primary key default gen_random_uuid(),
  church_id uuid not null,
  season_id uuid not null,
  team_id uuid,
  child_id uuid,
  category text not null check (category in (
    'attendance','memory_verse','friend_referral','friend_returns','game_win',
    'participation','behavior','encouragement','fundraising',
    'streak_bonus','split_bonus','other'
  )),
  points bigint not null,
  awarded_by uuid,
  note text,
  created_at timestamptz not null default now()
);

-- Attendance records (one per child per Sunday)
create table if not exists children_ministry_attendance (
  id uuid primary key default gen_random_uuid(),
  church_id uuid not null,
  season_id uuid not null,
  child_id uuid not null,
  session_date date not null,
  present boolean not null default true,
  consecutive_weeks int not null default 1,
  created_at timestamptz not null default now(),
  unique(child_id, session_date)
);

-- Weekly parent update records
create table if not exists children_ministry_parent_updates (
  id uuid primary key default gen_random_uuid(),
  church_id uuid not null,
  season_id uuid not null,
  session_date date not null,
  memory_verse text,
  lesson_summary text,
  conversation_starter text,
  special_notes text,
  sent_at timestamptz,
  created_at timestamptz not null default now(),
  unique(church_id, session_date)
);

-- Indexes
create index if not exists idx_cm_seasons_church on children_ministry_seasons(church_id);
create index if not exists idx_cm_children_church on children_ministry_children(church_id);
create index if not exists idx_cm_teams_season on children_ministry_teams(season_id);
create index if not exists idx_cm_team_members_team on children_ministry_team_members(team_id);
create index if not exists idx_cm_team_members_child on children_ministry_team_members(child_id);
create index if not exists idx_cm_points_season on children_ministry_points(season_id);
create index if not exists idx_cm_points_team on children_ministry_points(team_id);
create index if not exists idx_cm_points_child on children_ministry_points(child_id);
create index if not exists idx_cm_attendance_child on children_ministry_attendance(child_id);
create index if not exists idx_cm_attendance_date on children_ministry_attendance(session_date);

-- RLS (service role bypasses; these govern direct client access)
alter table children_ministry_seasons enable row level security;
alter table children_ministry_children enable row level security;
alter table children_ministry_teams enable row level security;
alter table children_ministry_team_members enable row level security;
alter table children_ministry_points enable row level security;
alter table children_ministry_attendance enable row level security;
alter table children_ministry_parent_updates enable row level security;

create policy "church staff seasons" on children_ministry_seasons for all
  using (church_id in (select church_id from church_users where user_id = auth.uid()));

create policy "church staff children" on children_ministry_children for all
  using (church_id in (select church_id from church_users where user_id = auth.uid()));

create policy "church staff teams" on children_ministry_teams for all
  using (church_id in (select church_id from church_users where user_id = auth.uid()));

create policy "church staff team members" on children_ministry_team_members for all
  using (church_id in (select church_id from church_users where user_id = auth.uid()));

create policy "church staff points" on children_ministry_points for all
  using (church_id in (select church_id from church_users where user_id = auth.uid()));

create policy "church staff attendance" on children_ministry_attendance for all
  using (church_id in (select church_id from church_users where user_id = auth.uid()));

create policy "church staff parent updates" on children_ministry_parent_updates for all
  using (church_id in (select church_id from church_users where user_id = auth.uid()));
