-- =============================================================================
-- Smart Ambulance — full database rebuild (minimal schema aligned with repo)
-- =============================================================================
-- ⚠️  DESTRUCTIVE: deletes ALL ROWS IN ALL LISTED TABLES. Auth users are NOT
--     deleted automatically — remove them manually in Dashboard → Authentication
--     if you want a completely empty project.
--
-- HOW TO RUN
--   1. Supabase Dashboard → SQL Editor → New query
--   2. Paste this file → Run
--   3. Storage → buckets **mission-evidence**, **documents** (public), **patient-reports** (private).
--      Or run web-app/supabase/patient_reports.sql then patient_reports_booking_link.sql.
--   4. Register clinic in web app, or seed_demo_clinic.sql + Auth app_metadata:
--        { "clinic_access": "approved", "clinic_id": "<clinics.uuid>" }
--   5. Drivers default to **Offline**; they go **Available** from the mobile app when online.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 1) Tear down old objects (handles legacy / unused tables from earlier builds)
-- ---------------------------------------------------------------------------
drop trigger if exists on_auth_user_created on auth.users;

-- Dropping these tables CASCADE also removes them from supabase_realtime publication.
drop table if exists public.patient_reports cascade;
drop table if exists public.bookings cascade;
drop table if exists public.drivers cascade;
drop table if exists public.facility_registrations cascade;
drop table if exists public.hospitals cascade;
drop table if exists public.clinics cascade;
drop table if exists public.dispatch_operators cascade;
drop table if exists public.messages cascade;
drop table if exists public.patients cascade;

-- ---------------------------------------------------------------------------
-- 2) Core tables
-- ---------------------------------------------------------------------------

create table public.clinics (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  email text not null,
  auth_user_id uuid unique references auth.users (id) on delete set null,
  latitude double precision,
  longitude double precision,
  address text,
  specialty text default 'General',
  phone text,
  bed_capacity integer not null default 0,
  beds_occupied integer not null default 0,
  created_at timestamptz not null default now(),
  constraint clinics_beds_ok check (
    beds_occupied >= 0
    and bed_capacity >= 0
    and (bed_capacity = 0 or beds_occupied <= bed_capacity)
  )
);

create unique index clinics_name_lower_idx on public.clinics (lower(name));
create unique index clinics_email_lower_idx on public.clinics (lower(email));


create table public.drivers (
  id uuid primary key references auth.users (id) on delete cascade,
  name text not null default '',
  email text,
  ic_number text,
  phone_number text,
  ic_front_url text,
  license_front_url text,
  status text not null default 'Offline',
  current_lat double precision,
  current_lng double precision,
  base_clinic_id uuid references public.clinics (id) on delete set null,
  created_at timestamptz not null default now()
);

create index drivers_base_clinic_id_idx on public.drivers (base_clinic_id) where base_clinic_id is not null;
create index drivers_status_idx on public.drivers (status);


create table public.patient_reports (
  id uuid primary key default gen_random_uuid(),
  reporter_user_id uuid not null references auth.users (id) on delete cascade,
  reporter_name text,
  reporter_phone text,
  latitude double precision not null,
  longitude double precision not null,
  location_label text,
  incident_category text not null,
  details text not null,
  status text not null default 'submitted',
  patient_id text,
  destination_type text,
  hospital_name text,
  created_at timestamptz not null default now()
);

create index patient_reports_reporter_user_id_idx on public.patient_reports (reporter_user_id);
create index patient_reports_created_at_idx on public.patient_reports (created_at desc);


create table public.bookings (
  id uuid primary key default gen_random_uuid(),
  patient_name text not null,
  location text,
  latitude double precision not null,
  longitude double precision not null,
  emergency_type text,
  notes text,
  status text not null default 'Pending',
  driver_id uuid references public.drivers (id) on delete set null,
  destination_clinic_id uuid references public.clinics (id) on delete set null,
  patient_report_id uuid references public.patient_reports (id) on delete set null,
  assigned_clinic_id uuid references public.clinics (id) on delete set null,
  scene_photo text,
  handover_photo text,
  patient_id text,
  requested_at timestamptz not null default now(),
  ambulance_departed_at timestamptz,
  patient_picked_up_at timestamptz,
  discharge_completed_at timestamptz,
  hospital_name text,
  destination_type text,
  medication_service_eligible boolean,
  booking_kind text not null default 'emergency',
  scheduled_at timestamptz,
  is_bedridden boolean not null default false,
  reporter_user_id uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  constraint bookings_booking_kind_check check (booking_kind in ('emergency', 'scheduled')),
  constraint bookings_scheduled_at_check check (
    booking_kind <> 'scheduled' or scheduled_at is not null
  )
);

