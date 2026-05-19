-- Allow read-only access to mission chat after discharge (records / evidence).
-- Run after mission_messages.sql.

create or replace function public.rls_user_can_read_mission_messages(p_booking_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.bookings b
    where b.id = p_booking_id
      and (
        b.driver_id = auth.uid()
        or exists (
          select 1
          from public.patient_reports pr
          where pr.id = b.patient_report_id
            and pr.reporter_user_id = auth.uid()
        )
        or (
          (auth.jwt() -> 'app_metadata' ->> 'clinic_access') = 'approved'
          and (
            b.assigned_clinic_id::text = coalesce((auth.jwt() -> 'app_metadata' ->> 'clinic_id'), '')
            or b.destination_clinic_id::text = coalesce((auth.jwt() -> 'app_metadata' ->> 'clinic_id'), '')
          )
        )
      )
  );
$$;

grant execute on function public.rls_user_can_read_mission_messages(uuid) to authenticated;

drop policy if exists mission_messages_select_participant on public.mission_messages;
create policy mission_messages_select_participant on public.mission_messages
  for select to authenticated
  using (public.rls_user_can_read_mission_messages(booking_id));

-- Inserts still require an active mission (unchanged logic).
create or replace function public.rls_user_can_send_mission_message(p_booking_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.bookings b
    where b.id = p_booking_id
      and b.status in ('Pending', 'Assigned', 'Accepted', 'En Route', 'Picked Up')
      and (
        b.driver_id = auth.uid()
        or exists (
          select 1
          from public.patient_reports pr
          where pr.id = b.patient_report_id
            and pr.reporter_user_id = auth.uid()
        )
      )
  );
$$;

grant execute on function public.rls_user_can_send_mission_message(uuid) to authenticated;

drop policy if exists mission_messages_insert_participant on public.mission_messages;
create policy mission_messages_insert_participant on public.mission_messages
  for insert to authenticated
  with check (
    public.rls_user_can_send_mission_message(booking_id)
    and (
      (
        sender_role = 'driver'
        and exists (
          select 1 from public.bookings b
          where b.id = booking_id and b.driver_id = auth.uid()
        )
      )
      or (
        sender_role = 'patient'
        and exists (
          select 1
          from public.bookings b
          inner join public.patient_reports pr on pr.id = b.patient_report_id
          where b.id = booking_id and pr.reporter_user_id = auth.uid()
        )
      )
    )
  );
