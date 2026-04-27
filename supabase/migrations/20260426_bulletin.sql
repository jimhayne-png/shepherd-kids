-- Digital Bulletins
create table if not exists bulletins (
  id uuid primary key default gen_random_uuid(),
  church_id uuid not null,
  service_date date not null,
  title text not null,
  status text not null default 'draft' check (status in ('draft','published')),
  access_token text unique not null default encode(gen_random_bytes(16), 'hex'),
  uploaded_bulletin_url text,
  sent_at timestamptz,
  created_by uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Bulletin Sections (ordered content blocks)
create table if not exists bulletin_sections (
  id uuid primary key default gen_random_uuid(),
  church_id uuid not null,
  bulletin_id uuid not null,
  section_type text not null check (section_type in (
    'order_of_service','sermon','scripture','announcement',
    'giving','prayer','song','reading','custom'
  )),
  title text not null,
  content text,
  sort_order int not null default 0,
  is_visible boolean not null default true,
  created_at timestamptz not null default now()
);

-- Bulletin Announcements (individual announcement items)
create table if not exists bulletin_announcements (
  id uuid primary key default gen_random_uuid(),
  church_id uuid not null,
  bulletin_id uuid not null,
  title text not null,
  body text,
  link_url text,
  link_label text,
  sort_order int not null default 0,
  is_visible boolean not null default true,
  created_at timestamptz not null default now()
);

-- Indexes
create index if not exists idx_bulletins_church on bulletins(church_id);
create index if not exists idx_bulletins_date on bulletins(service_date desc);
create index if not exists idx_bulletins_token on bulletins(access_token);
create index if not exists idx_bulletin_sections_bulletin on bulletin_sections(bulletin_id);
create index if not exists idx_bulletin_sections_church on bulletin_sections(church_id);
create index if not exists idx_bulletin_announcements_bulletin on bulletin_announcements(bulletin_id);
create index if not exists idx_bulletin_announcements_church on bulletin_announcements(church_id);

-- RLS (service role bypasses; policies added per module)
alter table bulletins enable row level security;
alter table bulletin_sections enable row level security;
alter table bulletin_announcements enable row level security;
