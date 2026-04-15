-- If Facility requests stays empty in the dashboard but rows exist in the table,
-- the SELECT policy for `authenticated` may be missing. Run this in Supabase SQL Editor.

drop policy if exists "facility_registrations_select_auth" on public.facility_registrations;

create policy "facility_registrations_select_auth"
  on public.facility_registrations for select
  to authenticated
  using (true);
