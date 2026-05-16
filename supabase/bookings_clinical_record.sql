-- Clinic / SV reporting fields for ambulance missions.
-- Run once in Supabase SQL Editor (safe to re-run).

alter table public.bookings
  add column if not exists patient_id text,
  add column if not exists requested_at timestamptz default now(),
  add column if not exists ambulance_departed_at timestamptz,
  add column if not exists patient_picked_up_at timestamptz,
  add column if not exists discharge_completed_at timestamptz,
  add column if not exists hospital_name text,
  add column if not exists destination_type text,
  add column if not exists medication_service_eligible boolean;

comment on column public.bookings.patient_id is 'Patient identifier (NRIC, hospital no., etc.)';
comment on column public.bookings.requested_at is 'When ambulance service was requested';
comment on column public.bookings.ambulance_departed_at is 'When ambulance left base / en route';
comment on column public.bookings.patient_picked_up_at is 'When driver secured patient on scene';
comment on column public.bookings.discharge_completed_at is 'When driver completed discharge';
comment on column public.bookings.hospital_name is 'Receiving or referring hospital name';
comment on column public.bookings.destination_type is 'public_hospital | house | private_hospital';
comment on column public.bookings.medication_service_eligible is 'Clinic can provide medication for this destination';

alter table public.bookings drop constraint if exists bookings_destination_type_check;
alter table public.bookings add constraint bookings_destination_type_check
  check (
    destination_type is null
    or destination_type in ('public_hospital', 'house', 'private_hospital')
  );

update public.bookings
set requested_at = coalesce(requested_at, created_at)
where requested_at is null;

alter table public.patient_reports
  add column if not exists patient_id text,
  add column if not exists destination_type text,
  add column if not exists hospital_name text;

alter table public.patient_reports drop constraint if exists patient_reports_destination_type_check;
alter table public.patient_reports add constraint patient_reports_destination_type_check
  check (
    destination_type is null
    or destination_type in ('public_hospital', 'house', 'private_hospital')
  );

-- Clinic portal mirrors booking clinical fields onto patient_reports (see patient_reports_clinic_update.sql).
