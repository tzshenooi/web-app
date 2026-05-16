-- Clinic sign-in email on hospitals (links Auth user ↔ clinic row for Incoming / dispatch).
-- Run in Supabase SQL Editor after patient_reports.sql (safe to re-run).

alter table public.hospitals
  add column if not exists contact_email text,
  add column if not exists auth_user_id uuid references auth.users (id) on delete set null;

create unique index if not exists hospitals_contact_email_lower_idx
  on public.hospitals (lower(contact_email))
  where contact_email is not null;

create index if not exists hospitals_auth_user_id_idx
  on public.hospitals (auth_user_id)
  where auth_user_id is not null;

-- Clinic can update their own row when linked by auth user id or sign-in email.
drop policy if exists hosp_update_own_clinic on public.hospitals;
create policy hosp_update_own_clinic on public.hospitals
  for update to authenticated
  using (
    auth_user_id = auth.uid()
    or lower(contact_email) = lower(coalesce(auth.jwt() ->> 'email', ''))
  )
  with check (
    auth_user_id = auth.uid()
    or lower(contact_email) = lower(coalesce(auth.jwt() ->> 'email', ''))
  );
