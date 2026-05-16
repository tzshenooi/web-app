-- Optional clinic phone for patient app "Call clinic" button.
alter table public.clinics add column if not exists phone text;

comment on column public.clinics.phone is 'Dispatch / contact number shown to patients (tel: link in mobile app).';
