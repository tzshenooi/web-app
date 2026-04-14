-- Run in Supabase → SQL Editor if you see:
-- "Could not find the 'specialty' column of 'hospitals' in the schema cache"

alter table public.hospitals
  add column if not exists specialty text;
