-- Ensure members table has birthday/anniversary columns (likely already exist)
alter table members add column if not exists birthdate date;
alter table members add column if not exists anniversary date;

-- Birthday & Anniversary Log: tracks notifications sent, prevents duplicates
create table if not exists birthday_anniversary_log (
  id uuid primary key default gen_random_uuid(),
  church_id uuid not null,
  member_id uuid not null,
  event_type text not null,           -- birthday | anniversary
  event_date date not null,           -- this year's occurrence (e.g. 2026-04-25)
  year int not null,                  -- calendar year of this occurrence
  is_milestone boolean not null default false,
  milestone_years int,                -- e.g. 50 (for 50th birthday)
  letter_generated_at timestamptz,
  pastor_notified_at timestamptz,
  created_at timestamptz default now(),
  unique(member_id, event_type, year) -- prevents duplicate sends per year
);

-- RLS
alter table birthday_anniversary_log enable row level security;

create policy "Church staff see their birthday logs"
  on birthday_anniversary_log for all
  using (church_id in (select church_id from church_users where user_id = auth.uid()));

-- Indexes
create index if not exists idx_bal_church on birthday_anniversary_log(church_id);
create index if not exists idx_bal_member on birthday_anniversary_log(member_id);
create index if not exists idx_bal_year on birthday_anniversary_log(church_id, year);
