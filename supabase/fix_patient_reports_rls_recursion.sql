-- Fix: infinite recursion detected in policy for relation "patient_reports"
-- Cause: patient_reports_select_driver_assigned subqueries bookings;
--        bookings_select_patient_own_report subqueries patient_reports (cycle on INSERT … RETURNING).
-- Run once in Supabase SQL Editor (safe to re-run).
-- Prerequisite: fix_bookings_rls_recursion.sql (optional but recommended).

-- ---------------------------------------------------------------------------
-- Helpers (SECURITY DEFINER = no RLS recursion on cross-table checks)
-- ---------------------------------------------------------------------------
create or replace function public.rls_patient_owns_report(p_report_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.patient_reports pr
    where pr.id = p_report_id
      and pr.reporter_user_id = auth.uid()
  );
$$;

create or replace function public.rls_driver_assigned_to_report(p_report_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.bookings b
    where b.patient_report_id = p_report_id
      and b.driver_id = auth.uid()
  );
$$;

create or replace function public.rls_patient_report_exists(p_report_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.patient_reports pr
    where pr.id = p_report_id
  );
$$;

grant execute on function public.rls_patient_owns_report(uuid) to authenticated;
grant execute on function public.rls_driver_assigned_to_report(uuid) to authenticated;
grant execute on function public.rls_patient_report_exists(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- Bookings: patient reads own mission (no subquery on patient_reports under RLS)
-- ---------------------------------------------------------------------------
drop policy if exists bookings_select_patient_own_report on public.bookings;
create policy bookings_select_patient_own_report on public.bookings
  for select to authenticated
  using (
    patient_report_id is not null
    and public.rls_patient_owns_report(patient_report_id)
  );

-- ---------------------------------------------------------------------------
-- patient_reports: driver reads report linked to their booking
-- ---------------------------------------------------------------------------
drop policy if exists patient_reports_select_driver_assigned on public.patient_reports;
create policy patient_reports_select_driver_assigned on public.patient_reports
  for select to authenticated
  using (public.rls_driver_assigned_to_report(id));

-- ---------------------------------------------------------------------------
-- Storage: clinic read path (avoid patient_reports RLS in policy)
-- ---------------------------------------------------------------------------
drop policy if exists storage_patient_reports_select_clinic on storage.objects;
create policy storage_patient_reports_select_clinic on storage.objects
  for select to authenticated
  using (
    bucket_id = 'patient-reports'
    and coalesce(
      auth.jwt() -> 'app_metadata' ->> 'clinic_access',
      auth.jwt() -> 'app_metadata' ->> 'facility_access'
    ) = 'approved'
    and public.rls_patient_report_exists(((storage.foldername(name))[2])::uuid)
  );
