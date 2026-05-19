-- Enable Realtime on patient_reports (clinic notification bell).
-- Run once in Supabase SQL Editor (safe to re-run).
alter publication supabase_realtime add table public.patient_reports;
