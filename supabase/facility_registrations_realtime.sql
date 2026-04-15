-- Run in Supabase SQL Editor so the dispatcher dashboard can receive live updates.
-- The app also polls every few seconds, but fixing both below makes postgres_changes work.

-- 1) Replication: without this, postgres_changes never fires for this table.
alter publication supabase_realtime add table public.facility_registrations;

-- 2) RLS: postgres_changes only delivers rows the subscriber may SELECT.
--    (Listing uses the service role and ignores RLS; Realtime uses the logged-in JWT.)
drop policy if exists "facility_registrations_select_auth" on public.facility_registrations;

create policy "facility_registrations_select_auth"
  on public.facility_registrations for select
  to authenticated
  using (true);
