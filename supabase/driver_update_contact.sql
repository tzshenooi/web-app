-- Driver self-service contact details (mobile app Profile → Edit contact).
-- Run once in Supabase SQL Editor (safe to re-run).

create or replace function public.update_own_driver_contact(
  p_phone_number text default null,
  p_ic_number text default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'Not signed in';
  end if;

  update public.drivers
  set
    phone_number = nullif(trim(coalesce(p_phone_number, '')), ''),
    ic_number = nullif(trim(coalesce(p_ic_number, '')), '')
  where id = auth.uid();

  if not found then
    raise exception 'Driver profile not found';
  end if;
end;
$$;

revoke all on function public.update_own_driver_contact(text, text) from public;
grant execute on function public.update_own_driver_contact(text, text) to authenticated;

comment on function public.update_own_driver_contact(text, text) is
  'Driver app: update own phone_number and ic_number only.';
