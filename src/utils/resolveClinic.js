import { supabase } from '../supabaseClient';

/** @returns {'approved'|'pending'|null} */
export function getClinicAccess(user) {
  return user?.app_metadata?.clinic_access ?? user?.app_metadata?.facility_access ?? null;
}

/** @returns {string|null} */
export function getClinicIdFromMeta(user) {
  const id = user?.app_metadata?.clinic_id ?? user?.app_metadata?.facility_hospital_id;
  return id ? String(id) : null;
}

/** Approved metadata, or a matching row in public.clinics (auth user / email). */
export async function canAccessClinicPortal(user) {
  if (!user) return false;
  const access = getClinicAccess(user);
  if (access === 'pending') return false;
  if (access === 'approved') return true;
  return Boolean(await resolveClinicId(user));
}

/**
 * Resolve clinic row for signed-in portal user.
 * Order: app_metadata clinic_id → auth_user_id → sign-in email.
 */
export async function resolveClinicId(user) {
  if (!user) return null;

  const metaId = getClinicIdFromMeta(user);
  if (metaId) {
    const { data } = await supabase.from('clinics').select('id').eq('id', metaId).maybeSingle();
    if (data?.id) return String(data.id);
  }

  if (user.id) {
    const { data } = await supabase.from('clinics').select('id').eq('auth_user_id', user.id).maybeSingle();
    if (data?.id) return String(data.id);
  }

  const email = user.email?.trim();
  if (email) {
    const { data } = await supabase.from('clinics').select('id').ilike('email', email).maybeSingle();
    if (data?.id) return String(data.id);
  }

  return null;
}

export async function fetchClinicRow(user) {
  const id = await resolveClinicId(user);
  if (!id) return null;
  const { data, error } = await supabase.from('clinics').select('*').eq('id', id).maybeSingle();
  if (error) throw error;
  return data;
}
