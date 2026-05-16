-- Auto-create public.drivers when an Auth user is created with role = driver.
-- Run once in Supabase SQL Editor (safe to re-run).

create or replace function public.handle_auth_user_driver()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  meta_role text;
  clinic uuid;
  display_name text;
begin
  meta_role := coalesce(
    new.raw_app_meta_data->>'role',
    new.raw_user_meta_data->>'role'
  );
  if meta_role is distinct from 'driver' then
    return new;
  end if;

  clinic := null;
  if coalesce(new.raw_app_meta_data->>'base_clinic_id', '') ~* '^[0-9a-f-]{36}$' then
    clinic := (new.raw_app_meta_data->>'base_clinic_id')::uuid;
  end if;

  display_name := coalesce(
    nullif(trim(new.raw_user_meta_data->>'name'), ''),
    nullif(split_part(coalesce(new.email, ''), '@', 1), ''),
    'Driver'
  );

  insert into public.drivers (id, name, email, status, base_clinic_id)
  values (new.id, display_name, new.email, 'Offline', clinic)
  on conflict (id) do update
  set
    email = coalesce(excluded.email, public.drivers.email),
    name = coalesce(nullif(excluded.name, ''), public.drivers.name),
    base_clinic_id = coalesce(excluded.base_clinic_id, public.drivers.base_clinic_id);

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row
  execute function public.handle_auth_user_driver();

-- One-time backfill for auth users already created as drivers
insert into public.drivers (id, name, email, status, base_clinic_id)
select
  u.id,
  coalesce(nullif(trim(u.raw_user_meta_data->>'name'), ''), split_part(coalesce(u.email, ''), '@', 1), 'Driver'),
  u.email,
  'Offline',
  case
    when coalesce(u.raw_app_meta_data->>'base_clinic_id', '') ~* '^[0-9a-f-]{36}$'
    then (u.raw_app_meta_data->>'base_clinic_id')::uuid
    else null
  end
from auth.users u
left join public.drivers d on d.id = u.id
where d.id is null
  and coalesce(u.raw_app_meta_data->>'role', u.raw_user_meta_data->>'role') = 'driver'
on conflict (id) do nothing;
