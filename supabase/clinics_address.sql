-- Run once in Supabase SQL Editor (safe to re-run).
alter table public.clinics add column if not exists address text;
