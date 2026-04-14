-- Run once in Supabase SQL Editor if you get:
-- "new row violates row-level security policy for table 'facility_registrations'"
-- (Usually because you're logged in: requests use role "authenticated", not "anon".)

drop policy if exists "facility_registrations_insert_authenticated" on public.facility_registrations;

create policy "facility_registrations_insert_authenticated"
  on public.facility_registrations for insert
  to authenticated
  with check (true);
