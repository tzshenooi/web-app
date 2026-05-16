-- Patient app: read own mission bookings + assigned driver GPS for live ETA.
-- Run fix_bookings_rls_recursion.sql and fix_patient_reports_rls_recursion.sql first.
-- Then run this file (safe to re-run).

drop policy if exists bookings_select_patient_own_report on public.bookings;
drop policy if exists drivers_select_patient_assigned on public.drivers;

create policy bookings_select_patient_own_report on public.bookings
  for select to authenticated
  using (
    patient_report_id is not null
    and public.rls_patient_owns_report(patient_report_id)
  );

-- Use security definer helper to avoid bookings ↔ drivers RLS recursion (see fix_bookings_rls_recursion.sql).
drop policy if exists drivers_select_patient_assigned on public.drivers;
create policy drivers_select_patient_assigned on public.drivers
  for select to authenticated
  using (public.rls_patient_can_view_driver(id));
