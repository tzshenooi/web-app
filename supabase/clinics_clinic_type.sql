-- Clinic ownership: private or public (replaces free-text specialty on registration).
alter table public.clinics add column if not exists clinic_type text;

alter table public.clinics drop constraint if exists clinics_clinic_type_check;
alter table public.clinics add constraint clinics_clinic_type_check
  check (clinic_type is null or clinic_type in ('private', 'public'));

comment on column public.clinics.clinic_type is 'private | public — clinic ownership type.';
