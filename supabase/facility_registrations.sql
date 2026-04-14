-- Run this in Supabase: SQL Editor → New query → Run
-- Pending facility signups before they appear in `hospitals`.

create table if not exists public.facility_registrations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  specialty text,
  contact_email text,
  auth_user_id uuid,
  created_at timestamptz not null default now()
);

create index if not exists facility_registrations_created_at_idx
  on public.facility_registrations (created_at desc);

-- One pending request per facility name (case-insensitive)
create unique index if not exists facility_registrations_name_lower_idx
  on public.facility_registrations (lower(name));

alter table public.facility_registrations enable row level security;

-- Submit requests: anon (logged out) OR authenticated (logged in — same browser session)
create policy "facility_registrations_insert_anon"
  on public.facility_registrations for insert
  to anon
  with check (true);

create policy "facility_registrations_insert_authenticated"
  on public.facility_registrations for insert
  to authenticated
  with check (true);

-- Dispatchers (logged in): list and remove rows when approving/rejecting
create policy "facility_registrations_select_auth"
  on public.facility_registrations for select
  to authenticated
  using (true);

create policy "facility_registrations_delete_auth"
  on public.facility_registrations for delete
  to authenticated
  using (true);
