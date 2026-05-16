-- =============================================================================
-- Replace hospitals + facility_registrations → single public.clinics table
-- Run in Supabase SQL Editor (DESTRUCTIVE: drops old clinic tables).
-- Safe to re-run: drops old policies before dropping columns.
-- =============================================================================

-- 1) Remove old tables
drop table if exists public.facility_registrations cascade;
drop table if exists public.hospitals cascade;
drop table if exists public.clinics cascade;

-- 2) Drop RLS policies that still reference old column names (must run BEFORE drop column)
drop policy if exists bookings_select_facility on public.bookings;
drop policy if exists bookings_insert_facility on public.bookings;
drop policy if exists bookings_update_facility on public.bookings;
drop policy if exists bookings_select_facility_patient_pending on public.bookings;
drop policy if exists bookings_select_facility_patient_active on public.bookings;
drop policy if exists bookings_update_facility_patient_pending on public.bookings;
drop policy if exists bookings_update_facility_patient_active on public.bookings;
drop policy if exists bookings_insert_patient_report on public.bookings;

drop policy if exists drivers_select_facility on public.drivers;

-- 3) Drop old FK columns, then add clinic columns
alter table public.bookings drop column if exists destination_facility;
alter table public.bookings drop column if exists assigned_hospital_id;
alter table public.bookings drop column if exists destination_clinic_id;
alter table public.bookings drop column if exists assigned_clinic_id;
alter table public.bookings drop column if exists patient_report_id;

alter table public.drivers drop column if exists base_hospital_id;
alter table public.drivers drop column if exists base_clinic_id;

-- 4) New clinics table
create table public.clinics (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  email text not null,
  auth_user_id uuid unique references auth.users (id) on delete set null,
  latitude double precision,
  longitude double precision,
  address text,
  specialty text default 'General',
  created_at timestamptz not null default now()
);

create unique index clinics_name_lower_idx on public.clinics (lower(name));
create unique index clinics_email_lower_idx on public.clinics (lower(email));

alter table public.drivers
  add column base_clinic_id uuid references public.clinics (id) on delete set null;

create index if not exists drivers_base_clinic_id_idx on public.drivers (base_clinic_id)
  where base_clinic_id is not null;

alter table public.bookings
  add column destination_clinic_id uuid references public.clinics (id) on delete set null,
  add column assigned_clinic_id uuid references public.clinics (id) on delete set null,
  add column patient_report_id uuid references public.patient_reports (id) on delete set null;

create index if not exists bookings_destination_clinic_id_idx on public.bookings (destination_clinic_id);
create index if not exists bookings_assigned_clinic_id_idx on public.bookings (assigned_clinic_id)
  where assigned_clinic_id is not null;
create index if not exists bookings_patient_report_id_idx on public.bookings (patient_report_id)
  where patient_report_id is not null;

-- 5) RLS for clinics
alter table public.clinics enable row level security;

drop policy if exists clinics_select_all on public.clinics;
create policy clinics_select_all on public.clinics
  for select to authenticated using (true);

drop policy if exists clinics_select_anon on public.clinics;
create policy clinics_select_anon on public.clinics
  for select to anon using (true);

drop policy if exists clinics_update_own on public.clinics;
create policy clinics_update_own on public.clinics
  for update to authenticated
  using (
    auth_user_id = auth.uid()
    or lower(email) = lower(coalesce(auth.jwt() ->> 'email', ''))
    or id::text = coalesce((auth.jwt() -> 'app_metadata' ->> 'clinic_id'), '')
    or id::text = coalesce((auth.jwt() -> 'app_metadata' ->> 'facility_hospital_id'), '')
  )
  with check (
    auth_user_id = auth.uid()
    or lower(email) = lower(coalesce(auth.jwt() ->> 'email', ''))
    or id::text = coalesce((auth.jwt() -> 'app_metadata' ->> 'clinic_id'), '')
    or id::text = coalesce((auth.jwt() -> 'app_metadata' ->> 'facility_hospital_id'), '')
  );

-- 6) RLS for drivers / bookings (clinic_id in JWT; supports legacy facility_hospital_id in metadata)
drop policy if exists drivers_select_facility on public.drivers;
create policy drivers_select_facility on public.drivers
  for select to authenticated using (
    coalesce(auth.jwt() -> 'app_metadata' ->> 'clinic_access', auth.jwt() -> 'app_metadata' ->> 'facility_access') = 'approved'
    and base_clinic_id is not null
    and base_clinic_id::text = coalesce(
      auth.jwt() -> 'app_metadata' ->> 'clinic_id',
      auth.jwt() -> 'app_metadata' ->> 'facility_hospital_id',
      ''
    )
  );

drop policy if exists bookings_select_facility on public.bookings;
create policy bookings_select_facility on public.bookings
  for select to authenticated using (
    coalesce(auth.jwt() -> 'app_metadata' ->> 'clinic_access', auth.jwt() -> 'app_metadata' ->> 'facility_access') = 'approved'
    and (
      destination_clinic_id::text = coalesce(
        auth.jwt() -> 'app_metadata' ->> 'clinic_id',
        auth.jwt() -> 'app_metadata' ->> 'facility_hospital_id',
        ''
      )
      or assigned_clinic_id::text = coalesce(
        auth.jwt() -> 'app_metadata' ->> 'clinic_id',
        auth.jwt() -> 'app_metadata' ->> 'facility_hospital_id',
        ''
      )
      or exists (
        select 1 from public.drivers d
        where d.id = bookings.driver_id
          and d.base_clinic_id::text = coalesce(
            auth.jwt() -> 'app_metadata' ->> 'clinic_id',
            auth.jwt() -> 'app_metadata' ->> 'facility_hospital_id',
            ''
          )
      )
    )
  );

