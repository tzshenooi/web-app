-- Allow clinic users to read completed bookings for the Records archive.
-- Run once if completed missions do not appear (safe to re-run).

drop policy if exists bookings_select_facility_completed on public.bookings;
create policy bookings_select_facility_completed on public.bookings
  for select to authenticated using (
    coalesce(auth.jwt() -> 'app_metadata' ->> 'clinic_access', auth.jwt() -> 'app_metadata' ->> 'facility_access') = 'approved'
    and status = 'Completed'
    and (
      assigned_clinic_id::text = coalesce(
        auth.jwt() -> 'app_metadata' ->> 'clinic_id',
        auth.jwt() -> 'app_metadata' ->> 'facility_hospital_id',
        ''
      )
      or destination_clinic_id::text = coalesce(
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
