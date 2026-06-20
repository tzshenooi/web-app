-- Keep patient-report missions visible/editable on clinic Incoming until Completed.
-- Unclaimed reports are broadcast; once a driver is dispatched, only that clinic sees them.
-- Run once in Supabase SQL Editor (safe to re-run).

update public.bookings b
set assigned_clinic_id = d.base_clinic_id
from public.drivers d
where b.driver_id = d.id
  and b.patient_report_id is not null
  and b.assigned_clinic_id is null
  and d.base_clinic_id is not null;

drop policy if exists bookings_select_facility_patient_pending on public.bookings;
drop policy if exists bookings_update_facility_patient_pending on public.bookings;
drop policy if exists bookings_select_facility_patient_active on public.bookings;
drop policy if exists bookings_update_facility_patient_active on public.bookings;

create policy bookings_select_facility_patient_active on public.bookings
  for select to authenticated using (
    coalesce(auth.jwt() -> 'app_metadata' ->> 'clinic_access', auth.jwt() -> 'app_metadata' ->> 'facility_access') = 'approved'
    and patient_report_id is not null
    and status in ('Pending', 'Assigned', 'Accepted', 'En Route', 'Picked Up')
    and (
      (
        assigned_clinic_id is null
        and driver_id is null
      )
      or assigned_clinic_id::text = coalesce(
        auth.jwt() -> 'app_metadata' ->> 'clinic_id',
        auth.jwt() -> 'app_metadata' ->> 'facility_hospital_id',
        ''
      )
      or (
        assigned_clinic_id is null
        and driver_id is not null
        and exists (
          select 1 from public.drivers d
          where d.id = driver_id
            and d.base_clinic_id::text = coalesce(
              auth.jwt() -> 'app_metadata' ->> 'clinic_id',
              auth.jwt() -> 'app_metadata' ->> 'facility_hospital_id',
              ''
            )
        )
      )
    )
  );

create policy bookings_update_facility_patient_active on public.bookings
  for update to authenticated using (
    coalesce(auth.jwt() -> 'app_metadata' ->> 'clinic_access', auth.jwt() -> 'app_metadata' ->> 'facility_access') = 'approved'
    and patient_report_id is not null
    and status in ('Pending', 'Assigned', 'Accepted', 'En Route', 'Picked Up')
    and (
      (
        assigned_clinic_id is null
        and driver_id is null
      )
      or assigned_clinic_id::text = coalesce(
        auth.jwt() -> 'app_metadata' ->> 'clinic_id',
        auth.jwt() -> 'app_metadata' ->> 'facility_hospital_id',
        ''
      )
      or (
        assigned_clinic_id is null
        and driver_id is not null
        and exists (
          select 1 from public.drivers d
          where d.id = driver_id
            and d.base_clinic_id::text = coalesce(
              auth.jwt() -> 'app_metadata' ->> 'clinic_id',
              auth.jwt() -> 'app_metadata' ->> 'facility_hospital_id',
              ''
            )
        )
      )
    )
  ) with check (
    coalesce(auth.jwt() -> 'app_metadata' ->> 'clinic_access', auth.jwt() -> 'app_metadata' ->> 'facility_access') = 'approved'
    and status in ('Pending', 'Assigned', 'Accepted', 'En Route', 'Picked Up', 'Completed')
    and assigned_clinic_id::text = coalesce(
      auth.jwt() -> 'app_metadata' ->> 'clinic_id',
      auth.jwt() -> 'app_metadata' ->> 'facility_hospital_id',
      ''
    )
  );
