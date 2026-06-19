import { clinicHasMapPosition, clinicMapPosition } from './clinicRouting';

export function clinicAvailableBeds(clinic) {
  const cap = Number(clinic?.bed_capacity ?? 0);
  const occ = Number(clinic?.beds_occupied ?? 0);
  if (!Number.isFinite(cap) || cap <= 0) return null;
  const occupied = Number.isFinite(occ) ? Math.max(0, Math.min(occ, cap)) : 0;
  return Math.max(0, cap - occupied);
}

export function toKm(lat1, lng1, lat2, lng2) {
  const toRad = (d) => (d * Math.PI) / 180;
  const R = 6371;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) * Math.sin(dLng / 2);
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

/**
 * Registered clinics reporting free beds, sorted by most available then nearest.
 */
export function listClinicsWithBeds(clinics, { patientLat, patientLng } = {}) {
  const hasPatient =
    Number.isFinite(patientLat) && Number.isFinite(patientLng);

  const rows = (clinics || [])
    .filter((c) => clinicHasMapPosition(c))
    .map((c) => {
      const available = clinicAvailableBeds(c);
      if (available == null || available <= 0) return null;
      const pos = clinicMapPosition(c);
      const distanceKm = hasPatient
        ? toKm(patientLat, patientLng, pos.lat, pos.lng)
        : null;
      return {
        clinic: c,
        available,
        distanceKm,
      };
    })
    .filter(Boolean);

  rows.sort((a, b) => {
    if (b.available !== a.available) return b.available - a.available;
    if (a.distanceKm != null && b.distanceKm != null) return a.distanceKm - b.distanceKm;
    return (a.clinic.name || '').localeCompare(b.clinic.name || '');
  });

  return rows;
}

export function clinicToHospitalPlace(clinic) {
  if (!clinic || !clinicHasMapPosition(clinic)) return null;
  const lat = Number(clinic.latitude ?? clinic.lat);
  const lng = Number(clinic.longitude ?? clinic.lng);
  return {
    name: clinic.name,
    address: clinic.address || clinic.name,
    latitude: lat,
    longitude: lng,
    clinicId: clinic.id,
    source: 'registered',
  };
}
