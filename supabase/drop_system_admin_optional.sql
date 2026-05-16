-- Optional: run only if you previously applied system_admin.sql and want to remove it.

drop policy if exists clinics_update_system_admin on public.clinics;
drop policy if exists drivers_select_system_admin on public.drivers;
drop policy if exists drivers_update_system_admin on public.drivers;
drop policy if exists bookings_select_system_admin on public.bookings;
drop policy if exists bookings_update_system_admin on public.bookings;
drop policy if exists patient_reports_select_system_admin on public.patient_reports;
drop policy if exists system_admins_select_self on public.system_admins;

drop function if exists public.rls_is_system_admin();

drop table if exists public.system_admins;

-- Keeps portal_status column if present (harmless); drop manually if desired:
-- alter table public.clinics drop column if exists portal_status;
