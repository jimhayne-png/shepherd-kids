-- Ministry check-in and visitor follow-up for all ministry types

create table if not exists ministry_checkin_sessions (
  id uuid primary key default gen_random_uuid(),
  church_id text not null,
  ministry_type text not null,
  service_name text not null,
  date date not null,
  status text not null default 'open' check (status in ('open', 'closed')),
  auto_followup boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists ministry_checkin_records (
  id uuid primary key default gen_random_uuid(),
  session_id text not null,
  church_id text not null,
  ministry_type text not null,
  member_id text,
  visitor_name text,
  visitor_phone text,
  visitor_email text,
  is_new_visitor boolean not null default false,
  visit_count int not null default 1,
  checked_in_at timestamptz not null default now()
);

create table if not exists ministry_followup_log (
  id uuid primary key default gen_random_uuid(),
  church_id text not null,
  session_id text not null,
  record_id text not null,
  visitor_name text,
  visitor_phone text,
  visitor_email text,
  follow_up_type text not null check (follow_up_type in ('email', 'letter', 'both', 'skip')),
  status text not null default 'pending' check (status in ('pending', 'sent', 'skipped')),
  personalized_message text,
  created_at timestamptz not null default now(),
  sent_at timestamptz
);

create index if not exists idx_mcs_church_type on ministry_checkin_sessions(church_id, ministry_type);
create index if not exists idx_mcr_session on ministry_checkin_records(session_id);
create index if not exists idx_mcr_church_type_phone on ministry_checkin_records(church_id, ministry_type, visitor_phone);
create index if not exists idx_mfl_church on ministry_followup_log(church_id);
create index if not exists idx_mfl_record on ministry_followup_log(record_id);

alter table ministry_checkin_sessions enable row level security;
alter table ministry_checkin_records enable row level security;
alter table ministry_followup_log enable row level security;
