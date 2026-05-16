import { GOOGLE_MAPS_MAP_ID } from './googleMaps';

/**
 * Maps JavaScript API uses different tiles than maps.google.com (fewer default POIs).
 * These options keep road/POI labels visible for dispatch. Optional REACT_APP_GOOGLE_MAP_ID
 * enables newer vector maps (Google Cloud → Map Management).
 */
const POI_LABEL_STYLES = [
  { featureType: 'poi', elementType: 'labels', stylers: [{ visibility: 'on' }] },
  { featureType: 'poi.business', elementType: 'labels', stylers: [{ visibility: 'on' }] },
  { featureType: 'poi.medical', elementType: 'labels', stylers: [{ visibility: 'on' }] },
  { featureType: 'road', elementType: 'labels', stylers: [{ visibility: 'on' }] },
];

export const GOOGLE_MAP_DISPLAY_OPTIONS = {
  disableDefaultUI: true,
  zoomControl: true,
  gestureHandling: 'greedy',
  clickableIcons: true,
  maxZoom: 21,
};

export function buildGoogleMapOptions(overrides = {}) {
  const base = { ...GOOGLE_MAP_DISPLAY_OPTIONS, ...overrides };
  if (GOOGLE_MAPS_MAP_ID) {
    return { ...base, mapId: GOOGLE_MAPS_MAP_ID };
  }
  return { ...base, styles: POI_LABEL_STYLES };
}

/** Zoom when focusing clinic / incident (higher = more local labels). */
export const MAP_FOCUS_ZOOM = 18;
