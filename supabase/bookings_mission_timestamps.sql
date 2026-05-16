-- Mission timeline: patient pickup + discharge completion (driver app sets these).
-- Run once in Supabase SQL Editor (safe to re-run).

alter table public.bookings
  add column if not exists patient_picked_up_at timestamptz,
  add column if not exists discharge_completed_at timestamptz;

comment on column public.bookings.patient_picked_up_at is 'When driver confirmed patient secured on scene (Picked Up)';
comment on column public.bookings.discharge_completed_at is 'When driver completed discharge at destination';
