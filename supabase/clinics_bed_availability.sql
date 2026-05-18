-- Bed availability on clinics (run on existing DBs). Safe to re-run.
-- -----------------------------------------------------------------------------

alter table public.clinics
  add column if not exists bed_capacity integer not null default 0;

alter table public.clinics
  add column if not exists beds_occupied integer not null default 0;

update public.clinics
set beds_occupied = least(greatest(beds_occupied, 0), greatest(bed_capacity, 0))
where bed_capacity > 0 and beds_occupied > bed_capacity;

alter table public.clinics drop constraint if exists clinics_beds_ok;

alter table public.clinics
  add constraint clinics_beds_ok check (
    beds_occupied >= 0
    and bed_capacity >= 0
    and (bed_capacity = 0 or beds_occupied <= bed_capacity)
  );
