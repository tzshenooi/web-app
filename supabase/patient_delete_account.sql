-- Patient self-service account deletion (mobile app Settings → Delete account).
-- Run once in Supabase SQL Editor (safe to re-run).

create or replace function public.delete_own_patient_account()
returns void
language plpgsql
security definer
set search_path = public, auth, storage
as $$
declare
  uid uuid := auth.uid();
begin
  if uid is null then
    raise exception 'Not signed in';
  end if;

  delete from storage.objects
  where bucket_id = 'patient-reports'
    and (storage.foldername(name))[1] = uid::text;

  delete from auth.users where id = uid;
end;
$$;

revoke all on function public.delete_own_patient_account() from public;
grant execute on function public.delete_own_patient_account() to authenticated;

comment on function public.delete_own_patient_account() is
  'Patient app: permanently deletes the signed-in user, profile, reports, and storage attachments.';
