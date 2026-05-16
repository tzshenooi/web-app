/** Whether a booking belongs to this clinic (dispatch / patient report / transfer). */
export function scopeBookingToClinic(booking, clinicId, driverIdsAtClinic = []) {
  if (!booking || !clinicId) return false;
  const cid = String(clinicId);
  if (booking.assigned_clinic_id && String(booking.assigned_clinic_id) === cid) return true;
  if (booking.destination_clinic_id && String(booking.destination_clinic_id) === cid) return true;
  if (booking.driver_id && driverIdsAtClinic.includes(booking.driver_id)) return true;
  if (booking.patient_report_id && !booking.assigned_clinic_id) return true;
  return false;
}
