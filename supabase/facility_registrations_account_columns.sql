-- Run in Supabase SQL Editor if `facility_registrations` already exists without account columns.

alter table public.facility_registrations
  add column if not exists contact_email text;

alter table public.facility_registrations
  add column if not exists auth_user_id uuid;
