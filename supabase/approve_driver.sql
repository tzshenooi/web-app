-- Legacy helper: activate existing driver rows (no approval workflow required anymore).
-- Prefer: web-app/supabase/drivers_no_approval.sql

-- update public.drivers
-- set status = 'Offline', base_clinic_id = 'YOUR-CLINIC-UUID'
-- where email = 'driver@example.com';
