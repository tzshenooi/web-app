-- Run once in Supabase: links drivers added from a facility to that hospital for map display.

alter table public.drivers
  add column if not exists base_hospital_id uuid references public.hospitals (id);

create index if not exists drivers_base_hospital_id_idx
  on public.drivers (base_hospital_id)
  where base_hospital_id is not null;
