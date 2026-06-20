/** Lat/lng for map routing from a clinics row. */
export function clinicMapPosition(clinic) {
  if (!clinic) return null;
  const lat = Number(clinic.latitude ?? clinic.lat);
  const lng = Number(clinic.longitude ?? clinic.lng);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  return { lat, lng };
}

export function clinicHasMapPosition(clinic) {
  return clinicMapPosition(clinic) != null;
}

/** After pickup: hospital coords from clinic link or Google Places fields; else patient scene. */
export function resolveBookingMapDestination(booking, clinicsList) {
  if (!booking) return null;

  if (booking.status === 'Picked Up') {
    if (booking.destination_clinic_id != null) {
      const clinic = (clinicsList || []).find(
        (x) => String(x.id) === String(booking.destination_clinic_id)
      );
      const pos = clinicMapPosition(clinic);
      if (pos) {
        return {
          ...pos,
          label: clinic?.name || booking.hospital_name || 'Clinic',
        };
      }
    }

    const dLat = Number(booking.destination_latitude);
    const dLng = Number(booking.destination_longitude);
    if (Number.isFinite(dLat) && Number.isFinite(dLng)) {
      return {
        lat: dLat,
        lng: dLng,
        label: booking.hospital_name || 'Clinic',
      };
    }
  }

  const lat = Number(booking.latitude);
  const lng = Number(booking.longitude);
  if (Number.isFinite(lat) && Number.isFinite(lng)) {
    return {
      lat,
      lng,
      label: booking.location || 'Incident location',
    };
  }
  return null;
}

/** Include destination hospitals on the map even when scoped to one dispatch clinic. */
export function mergeClinicsForActiveMissions(scopedClinics, allClinics, bookings) {
  const byId = new Map((scopedClinics || []).map((c) => [String(c.id), c]));
  for (const b of bookings || []) {
    if (b.status !== 'Picked Up' || !b.destination_clinic_id) continue;
    const id = String(b.destination_clinic_id);
    if (byId.has(id)) continue;
    const row = (allClinics || []).find((c) => String(c.id) === id);
    if (row) byId.set(id, row);
  }
  return [...byId.values()];
}

/** Match free-text hospital name to a registered clinic. */
export function matchClinicByName(clinics, name) {
  const q = (name || '').trim().toLowerCase();
  if (!q) return null;
  return (clinics || []).find((c) => (c.name || '').trim().toLowerCase() === q) ?? null;
}

export function isHospitalDestinationType(type) {
  return type === 'public_hospital' || type === 'private_hospital';
}

/** Map clinic registration (`private` / `public`) → mission destination type. */
export function destinationTypeForClinic(clinic) {
  const t = (clinic?.clinic_type ?? '').toString().toLowerCase();
  if (t === 'public') return 'public_hospital';
  if (t === 'private') return 'private_hospital';
  return 'private_hospital';
}
