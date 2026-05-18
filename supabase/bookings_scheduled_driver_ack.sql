-- Driver acknowledgement for scheduled pickup alerts.
-- Run once in Supabase SQL Editor (safe to re-run).

alter table public.bookings
  add column if not exists scheduled_driver_acknowledged_at timestamptz;

comment on column public.bookings.scheduled_driver_acknowledged_at is
  'When the assigned driver acknowledged the upcoming scheduled pickup alert';
