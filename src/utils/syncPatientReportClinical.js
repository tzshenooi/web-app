import { supabase } from '../supabaseClient';

/** Mirror clinical fields on the linked patient_reports row (clinic portal saves bookings first). */
export async function syncPatientReportClinical(booking, fields) {
  const reportId = booking?.patient_report_id;
  if (!reportId) return { error: null };

  const payload = {};
  if (fields.patient_id !== undefined) payload.patient_id = fields.patient_id;
  if (fields.hospital_name !== undefined) payload.hospital_name = fields.hospital_name;
  if (fields.destination_type !== undefined) payload.destination_type = fields.destination_type;

  if (Object.keys(payload).length === 0) return { error: null };

  const { error } = await supabase.from('patient_reports').update(payload).eq('id', reportId);
  return { error };
}
