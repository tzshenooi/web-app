-- Run once in Supabase SQL Editor if facility_registrations has no coordinates yet.

alter table public.facility_registrations
  add column if not exists latitude double precision;

alter table public.facility_registrations
  add column if not exists longitude double precision;
