-- Driver ↔ clinic short messages (mobile dispatch chat tab).
-- Run in Supabase SQL Editor after rebuild_smart_ambulance.sql.

create table if not exists public.driver_clinic_messages (
  id uuid primary key default gen_random_uuid(),
  driver_id uuid not null references public.drivers (id) on delete cascade,
  clinic_id uuid references public.clinics (id) on delete set null,
  booking_id uuid references public.bookings (id) on delete set null,
  body text not null,
  created_at timestamptz not null default now()
);

create index if not exists driver_clinic_messages_driver_idx
  on public.driver_clinic_messages (driver_id, created_at desc);

alter table public.driver_clinic_messages enable row level security;

drop policy if exists driver_clinic_messages_select_self on public.driver_clinic_messages;
create policy driver_clinic_messages_select_self on public.driver_clinic_messages
  for select to authenticated
  using (driver_id = auth.uid());

drop policy if exists driver_clinic_messages_insert_self on public.driver_clinic_messages;
create policy driver_clinic_messages_insert_self on public.driver_clinic_messages
  for insert to authenticated
  with check (driver_id = auth.uid());
