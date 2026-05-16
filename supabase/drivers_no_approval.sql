-- Drivers are active immediately (no Pending approval step).
-- Run once in Supabase SQL Editor.

update public.drivers
set status = 'Offline'
where lower(status) in ('pending', 'rejected');

alter table public.drivers alter column status set default 'Offline';
