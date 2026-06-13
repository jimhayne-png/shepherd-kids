alter table cm_checkin_sessions
  add column if not exists auto_followup boolean not null default false;
