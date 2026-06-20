-- Run once in Supabase → SQL Editor (safe to re-run).
-- Adds columns required for clinic registration (address, phone, clinic type).

alter table public.clinics add column if not exists address text;
alter table public.clinics add column if not exists phone text;
alter table public.clinics add column if not exists clinic_type text;

alter table public.clinics drop constraint if exists clinics_clinic_type_check;
alter table public.clinics add constraint clinics_clinic_type_check
  check (clinic_type is null or clinic_type in ('private', 'public'));

comment on column public.clinics.address is 'Formatted clinic address from Google Places (map pin).';
comment on column public.clinics.phone is 'Dispatch / contact number shown to patients (tel: link in mobile app).';
comment on column public.clinics.clinic_type is 'private | public — clinic ownership type.';
