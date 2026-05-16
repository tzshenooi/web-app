-- Let clinic staff and assigned drivers read patient report attachments in Storage.
-- Paths: patient-reports / {reporter_user_id} / {report_id} / …
-- Run after patient_reports.sql, fix_bookings_rls_recursion.sql, and fix_patient_reports_rls_recursion.sql.

drop policy if exists storage_patient_reports_rw on storage.objects;

drop policy if exists storage_patient_reports_insert_own on storage.objects;
create policy storage_patient_reports_insert_own on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'patient-reports'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists storage_patient_reports_select_own on storage.objects;
create policy storage_patient_reports_select_own on storage.objects
  for select to authenticated
  using (
    bucket_id = 'patient-reports'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists storage_patient_reports_select_clinic on storage.objects;
create policy storage_patient_reports_select_clinic on storage.objects
  for select to authenticated
  using (
    bucket_id = 'patient-reports'
    and (
      public.rls_clinic_access_approved()
      or coalesce(
        auth.jwt() -> 'app_metadata' ->> 'clinic_access',
        auth.jwt() -> 'app_metadata' ->> 'facility_access'
      ) = 'approved'
    )
    and public.rls_patient_report_exists(((storage.foldername(name))[2])::uuid)
  );

drop policy if exists storage_patient_reports_select_driver on storage.objects;
create policy storage_patient_reports_select_driver on storage.objects
  for select to authenticated
  using (
    bucket_id = 'patient-reports'
    and exists (
      select 1
      from public.bookings b
      where b.patient_report_id::text = (storage.foldername(name))[2]
        and b.driver_id = auth.uid()
    )
  );

drop policy if exists patient_reports_select_driver_assigned on public.patient_reports;
create policy patient_reports_select_driver_assigned on public.patient_reports
  for select to authenticated
  using (public.rls_driver_assigned_to_report(id));
