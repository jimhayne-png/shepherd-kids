-- Child-level Ministry Care Notes: distinct from household-level
-- cm_family_care_notes. Kept in its own table rather than as a column on
-- cm_visitor_children, since that table is returned via select('*') from
-- kiosk, classroom, and Annual Family Safety Review routes.

create table if not exists cm_child_care_notes (
  id uuid primary key default gen_random_uuid(),
  church_id uuid not null,
  child_id uuid not null,
  note_text text not null,
  created_by uuid not null,
  created_by_name text,
  created_at timestamptz not null default now(),
  updated_at timestamptz,
  archived_at timestamptz,
  archived_by uuid
);

create index if not exists idx_cm_child_care_notes_child on cm_child_care_notes(child_id);
create index if not exists idx_cm_child_care_notes_church on cm_child_care_notes(church_id);

alter table cm_child_care_notes enable row level security;
