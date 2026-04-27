-- First-Time Visitor Flow for Children's Ministry

-- Visitor families (parent/guardian info)
create table if not exists cm_visitor_families (
  id uuid primary key default gen_random_uuid(),
  church_id uuid not null,
  parent1_first_name text not null,
  parent1_last_name text not null,
  parent1_email text,
  parent1_phone text,
  parent2_first_name text,
  parent2_last_name text,
  parent2_email text,
  parent2_phone text,
  address text,
  how_did_you_hear text,
  visit_date date not null default current_date,
  follow_up_sent boolean not null default false,
  follow_up_sent_at timestamptz,
  next_day_sent boolean not null default false,
  next_day_sent_at timestamptz,
  notes text,
  status text not null default 'new' check (status in ('new','contacted','returning','converted')),
  created_at timestamptz not null default now()
);

-- Individual visitor children linked to a family
create table if not exists cm_visitor_children (
  id uuid primary key default gen_random_uuid(),
  church_id uuid not null,
  family_id uuid not null,
  first_name text not null,
  last_name text not null,
  date_of_birth date,
  grade text,
  allergies text,
  medical_notes text,
  special_instructions text,
  created_at timestamptz not null default now()
);

-- QR / check-in access tokens for the visitor flow kiosk
create table if not exists cm_visitor_checkin_tokens (
  id uuid primary key default gen_random_uuid(),
  church_id uuid not null,
  token text unique not null default md5(random()::text),
  label text not null default 'Check-In Point',
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

-- Indexes
create index if not exists idx_cm_vf_church on cm_visitor_families(church_id);
create index if not exists idx_cm_vf_date on cm_visitor_families(visit_date desc);
create index if not exists idx_cm_vf_status on cm_visitor_families(status);
create index if not exists idx_cm_vc_family on cm_visitor_children(family_id);
create index if not exists idx_cm_vc_church on cm_visitor_children(church_id);
create index if not exists idx_cm_token on cm_visitor_checkin_tokens(token);
create index if not exists idx_cm_token_church on cm_visitor_checkin_tokens(church_id);

-- RLS (service role bypasses; policies added per module)
alter table cm_visitor_families enable row level security;
alter table cm_visitor_children enable row level security;
alter table cm_visitor_checkin_tokens enable row level security;
