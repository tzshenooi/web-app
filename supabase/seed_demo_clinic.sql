-- Demo clinic row (run AFTER migrate_to_clinics.sql).
-- Use the same email as your Clinic Portal login.

insert into public.clinics (name, email, latitude, longitude, specialty)
values (
  'Demo Clinic',
  'clinic@example.com',
  5.4164,
  100.3327,
  'General'
)
returning id, name, email;

-- Link Auth user (Authentication → Users → your account → User Metadata → app_metadata):
-- {
--   "clinic_access": "approved",
--   "clinic_id": "<uuid from returning id above>"
-- }
--
-- Optional: tie auth user on the row
-- update public.clinics set auth_user_id = '<auth-user-uuid>' where email = 'clinic@example.com';
