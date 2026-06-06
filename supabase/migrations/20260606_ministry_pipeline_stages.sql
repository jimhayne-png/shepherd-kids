create table if not exists ministry_pipeline_stages (
  id            uuid        primary key default gen_random_uuid(),
  church_id     uuid        not null references churches(id) on delete cascade,
  ministry_type text        not null,
  stage_key     text        not null,
  name          text        not null,
  description   text,
  color         text,
  display_order integer     not null default 0,
  is_active     boolean     not null default true,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  unique (church_id, ministry_type, stage_key)
);

create index if not exists ministry_pipeline_stages_lookup
  on ministry_pipeline_stages (church_id, ministry_type, display_order);
