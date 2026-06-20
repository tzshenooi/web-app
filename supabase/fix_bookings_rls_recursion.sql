-- Fix: infinite recursion detected in policy for relation "bookings"
-- Cause: bookings policies subquery drivers, drivers_select_patient_assigned subqueries bookings.
-- Run once in Supabase SQL Editor (safe to re-run).

-- ---------------------------------------------------------------------------
-- Helpers (SECURITY DEFINER = no RLS recursion on cross-table checks)
-- ---------------------------------------------------------------------------
create or replace function public.rls_session_clinic_id()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    nullif(trim(auth.jwt() -> 'app_metadata' ->> 'clinic_id'), ''),
    nullif(trim(auth.jwt() -> 'app_metadata' ->> 'facility_hospital_id'), ''),
    (select c.id::text from public.clinics c where c.auth_user_id = auth.uid() limit 1),
    (
      select c.id::text
      from public.clinics c
      where lower(c.email) = lower(coalesce(auth.jwt() ->> 'email', ''))
      limit 1
    )
  );
$$;

create or replace function public.rls_clinic_access_approved()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    auth.jwt() -> 'app_metadata' ->> 'clinic_access',
    auth.jwt() -> 'app_metadata' ->> 'facility_access'
  ) = 'approved';
$$;

create or replace function public.rls_driver_belongs_to_clinic(p_driver_id uuid, p_clinic_id text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select
    p_driver_id is not null
    and p_clinic_id is not null
    and p_clinic_id <> ''
    and exists (
      select 1
      from public.drivers d
      where d.id = p_driver_id
        and d.base_clinic_id::text = p_clinic_id
    );
$$;

create or replace function public.rls_patient_can_view_driver(p_driver_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.bookings b
    inner join public.patient_reports pr on pr.id = b.patient_report_id
    where b.driver_id = p_driver_id
      and pr.reporter_user_id = auth.uid()
      and b.status in ('Pending', 'Assigned', 'Accepted', 'En Route', 'Picked Up')
  );
$$;

grant execute on function public.rls_session_clinic_id() to authenticated;
grant execute on function public.rls_clinic_access_approved() to authenticated;
grant execute on function public.rls_driver_belongs_to_clinic(uuid, text) to authenticated;
grant execute on function public.rls_patient_can_view_driver(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- Drivers: patient view (no subquery on bookings under RLS)
-- ---------------------------------------------------------------------------
drop policy if exists drivers_select_patient_assigned on public.drivers;
create policy drivers_select_patient_assigned on public.drivers
  for select to authenticated
  using (public.rls_patient_can_view_driver(id));

-- ---------------------------------------------------------------------------
-- Bookings: clinic policies (no subquery on drivers under RLS)
-- ---------------------------------------------------------------------------
drop policy if exists bookings_select_facility on public.bookings;
create policy bookings_select_facility on public.bookings
  for select to authenticated
  using (
    public.rls_clinic_access_approved()
    and (
      assigned_clinic_id::text = public.rls_session_clinic_id()
      or destination_clinic_id::text = public.rls_session_clinic_id()
      or public.rls_driver_belongs_to_clinic(driver_id, public.rls_session_clinic_id())
    )
  );

drop policy if exists bookings_insert_facility on public.bookings;
create policy bookings_insert_facility on public.bookings
  for insert to authenticated
  with check (
    public.rls_clinic_access_approved()
    and (
      driver_id is null
      or public.rls_driver_belongs_to_clinic(driver_id, public.rls_session_clinic_id())
    )
  );

drop policy if exists bookings_update_facility on public.bookings;
create policy bookings_update_facility on public.bookings
  for update to authenticated
  using (
    public.rls_clinic_access_approved()
    and (
      assigned_clinic_id::text = public.rls_session_clinic_id()
      or destination_clinic_id::text = public.rls_session_clinic_id()
      or public.rls_driver_belongs_to_clinic(driver_id, public.rls_session_clinic_id())
    )
  )
  with check (public.rls_clinic_access_approved());

drop policy if exists bookings_select_facility_completed on public.bookings;
create policy bookings_select_facility_completed on public.bookings
  for select to authenticated
  using (
    public.rls_clinic_access_approved()
    and status = 'Completed'
    and (
      assigned_clinic_id::text = public.rls_session_clinic_id()
      or destination_clinic_id::text = public.rls_session_clinic_id()
      or public.rls_driver_belongs_to_clinic(driver_id, public.rls_session_clinic_id())
    )
  );

drop policy if exists bookings_select_facility_patient_active on public.bookings;
create policy bookings_select_facility_patient_active on public.bookings
  for select to authenticated
  using (
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

drop policy if exists bookings_update_facility_patient_active on public.bookings;
create policy bookings_update_facility_patient_active on public.bookings
  for update to authenticated
  using (
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
  )
  with check (
    public.rls_clinic_access_approved()
    and status in ('Pending', 'Assigned', 'Accepted', 'En Route', 'Picked Up', 'Completed')
    and assigned_clinic_id::text = public.rls_session_clinic_id()
  );
