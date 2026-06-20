/** Whether a booking belongs to this clinic (dispatch / patient report / transfer). */
export function scopeBookingToClinic(booking, clinicId, driverIdsAtClinic = []) {
  if (!booking || !clinicId) return false;
  const cid = String(clinicId);
  const assigned = booking.assigned_clinic_id
    ? String(booking.assigned_clinic_id)
    : null;

  // Claimed missions belong only to the clinic that took them.
  if (assigned) {
    return assigned === cid;
  }

  if (booking.destination_clinic_id && String(booking.destination_clinic_id) === cid) {
    return true;
  }

  if (booking.driver_id && driverIdsAtClinic.includes(booking.driver_id)) {
    return true;
  }

  // Unclaimed patient reports are broadcast; once a driver is dispatched, only that driver's clinic sees it.
  if (booking.patient_report_id) {
    if (booking.driver_id) {
      return driverIdsAtClinic.includes(booking.driver_id);
    }
    return true;
  }

  // Pilot: scheduled rows without clinic id still show for the logged-in facility.
  if (booking.status === 'Scheduled' || booking.booking_kind === 'scheduled') {
    return true;
  }

  return false;
}

/** True when this clinic owns the active patient-report mission (may set destination). */
export function clinicOwnsPatientMission(booking, clinicId, driverIdsAtClinic = []) {
  if (!booking || !clinicId) return false;
  const cid = String(clinicId);
  if (booking.assigned_clinic_id) {
    return String(booking.assigned_clinic_id) === cid;
  }
  if (booking.driver_id && driverIdsAtClinic.includes(booking.driver_id)) {
    return true;
  }
  return !booking.driver_id && Boolean(booking.patient_report_id);
}
