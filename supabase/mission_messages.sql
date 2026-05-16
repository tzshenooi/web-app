-- Driver ↔ patient in-app chat for active missions (mobile apps).
-- Run in Supabase SQL Editor after fix_bookings_rls_recursion.sql.

create table if not exists public.mission_messages (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid not null references public.bookings (id) on delete cascade,
  sender_role text not null check (sender_role in ('driver', 'patient')),
  body text not null,
  created_at timestamptz not null default now()
);

create index if not exists mission_messages_booking_idx
  on public.mission_messages (booking_id, created_at asc);

alter table public.mission_messages enable row level security;

create or replace function public.rls_user_can_chat_on_booking(p_booking_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.bookings b
    where b.id = p_booking_id
      and b.status in ('Pending', 'Assigned', 'Accepted', 'En Route', 'Picked Up')
      and (
        b.driver_id = auth.uid()
        or exists (
          select 1
          from public.patient_reports pr
          where pr.id = b.patient_report_id
            and pr.reporter_user_id = auth.uid()
        )
      )
  );
$$;

grant execute on function public.rls_user_can_chat_on_booking(uuid) to authenticated;

drop policy if exists mission_messages_select_participant on public.mission_messages;
create policy mission_messages_select_participant on public.mission_messages
  for select to authenticated
  using (public.rls_user_can_chat_on_booking(booking_id));

drop policy if exists mission_messages_insert_participant on public.mission_messages;
create policy mission_messages_insert_participant on public.mission_messages
  for insert to authenticated
  with check (
    public.rls_user_can_chat_on_booking(booking_id)
    and (
      (
        sender_role = 'driver'
        and exists (
          select 1 from public.bookings b
          where b.id = booking_id and b.driver_id = auth.uid()
        )
      )
      or (
        sender_role = 'patient'
        and exists (
          select 1
          from public.bookings b
          inner join public.patient_reports pr on pr.id = b.patient_report_id
          where b.id = booking_id and pr.reporter_user_id = auth.uid()
        )
      )
    )
  );

do $$
begin
  alter publication supabase_realtime add table public.mission_messages;
exception
  when duplicate_object then null;
end $$;
