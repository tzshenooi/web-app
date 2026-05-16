-- Keep patient-report missions visible/editable on clinic Incoming until Completed.
-- Run once in Supabase SQL Editor (safe to re-run).

drop policy if exists bookings_select_facility_patient_pending on public.bookings;
drop policy if exists bookings_update_facility_patient_pending on public.bookings;

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
