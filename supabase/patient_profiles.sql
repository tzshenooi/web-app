-- Patient home address for "House / home" discharge routing.
-- Run once in Supabase SQL Editor (safe to re-run).

create table if not exists public.patient_profiles (
  user_id uuid primary key references auth.users (id) on delete cascade,
  home_address text,
  home_latitude double precision,
  home_longitude double precision,
  updated_at timestamptz not null default now()
);

comment on table public.patient_profiles is 'Patient app profile — home address used when clinic dispatches to house/home.';
comment on column public.patient_profiles.home_address is 'Human-readable home address line.';
comment on column public.patient_profiles.home_latitude is 'Home pin latitude for driver navigation.';
comment on column public.patient_profiles.home_longitude is 'Home pin longitude for driver navigation.';

alter table public.patient_profiles enable row level security;

drop policy if exists patient_profiles_select_own on public.patient_profiles;
create policy patient_profiles_select_own on public.patient_profiles
  for select to authenticated
  using (user_id = auth.uid());

drop policy if exists patient_profiles_insert_own on public.patient_profiles;
create policy patient_profiles_insert_own on public.patient_profiles
  for insert to authenticated
  with check (user_id = auth.uid());

drop policy if exists patient_profiles_update_own on public.patient_profiles;
create policy patient_profiles_update_own on public.patient_profiles
  for update to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- Clinic portal: read home for patients who submitted reports.
drop policy if exists patient_profiles_select_facility on public.patient_profiles;
create policy patient_profiles_select_facility on public.patient_profiles
  for select to authenticated
  using (
    coalesce(auth.jwt() -> 'app_metadata' ->> 'clinic_access', auth.jwt() -> 'app_metadata' ->> 'facility_access') = 'approved'
    and exists (
      select 1
      from public.patient_reports pr
      where pr.reporter_user_id = patient_profiles.user_id
    )
  );
