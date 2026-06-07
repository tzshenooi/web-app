-- Hospital map pin when destination is from Google Places (not only registered clinics).
-- Run once in Supabase SQL Editor.

alter table public.bookings
  add column if not exists destination_latitude double precision,
  add column if not exists destination_longitude double precision;

comment on column public.bookings.destination_latitude is 'Receiving hospital latitude (Google Places or clinic pin)';
comment on column public.bookings.destination_longitude is 'Receiving hospital longitude (Google Places or clinic pin)';
