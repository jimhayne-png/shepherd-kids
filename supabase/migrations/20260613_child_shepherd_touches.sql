-- Tracks three shepherd touches per first-time visiting child check-in record.
create table if not exists cm_child_shepherd_touches (
  id                    uuid        primary key default gen_random_uuid(),
  church_id             text        not null,
  record_id             text        not null,
  touch1_completed      boolean     not null default false,
  touch1_completed_at   timestamptz,
  touch2_completed      boolean     not null default false,
  touch2_completed_at   timestamptz,
  touch3_completed      boolean     not null default false,
  touch3_completed_at   timestamptz,
  created_at            timestamptz not null default now(),
  unique (church_id, record_id)
);

alter table cm_child_shepherd_touches enable row level security;

create policy "Church staff manage shepherd touches"
  on cm_child_shepherd_touches for all
  using (church_id in (select church_id::text from church_users where user_id = auth.uid()));

create index if not exists idx_cm_shepherd_touches_church on cm_child_shepherd_touches(church_id);
create index if not exists idx_cm_shepherd_touches_record on cm_child_shepherd_touches(record_id);
