-- Link a manually inserted driver to YOUR clinic so they appear in Drivers (0/2 → 1/2).
-- 1) Supabase → Table Editor → clinics → copy your clinic uuid
-- 2) Supabase → Authentication → Users → copy the driver's user uuid (must match drivers.id)
-- 3) Replace placeholders below and Run

-- update public.drivers
-- set
--   base_clinic_id = 'YOUR-CLINIC-UUID-HERE',
--   status = 'Offline',
--   email = 'driver@ambulance.com'
-- where id = 'DRIVER-AUTH-USER-UUID-HERE';

-- Check:
-- select id, name, email, status, base_clinic_id from public.drivers;
