-- =============================================================================
-- Patient incident reports (Flutter patient flow)
-- Run in Supabase Dashboard → SQL Editor (safe to re-run; uses IF NOT EXISTS)
-- Then run fix_patient_reports_rls_recursion.sql (fixes Submit / INSERT … RETURNING).
-- Then patient_reports_booking_link.sql so clinic Incoming + dispatch work.
-- =============================================================================

create table if not exists public.patient_reports (
  id uuid primary key default gen_random_uuid(),
  reporter_user_id uuid not null references auth.users (id) on delete cascade,
  reporter_name text,
  reporter_phone text,
  latitude double precision not null,
  longitude double precision not null,
  location_label text,
  incident_category text not null,
  details text not null,
  status text not null default 'submitted',
  patient_id text,
  destination_type text,
  hospital_name text,
  created_at timestamptz not null default now()
);

create index if not exists patient_reports_reporter_user_id_idx
  on public.patient_reports (reporter_user_id);

create index if not exists patient_reports_created_at_idx
  on public.patient_reports (created_at desc);

comment on table public.patient_reports is 'Patient-submitted incidents from mobile app (Report Incident screen)';

alter table public.patient_reports enable row level security;

drop policy if exists patient_reports_insert_own on public.patient_reports;
create policy patient_reports_insert_own on public.patient_reports
  for insert to authenticated
  with check (reporter_user_id = auth.uid());

drop policy if exists patient_reports_select_own on public.patient_reports;
create policy patient_reports_select_own on public.patient_reports
  for select to authenticated
  using (reporter_user_id = auth.uid());

-- Optional: clinic dispatch reads all submitted reports (service_role bypasses RLS anyway).
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

-- Storage for voice/photo attachments (upload path: {user_id}/{report_id}/...)
insert into storage.buckets (id, name, public, file_size_limit)
values ('patient-reports', 'patient-reports', false, 5242880)
on conflict (id) do update
set name = excluded.name,
    public = excluded.public,
    file_size_limit = excluded.file_size_limit;

drop policy if exists storage_patient_reports_rw on storage.objects;
create policy storage_patient_reports_rw on storage.objects
  for all to authenticated
  using (
    bucket_id = 'patient-reports'
    and (storage.foldername(name))[1] = auth.uid()::text
  )
  with check (
    bucket_id = 'patient-reports'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
