import { supabase } from '../supabaseClient';

/** @returns {Promise<{ address: string, latitude: number, longitude: number }|null>} */
export async function fetchPatientHomeByReportId(patientReportId) {
  if (!patientReportId) return null;

  const { data: report, error: reportErr } = await supabase
    .from('patient_reports')
    .select('reporter_user_id')
    .eq('id', patientReportId)
    .maybeSingle();
  if (reportErr) throw reportErr;
  const userId = report?.reporter_user_id;
  if (!userId) return null;

  const { data: profile, error: profileErr } = await supabase
    .from('patient_profiles')
    .select('home_address, home_latitude, home_longitude')
    .eq('user_id', userId)
    .maybeSingle();
  if (profileErr) throw profileErr;
  if (!profile) return null;

  const lat = Number(profile.home_latitude);
  const lng = Number(profile.home_longitude);
  const address = (profile.home_address ?? '').trim();
  if (!address || !Number.isFinite(lat) || !Number.isFinite(lng)) return null;

  return { address, latitude: lat, longitude: lng };
}

export function homeToHospitalPlace(home) {
  if (!home) return null;
  return {
    name: home.address,
    address: home.address,
    latitude: home.latitude,
    longitude: home.longitude,
    clinicId: null,
    source: 'home',
  };
}
