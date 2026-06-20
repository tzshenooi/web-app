/** Placeholder when NRIC / hospital no. is not known at dispatch (update after on-scene). */
export const UNKNOWN_PATIENT_ID = 'UNKNOWN';

/** Advance / bedridden booking waiting for clinic to dispatch ambulance. */
export const SCHEDULED_BOOKING_STATUS = 'Scheduled';

/** Clinic Incoming + fleet: mission still in progress (hidden after driver completes discharge). */
export const ACTIVE_CLINIC_MISSION_STATUSES = ['Pending', 'Assigned', 'Accepted', 'En Route', 'Picked Up'];

export function isScheduledBooking(booking) {
  return booking?.status === SCHEDULED_BOOKING_STATUS || booking?.booking_kind === 'scheduled';
}

export function formatScheduledPickup(iso) {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleString('en-MY', {
      weekday: 'short',
      dateStyle: 'medium',
      timeStyle: 'short',
    });
  } catch {
    return String(iso);
  }
}

export function isActiveClinicMission(status) {
  return ACTIVE_CLINIC_MISSION_STATUSES.includes(status);
}

/** Labels for patient-report cards on clinic Incoming. */
export function patientReportMissionDisplay(booking) {
  if (!booking?.driver_id) {
    return { statusLabel: 'New report', etaLabel: 'Awaiting dispatch' };
  }
  switch (booking.status) {
    case 'Pending':
    case 'Assigned':
      return { statusLabel: 'Dispatched', etaLabel: 'Awaiting driver ack' };
    case 'Accepted':
    case 'En Route':
      return { statusLabel: booking.status, etaLabel: 'En route to patient' };
    case 'Picked Up':
      return { statusLabel: 'Picked up', etaLabel: 'En route to destination' };
    default:
      return { statusLabel: booking.status || 'Active', etaLabel: 'In progress' };
  }
}

export const DESTINATION_TYPES = [
  { value: 'public_hospital', label: 'Public', medicationDefault: true },
  { value: 'house', label: 'House / home', medicationDefault: false },
  { value: 'private_hospital', label: 'Private', medicationDefault: false },
];

export function destinationLabel(value) {
  return DESTINATION_TYPES.find((d) => d.value === value)?.label ?? value ?? '—';
}

export function medicationDefaultForDestination(value) {
  const row = DESTINATION_TYPES.find((d) => d.value === value);
  return row ? row.medicationDefault : null;
}

export function toDatetimeLocalValue(iso) {
  if (!iso) return '';
  try {
    const d = new Date(iso);
    const pad = (n) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  } catch {
    return '';
  }
}

export function formatMissionTime(iso) {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleString('en-MY', {
      dateStyle: 'short',
      timeStyle: 'short',
    });
  } catch {
    return String(iso);
  }
}

const INCIDENT_CATEGORY_LABELS = {
  fire: 'Fire',
  crime: 'Crime',
  medical_aid: 'Medical Aid',
  humanitarian_aid: 'Humanitarian Aid',
  sea_emergency: 'Sea Emergency',
};

/** Patient app `incident_category` → display label. */
export function incidentCategoryLabel(key) {
  if (!key) return '—';
  const k = String(key).trim();
  return INCIDENT_CATEGORY_LABELS[k] || k.replace(/_/g, ' ');
}
