-- Advance / bedridden scheduled bookings (non-emergency transport).
-- Run once in Supabase SQL Editor (safe to re-run).

alter table public.bookings
  add column if not exists booking_kind text not null default 'emergency',
  add column if not exists scheduled_at timestamptz,
  add column if not exists is_bedridden boolean not null default false,
  add column if not exists reporter_user_id uuid references auth.users (id) on delete set null;

alter table public.bookings drop constraint if exists bookings_booking_kind_check;
alter table public.bookings add constraint bookings_booking_kind_check
  check (booking_kind in ('emergency', 'scheduled'));

alter table public.bookings drop constraint if exists bookings_scheduled_at_check;
alter table public.bookings add constraint bookings_scheduled_at_check
  check (
    booking_kind <> 'scheduled'
    or scheduled_at is not null
  );

create index if not exists bookings_scheduled_at_idx
  on public.bookings (scheduled_at)
  where status = 'Scheduled';

comment on column public.bookings.booking_kind is 'emergency | scheduled (bedridden / advance transport)';
comment on column public.bookings.scheduled_at is 'Planned pickup time for scheduled bookings';
comment on column public.bookings.is_bedridden is 'Patient requires stretcher / non-urgent bed transport';
comment on column public.bookings.reporter_user_id is 'Patient app user who requested a scheduled booking';

alter table public.bookings
  add column if not exists scheduled_driver_acknowledged_at timestamptz;

-- Patient app: submit advance booking (no patient_report row required).
drop policy if exists bookings_insert_patient_scheduled on public.bookings;
create policy bookings_insert_patient_scheduled on public.bookings
  for insert to authenticated
  with check (
    status = 'Scheduled'
    and booking_kind = 'scheduled'
    and driver_id is null
    and patient_report_id is null
    and reporter_user_id = auth.uid()
    and scheduled_at is not null
    and assigned_clinic_id is not null
  );

drop policy if exists bookings_select_patient_own_scheduled on public.bookings;
create policy bookings_select_patient_own_scheduled on public.bookings
  for select to authenticated
  using (reporter_user_id = auth.uid());

drop policy if exists bookings_update_patient_cancel_scheduled on public.bookings;
create policy bookings_update_patient_cancel_scheduled on public.bookings
  for update to authenticated
  using (
    reporter_user_id = auth.uid()
    and status = 'Scheduled'
    and driver_id is null
  )
  with check (
    reporter_user_id = auth.uid()
    and status = 'Cancelled'
    and driver_id is null
  );