create index bookings_driver_id_idx on public.bookings (driver_id);
create index bookings_status_idx on public.bookings (status);
create index bookings_destination_clinic_id_idx on public.bookings (destination_clinic_id);
create index bookings_patient_report_id_idx on public.bookings (patient_report_id) where patient_report_id is not null;
create index bookings_assigned_clinic_id_idx on public.bookings (assigned_clinic_id) where assigned_clinic_id is not null;


-- ---------------------------------------------------------------------------
-- 3) Row Level Security — practical defaults for this student / pilot project.
-- Tighten with auth.uid() filters before exposing to the internet.
-- Service role bypasses RLS automatically (your web-admin client).
-- ---------------------------------------------------------------------------
alter table public.clinics enable row level security;
alter table public.drivers enable row level security;
alter table public.bookings enable row level security;
alter table public.patient_reports enable row level security;

create policy clinics_select_authenticated on public.clinics
  for select to authenticated using (true);

create policy clinics_select_anon on public.clinics
  for select to anon using (true);

create policy clinics_update_own on public.clinics
  for update to authenticated
  using (
    auth_user_id = auth.uid()
    or lower(email) = lower(coalesce(auth.jwt() ->> 'email', ''))
    or id::text = coalesce((auth.jwt() -> 'app_metadata' ->> 'clinic_id'), '')
  )
  with check (
    auth_user_id = auth.uid()
    or lower(email) = lower(coalesce(auth.jwt() ->> 'email', ''))
    or id::text = coalesce((auth.jwt() -> 'app_metadata' ->> 'clinic_id'), '')
  );


create policy drivers_select_self on public.drivers
  for select to authenticated using (id = auth.uid());

create policy drivers_select_facility on public.drivers
  for select to authenticated using (
    (auth.jwt() -> 'app_metadata' ->> 'clinic_access') = 'approved'
    and base_clinic_id is not null
    and base_clinic_id::text = coalesce((auth.jwt() -> 'app_metadata' ->> 'clinic_id'), '')
  );

create policy drivers_insert_self on public.drivers
  for insert to authenticated with check (id = auth.uid());

create policy drivers_update_self on public.drivers
  for update to authenticated using (id = auth.uid()) with check (id = auth.uid());


-- bookings: drivers see/update rows assigned to them; clinic users see relevant rows
create policy bookings_select_driver on public.bookings
  for select to authenticated using (driver_id = auth.uid());

create policy bookings_select_facility on public.bookings
  for select to authenticated using (
    (auth.jwt() -> 'app_metadata' ->> 'clinic_access') = 'approved'
    and (
      destination_clinic_id::text = coalesce((auth.jwt() -> 'app_metadata' ->> 'clinic_id'), '')
      or assigned_clinic_id::text = coalesce((auth.jwt() -> 'app_metadata' ->> 'clinic_id'), '')
      or exists (
        select 1
        from public.drivers d
        where d.id = bookings.driver_id
          and d.base_clinic_id::text = coalesce((auth.jwt() -> 'app_metadata' ->> 'clinic_id'), '')
      )
    )
  );

create policy bookings_insert_facility on public.bookings
  for insert to authenticated with check (
    (auth.jwt() -> 'app_metadata' ->> 'clinic_access') = 'approved'
    and (
      driver_id is null
      or exists (
        select 1 from public.drivers d
        where d.id = driver_id
          and d.base_clinic_id::text = coalesce((auth.jwt() -> 'app_metadata' ->> 'clinic_id'), '')
      )
    )
  );

create policy bookings_update_driver on public.bookings
  for update to authenticated using (driver_id = auth.uid()) with check (driver_id = auth.uid());

create policy bookings_update_facility on public.bookings
  for update to authenticated using (
    (auth.jwt() -> 'app_metadata' ->> 'clinic_access') = 'approved'
    and (
      destination_clinic_id::text = coalesce((auth.jwt() -> 'app_metadata' ->> 'clinic_id'), '')
      or assigned_clinic_id::text = coalesce((auth.jwt() -> 'app_metadata' ->> 'clinic_id'), '')
      or exists (
        select 1 from public.drivers d
        where d.id = bookings.driver_id
          and d.base_clinic_id::text = coalesce((auth.jwt() -> 'app_metadata' ->> 'clinic_id'), '')
      )
    )
  ) with check (
    (auth.jwt() -> 'app_metadata' ->> 'clinic_access') = 'approved'
  );


-- patient_reports: patients submit & read own rows; approved clinic users can read all
create policy patient_reports_insert_own on public.patient_reports
  for insert to authenticated
  with check (reporter_user_id = auth.uid());

create policy patient_reports_select_own on public.patient_reports
  for select to authenticated
  using (reporter_user_id = auth.uid());

create policy patient_reports_select_facility on public.patient_reports
  for select to authenticated
  using ((auth.jwt() -> 'app_metadata' ->> 'clinic_access') = 'approved');


