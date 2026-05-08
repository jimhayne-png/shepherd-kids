-- Children's Ministry kiosk — new visitor follow-up

create table if not exists cm_followup_log (
  id uuid primary key default gen_random_uuid(),
  church_id text not null,
  session_id text not null,
  record_id text not null,
  parent_email text,
  parent_name text,
  child_names text[] not null default '{}',
  follow_up_type text not null check (follow_up_type in ('email', 'letter', 'both', 'skip')),
  status text not null default 'pending' check (status in ('pending', 'sent', 'skipped')),
  personalized_message text,
  auto_send boolean not null default false,
  created_at timestamptz not null default now(),
  sent_at timestamptz
);

create index if not exists idx_cm_followup_log_church on cm_followup_log(church_id);
create index if not exists idx_cm_followup_log_session on cm_followup_log(session_id);
create index if not exists idx_cm_followup_log_record on cm_followup_log(record_id);

alter table cm_followup_log enable row level security;

-- Add auto-followup flag to sessions
alter table cm_checkin_sessions add column if not exists auto_followup boolean not null default false;
