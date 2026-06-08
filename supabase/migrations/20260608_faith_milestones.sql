-- Faith Milestones
-- Supports both member-scoped (adult Faith Journey) and child-scoped (Children's Ministry) milestones.
-- Exactly one of member_id / child_id must be set per row (enforced by CHECK constraint).

create table if not exists faith_milestones (
  id           uuid primary key default gen_random_uuid(),
  church_id    uuid not null,
  member_id    uuid null,
  child_id     uuid null,
  milestone_type text not null,
  is_completed boolean not null default false,
  completed_at date null,
  notes        text null,
  is_private   boolean not null default false,
  created_by   uuid null,
  created_at   timestamptz not null default now()
);

-- If the table already existed without child_id, add the column
alter table faith_milestones add column if not exists child_id uuid null;

-- If the table already existed with member_id not null, make it nullable
alter table faith_milestones alter column member_id drop not null;

-- FK: child_id → cm_visitor_children (cascade deletes)
do $$ begin
  alter table faith_milestones
    add constraint faith_milestones_child_fk
    foreign key (child_id) references cm_visitor_children(id) on delete cascade;
exception when duplicate_object then null;
end $$;

-- Exactly one subject per row
do $$ begin
  alter table faith_milestones
    add constraint faith_milestones_one_subject
    check ((member_id is not null)::int + (child_id is not null)::int = 1);
exception when duplicate_object then null;
end $$;

-- Custom Milestones (per-church milestone templates)
create table if not exists custom_milestones (
  id         uuid primary key default gen_random_uuid(),
  church_id  uuid not null,
  name       text not null,
  icon       text null,
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);

-- Indexes
create index if not exists idx_faith_milestones_church       on faith_milestones(church_id);
create index if not exists idx_faith_milestones_member       on faith_milestones(member_id) where member_id is not null;
create index if not exists idx_faith_milestones_child        on faith_milestones(child_id)  where child_id  is not null;
create index if not exists idx_faith_milestones_type         on faith_milestones(milestone_type);
create index if not exists idx_faith_milestones_completed_at on faith_milestones(completed_at) where is_completed = true;
create index if not exists idx_custom_milestones_church      on custom_milestones(church_id);

-- RLS (service role bypasses; add policies per module as needed)
alter table faith_milestones  enable row level security;
alter table custom_milestones enable row level security;
