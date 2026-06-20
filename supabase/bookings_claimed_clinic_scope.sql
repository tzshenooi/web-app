-- Stop broadcasting patient-report missions to every clinic once a driver is dispatched.
-- Run once in Supabase SQL Editor (safe to re-run).

-- Backfill: tie orphan dispatches to the driver's home clinic.
update public.bookings b
set assigned_clinic_id = d.base_clinic_id
from public.drivers d
where b.driver_id = d.id
  and b.patient_report_id is not null
  and b.assigned_clinic_id is null
  and d.base_clinic_id is not null;

drop policy if exists bookings_select_facility_patient_active on public.bookings;
drop policy if exists bookings_update_facility_patient_active on public.bookings;

create policy bookings_select_facility_patient_active on public.bookings
  for select to authenticated using (
    public.rls_clinic_access_approved()
    and patient_report_id is not null
    and status in ('Pending', 'Assigned', 'Accepted', 'En Route', 'Picked Up')
    and (
      (
        assigned_clinic_id is null
        and driver_id is null
      )
      or assigned_clinic_id::text = public.rls_session_clinic_id()
      or (
        assigned_clinic_id is null
        and driver_id is not null
        and public.rls_driver_belongs_to_clinic(driver_id, public.rls_session_clinic_id())
      )
    )
  );

create policy bookings_update_facility_patient_active on public.bookings
  for update to authenticated using (
    public.rls_clinic_access_approved()
    and patient_report_id is not null
    and status in ('Pending', 'Assigned', 'Accepted', 'En Route', 'Picked Up')
    and (
      (
        assigned_clinic_id is null
        and driver_id is null
      )
      or assigned_clinic_id::text = public.rls_session_clinic_id()
      or (
        assigned_clinic_id is null
        and driver_id is not null
        and public.rls_driver_belongs_to_clinic(driver_id, public.rls_session_clinic_id())
      )
    )
  ) with check (
    public.rls_clinic_access_approved()
    and status in ('Pending', 'Assigned', 'Accepted', 'En Route', 'Picked Up', 'Completed')
    and assigned_clinic_id::text = public.rls_session_clinic_id()
  );
