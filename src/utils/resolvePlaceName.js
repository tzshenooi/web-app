/**
 * Best display name from a Google Places result (Autocomplete onPlaceSelected).
 * Prefer establishment name — not street number or road name.
 */
export function resolveGooglePlaceName(place, suggestionText = '') {
  const fromSuggestion = resolveNameFromAutocompleteInput(suggestionText);
  if (fromSuggestion) return fromSuggestion;

  if (!place) return '';

  const rawName = String(place.name || '').trim();
  if (rawName && !looksLikeStreetOrNumber(rawName)) {
    return rawName;
  }

  const components = place.address_components || [];
  const preferTypes = ['establishment', 'hospital', 'point_of_interest'];

  for (const type of preferTypes) {
    const match = components.find((c) => c.types?.includes(type));
    const label = match?.long_name?.trim();
    if (label && !looksLikeStreetOrNumber(label)) return label;
  }

  const parts = String(place.formatted_address || '')
    .split(',')
    .map((p) => p.trim())
    .filter(Boolean);

  for (const part of parts) {
    if (!looksLikeStreetOrNumber(part)) return part;
  }

  if (rawName && !looksLikeStreetOrNumber(rawName)) return rawName;
  return 'Selected clinic';
}

/** Text shown in the search box after picking a suggestion — usually the hospital name. */
export function resolveNameFromAutocompleteInput(inputValue) {
  const raw = String(inputValue || '').trim();
  if (!raw) return '';

  const segments = raw
    .split(',')
    .map((p) => p.trim())
    .filter(Boolean);

  for (const part of segments) {
    if (looksLikeStreetOrNumber(part)) continue;
    if (/hospital|klinik|clinic|medical centre|medical center/i.test(part)) return part;
  }

  const first = segments[0];
  if (first && !looksLikeStreetOrNumber(first)) return first;

  return '';
}

export function resolveGooglePlaceAddress(place, displayName) {
  const formatted = String(place?.formatted_address || '').trim();
  if (formatted) return formatted;
  return displayName || '';
}

export function looksLikeStreetOrNumber(text) {
  const t = String(text || '').trim();
  if (!t) return true;
  if (/^\d+[a-z]?$/i.test(t)) return true;
  if (/^(no\.?\s*)?\d+[a-z]?\s*$/i.test(t)) return true;
  if (/\b(jln\.?|jalan|lorong|lebuh|persiaran|street|st\.?|road|rd\.?)\b/i.test(t)) return true;
  return false;
}

/** Fetch full place details so `name` is the hospital, not the street. */
export function fetchGooglePlaceDetails(placeId) {
  return new Promise((resolve) => {
    if (!placeId || typeof window === 'undefined') {
      resolve(null);
      return;
    }
    const g = window.google;
    if (!g?.maps?.places) {
      resolve(null);
      return;
    }
    const service = new g.maps.places.PlacesService(document.createElement('div'));
    service.getDetails(
      {
        placeId,
        fields: ['name', 'formatted_address', 'geometry', 'address_components', 'place_id'],
      },
      (result, status) => {
        if (status === g.maps.places.PlacesServiceStatus.OK && result) {
          resolve(result);
        } else {
          resolve(null);
        }
      }
    );
  });
}