create policy bookings_insert_patient_report on public.bookings
  for insert to authenticated
  with check (
    status = 'Pending'
    and driver_id is null
    and patient_report_id is not null
    and exists (
      select 1
      from public.patient_reports pr
      where pr.id = patient_report_id
        and pr.reporter_user_id = auth.uid()
    )
  );

create policy bookings_insert_patient_scheduled on public.bookings
  for insert to authenticated
  with check (
    status = 'Scheduled'
    and booking_kind = 'scheduled'
    and driver_id is null
    and patient_report_id is null
    and reporter_user_id = auth.uid()
    and scheduled_at is not null
    and assigned_clinic_id is not null
  );

create policy bookings_select_patient_own_scheduled on public.bookings
  for select to authenticated
  using (reporter_user_id = auth.uid());

create policy bookings_update_patient_cancel_scheduled on public.bookings
  for update to authenticated
  using (
    reporter_user_id = auth.uid()
    and status = 'Scheduled'
    and driver_id is null
  )
  with check (
    reporter_user_id = auth.uid()
    and status = 'Cancelled'
    and driver_id is null
  );

create policy bookings_select_facility_patient_pending on public.bookings
  for select to authenticated
  using (
    (auth.jwt() -> 'app_metadata' ->> 'clinic_access') = 'approved'
    and status = 'Pending'
    and patient_report_id is not null
    and (
      assigned_clinic_id is null
      or assigned_clinic_id::text = coalesce((auth.jwt() -> 'app_metadata' ->> 'clinic_id'), '')
    )
  );

create policy bookings_update_facility_patient_pending on public.bookings
  for update to authenticated
  using (
    (auth.jwt() -> 'app_metadata' ->> 'clinic_access') = 'approved'
    and status = 'Pending'
    and patient_report_id is not null
    and (
      assigned_clinic_id is null
      or assigned_clinic_id::text = coalesce((auth.jwt() -> 'app_metadata' ->> 'clinic_id'), '')
    )
  )
  with check (
    (auth.jwt() -> 'app_metadata' ->> 'clinic_access') = 'approved'
  );

-- Patient mobile app: read own mission + assigned driver GPS (ETA / map)
create policy bookings_select_patient_own_report on public.bookings
  for select to authenticated
  using (
    patient_report_id is not null
    and exists (
      select 1
      from public.patient_reports pr
      where pr.id = patient_report_id
        and pr.reporter_user_id = auth.uid()
    )
  );

create policy drivers_select_patient_assigned on public.drivers
  for select to authenticated
  using (
    exists (
      select 1
      from public.bookings b
      join public.patient_reports pr on pr.id = b.patient_report_id
      where b.driver_id = drivers.id
        and pr.reporter_user_id = auth.uid()
        and b.status in ('Pending', 'Assigned', 'Accepted', 'En Route', 'Picked Up')
    )
  );


-- ---------------------------------------------------------------------------
-- 4) Realtime (Clinic portal & MapComponent subscribe to changes)
-- ---------------------------------------------------------------------------
alter publication supabase_realtime add table public.bookings;
alter publication supabase_realtime add table public.drivers;
alter publication supabase_realtime add table public.clinics;


-- ---------------------------------------------------------------------------
-- 5) Storage buckets used by Flutter (safe to run multiple times)
-- ---------------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit)
values ('mission-evidence', 'mission-evidence', true, 52428800),
       ('documents', 'documents', true, 52428800),
       ('patient-reports', 'patient-reports', false, 5242880)
on conflict (id) do update
set name = excluded.name,
    public = excluded.public,
    file_size_limit = coalesce(excluded.file_size_limit, storage.buckets.file_size_limit);


-- Minimal storage policies — tighten before production (scoped paths per user).
drop policy if exists storage_mission_evidence_rw on storage.objects;
drop policy if exists storage_documents_rw on storage.objects;
drop policy if exists storage_patient_reports_rw on storage.objects;

create policy storage_mission_evidence_rw on storage.objects
  for all to authenticated
  using (bucket_id = 'mission-evidence')
  with check (bucket_id = 'mission-evidence');

create policy storage_documents_rw on storage.objects
  for all to authenticated
  using (bucket_id = 'documents')
  with check (bucket_id = 'documents');

create policy storage_patient_reports_rw on storage.objects
  for all to authenticated
  using (
    bucket_id = 'patient-reports'
    and (storage.foldername(name))[1] = auth.uid()::text
  )
  with check (
    bucket_id = 'patient-reports'
    and (storage.foldername(name))[1] = auth.uid()::text
  );


-- ---------------------------------------------------------------------------
-- 6) After rebuild — create your clinic row here (runs as Postgres, bypasses RLS)
-- ---------------------------------------------------------------------------
-- See seed_demo_clinic.sql or use Register facility in the web app.

