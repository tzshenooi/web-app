-- Let approved clinic users update clinical columns on patient_reports
-- when the clinic portal saves the linked booking record.
-- Run once in Supabase SQL Editor (safe to re-run).

drop policy if exists patient_reports_update_facility on public.patient_reports;
create policy patient_reports_update_facility on public.patient_reports
  for update to authenticated
  using (
    coalesce(auth.jwt() -> 'app_metadata' ->> 'clinic_access', auth.jwt() -> 'app_metadata' ->> 'facility_access') = 'approved'
  )
  with check (
    coalesce(auth.jwt() -> 'app_metadata' ->> 'clinic_access', auth.jwt() -> 'app_metadata' ->> 'facility_access') = 'approved'
  );
