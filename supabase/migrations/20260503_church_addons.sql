create table if not exists church_addons (
  id                     uuid        primary key default gen_random_uuid(),
  church_id              text        not null,
  addon_key              text        not null,
  active                 boolean     not null default true,
  stripe_subscription_id text,
  created_at             timestamptz not null default now(),
  unique (church_id, addon_key)
);

alter table church_addons enable row level security;

-- Seed ministry_pro for gratefulconsultinggroup@gmail.com
do $$
declare
  v_user_id  uuid;
  v_church_id text;
begin
  select id into v_user_id
  from auth.users
  where email = 'gratefulconsultinggroup@gmail.com';

  if v_user_id is not null then
    select church_id into v_church_id
    from church_users
    where user_id = v_user_id
    limit 1;

    if v_church_id is not null then
      insert into church_addons (church_id, addon_key, active)
      values (v_church_id, 'ministry_pro', true)
      on conflict (church_id, addon_key) do nothing;
    end if;
  end if;
end $$;