drop policy if exists bookings_insert_facility on public.bookings;
create policy bookings_insert_facility on public.bookings
  for insert to authenticated with check (
    coalesce(auth.jwt() -> 'app_metadata' ->> 'clinic_access', auth.jwt() -> 'app_metadata' ->> 'facility_access') = 'approved'
    and (
      driver_id is null
      or exists (
        select 1 from public.drivers d
        where d.id = driver_id
          and d.base_clinic_id::text = coalesce(
            auth.jwt() -> 'app_metadata' ->> 'clinic_id',
            auth.jwt() -> 'app_metadata' ->> 'facility_hospital_id',
            ''
          )
      )
    )
  );

drop policy if exists bookings_update_facility on public.bookings;
create policy bookings_update_facility on public.bookings
  for update to authenticated using (
    coalesce(auth.jwt() -> 'app_metadata' ->> 'clinic_access', auth.jwt() -> 'app_metadata' ->> 'facility_access') = 'approved'
    and (
      destination_clinic_id::text = coalesce(
        auth.jwt() -> 'app_metadata' ->> 'clinic_id',
        auth.jwt() -> 'app_metadata' ->> 'facility_hospital_id',
        ''
      )
      or assigned_clinic_id::text = coalesce(
        auth.jwt() -> 'app_metadata' ->> 'clinic_id',
        auth.jwt() -> 'app_metadata' ->> 'facility_hospital_id',
        ''
      )
      or exists (
        select 1 from public.drivers d
        where d.id = bookings.driver_id
          and d.base_clinic_id::text = coalesce(
            auth.jwt() -> 'app_metadata' ->> 'clinic_id',
            auth.jwt() -> 'app_metadata' ->> 'facility_hospital_id',
            ''
          )
      )
    )
  ) with check (
    coalesce(auth.jwt() -> 'app_metadata' ->> 'clinic_access', auth.jwt() -> 'app_metadata' ->> 'facility_access') = 'approved'
  );

drop policy if exists bookings_insert_patient_report on public.bookings;
create policy bookings_insert_patient_report on public.bookings
  for insert to authenticated with check (
    status = 'Pending'
    and driver_id is null
    and patient_report_id is not null
    and exists (
      select 1 from public.patient_reports pr
      where pr.id = patient_report_id and pr.reporter_user_id = auth.uid()
    )
  );

drop policy if exists bookings_select_facility_patient_pending on public.bookings;
drop policy if exists bookings_select_facility_patient_active on public.bookings;
create policy bookings_select_facility_patient_active on public.bookings
  for select to authenticated using (
    coalesce(auth.jwt() -> 'app_metadata' ->> 'clinic_access', auth.jwt() -> 'app_metadata' ->> 'facility_access') = 'approved'
    and patient_report_id is not null
    and status in ('Pending', 'Assigned', 'Accepted', 'En Route', 'Picked Up')
    and (
      assigned_clinic_id is null
      or assigned_clinic_id::text = coalesce(
        auth.jwt() -> 'app_metadata' ->> 'clinic_id',
        auth.jwt() -> 'app_metadata' ->> 'facility_hospital_id',
        ''
      )
    )
  );

drop policy if exists bookings_update_facility_patient_pending on public.bookings;
drop policy if exists bookings_update_facility_patient_active on public.bookings;
create policy bookings_update_facility_patient_active on public.bookings
  for update to authenticated using (
    coalesce(auth.jwt() -> 'app_metadata' ->> 'clinic_access', auth.jwt() -> 'app_metadata' ->> 'facility_access') = 'approved'
    and patient_report_id is not null
    and status in ('Pending', 'Assigned', 'Accepted', 'En Route', 'Picked Up')
    and (
      assigned_clinic_id is null
      or assigned_clinic_id::text = coalesce(
        auth.jwt() -> 'app_metadata' ->> 'clinic_id',
        auth.jwt() -> 'app_metadata' ->> 'facility_hospital_id',
        ''
      )
    )
  ) with check (
    coalesce(auth.jwt() -> 'app_metadata' ->> 'clinic_access', auth.jwt() -> 'app_metadata' ->> 'facility_access') = 'approved'
    and status in ('Pending', 'Assigned', 'Accepted', 'En Route', 'Picked Up')
  );

drop policy if exists patient_reports_select_facility on public.patient_reports;
create policy patient_reports_select_facility on public.patient_reports
  for select to authenticated
  using (
    coalesce(auth.jwt() -> 'app_metadata' ->> 'clinic_access', auth.jwt() -> 'app_metadata' ->> 'facility_access') = 'approved'
  );

drop policy if exists patient_reports_update_facility on public.patient_reports;
create policy patient_reports_update_facility on public.patient_reports
  for update to authenticated
  using (
    coalesce(auth.jwt() -> 'app_metadata' ->> 'clinic_access', auth.jwt() -> 'app_metadata' ->> 'facility_access') = 'approved'
  )
  with check (
    coalesce(auth.jwt() -> 'app_metadata' ->> 'clinic_access', auth.jwt() -> 'app_metadata' ->> 'facility_access') = 'approved'
  );

-- 7) Realtime (ignore error if already added)
do $$
begin
  alter publication supabase_realtime add table public.clinics;
exception
  when duplicate_object then null;
end $$;
