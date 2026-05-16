-- Clinic portal can list drivers when logged in via clinic row (email / auth_user_id),
-- not only when JWT app_metadata.clinic_id is set.
-- Run once in Supabase SQL Editor (safe to re-run).

drop policy if exists drivers_select_facility on public.drivers;

create policy drivers_select_facility on public.drivers
  for select to authenticated
  using (
    coalesce(
      auth.jwt() -> 'app_metadata' ->> 'clinic_access',
      auth.jwt() -> 'app_metadata' ->> 'facility_access'
    ) = 'approved'
    and base_clinic_id is not null
    and (
      base_clinic_id::text = coalesce(
        auth.jwt() -> 'app_metadata' ->> 'clinic_id',
        auth.jwt() -> 'app_metadata' ->> 'facility_hospital_id',
        ''
      )
      or exists (
        select 1
        from public.clinics c
        where c.id = drivers.base_clinic_id
          and (
            c.auth_user_id = auth.uid()
            or lower(c.email) = lower(coalesce(auth.jwt() ->> 'email', ''))
          )
      )
    )
  );
