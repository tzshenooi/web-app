import { resolveBookingMapDestination } from './clinicRouting';

const ACTIVE_MISSION_STATUSES = ['Pending', 'Accepted', 'Assigned', 'En Route', 'Picked Up'];

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

function missionDestination(booking, clinics) {
  return resolveBookingMapDestination(booking, clinics);
}

export function statusDotClass(status) {
  const s = String(status || '').toLowerCase();
  if (s === 'available') return 'available';
  if (s === 'busy' || s === 'en route' || s === 'picked up') return 'busy';
  return 'offline';
}

export function formatDriverStatus(status) {
  const s = String(status || 'Unknown').trim();
  return s || 'Unknown';
}

export function computeEtaMinutes(driver, dest) {
  const dLat = Number(driver?.current_lat);
  const dLng = Number(driver?.current_lng);
  if (!dest || !Number.isFinite(dLat) || !Number.isFinite(dLng)) return null;
  const km = toKm(dLat, dLng, dest.lat, dest.lng);
  return Math.max(1, Math.round((km / 45) * 60));
}

/**
 * Live fleet rows for clinic portal (status + mission + ETA).
 * @param {object|null} clinic - Dispatch clinic (fallback when clinics list omitted)
 * @param {object[]|null} clinics - All clinics for destination lookup after pickup
 */
export function buildDriverFleetRows(drivers, bookings, clinic, clinics = null) {
  const clinicList = clinics?.length ? clinics : clinic ? [clinic] : [];

  return (drivers || []).map((driver) => {
    const activeBooking = (bookings || []).find(
      (b) => b.driver_id === driver.id && ACTIVE_MISSION_STATUSES.includes(b.status)
    );

    const status = formatDriverStatus(driver.status);
    const dotClass = statusDotClass(driver.status);

    let etaMinutes = null;
    let etaLabel = 'On standby';
    let destLabel = null;

    if (activeBooking) {
      const dest = missionDestination(activeBooking, clinicList);
      destLabel = dest?.label ?? activeBooking.location ?? 'Mission';
      etaMinutes = computeEtaMinutes(driver, dest);
      if (etaMinutes != null) etaLabel = `${etaMinutes} min`;
      else if (driver.current_lat == null || driver.current_lng == null) etaLabel = 'GPS unavailable';
      else etaLabel = 'Calculating…';
    }

    const hasGps =
      driver.current_lat != null &&
      driver.current_lng != null &&
      Number.isFinite(Number(driver.current_lat)) &&
      Number.isFinite(Number(driver.current_lng));

    return {
      driver,
      activeBooking,
      status,
      dotClass,
      etaLabel,
      etaMinutes,
      destLabel,
      hasGps,
      mapPosition: hasGps ? { lat: Number(driver.current_lat), lng: Number(driver.current_lng) } : null,
    };
  });
}
