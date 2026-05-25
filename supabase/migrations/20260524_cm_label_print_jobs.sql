-- Label print job queue for kiosk check-in.
-- Rows are inserted after each successful cm_checkin_records insert.
-- A separate print station polls for status = 'pending' rows.

create table if not exists cm_label_print_jobs (
  id                  uuid        primary key default gen_random_uuid(),
  church_id           text        not null,
  session_id          text        not null,
  checkin_record_id   uuid        not null,
  child_name          text        not null,
  parent_name         text        not null,
  parent_phone        text,
  room_id             text,
  security_code       text        not null,
  allergies           text,
  medical_notes       text,
  special_instructions text,
  label_type          text        not null default 'child',
  status              text        not null default 'pending'
                        check (status in ('pending', 'printed', 'cancelled')),
  created_at          timestamptz not null default now(),
  printed_at          timestamptz
);

create index if not exists idx_cm_label_jobs_session on cm_label_print_jobs(session_id);
create index if not exists idx_cm_label_jobs_church  on cm_label_print_jobs(church_id);
create index if not exists idx_cm_label_jobs_status  on cm_label_print_jobs(status);

alter table cm_label_print_jobs enable row level security;
