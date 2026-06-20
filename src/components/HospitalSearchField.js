import React from 'react';
import Autocomplete from 'react-google-autocomplete';
import { GOOGLE_MAPS_API_KEY } from '../config/googleMaps';
import {
  fetchGooglePlaceDetails,
  resolveGooglePlaceAddress,
  resolveGooglePlaceName,
} from '../utils/resolvePlaceName';

/**
 * Google Places hospital search — name + lat/lng like maps.google.com.
 */
const HospitalSearchField = ({
  value,
  onPlaceSelected,
  inputClassName = 'modern-input',
  placeholder = 'Search clinic name…',
  disabled = false,
  inputId,
  hideSummary = false,
  showSelectionInInput = true,
}) => {
  if (!GOOGLE_MAPS_API_KEY) {
    return (
      <p className="facility-muted" style={{ fontSize: '0.85rem' }}>
        Add <code>REACT_APP_GOOGLE_MAPS_API_KEY</code> to <code>web-app/.env</code> to search clinics.
      </p>
    );
  }

  const displayLabel = showSelectionInInput ? value?.name || '' : '';
  const hasCoords =
    Number.isFinite(value?.latitude) && Number.isFinite(value?.longitude);

  const handlePlaceSelected = async (place, inputEl) => {
    if (!place?.geometry?.location) return;

    const suggestionText = inputEl?.value || '';

    let details = place;
    if (place.place_id) {
      const full = await fetchGooglePlaceDetails(place.place_id);
      if (full) details = full;
    }

    const latFn = details.geometry?.location?.lat;
    const lngFn = details.geometry?.location?.lng;
    const latitude = typeof latFn === 'function' ? latFn() : place.geometry.location.lat();
    const longitude = typeof lngFn === 'function' ? lngFn() : place.geometry.location.lng();

    const name = resolveGooglePlaceName(details, suggestionText);
    onPlaceSelected({
      name,
      address: resolveGooglePlaceAddress(details, name),
      latitude,
      longitude,
    });
  };

  return (
    <>
      <Autocomplete
        key={showSelectionInInput ? displayLabel || 'empty-hospital' : inputId || 'hospital-search'}
        id={inputId}
        apiKey={GOOGLE_MAPS_API_KEY}
        defaultValue={displayLabel}
        onPlaceSelected={handlePlaceSelected}
        options={{
          types: ['hospital'],
          componentRestrictions: { country: 'my' },
        }}
        className={inputClassName}
        placeholder={placeholder}
        disabled={disabled}
        style={{ width: '100%', marginBottom: 0 }}
      />
      {!hideSummary && value?.name ? (
        <p className="facility-muted" style={{ marginTop: 8, fontSize: '0.85rem', lineHeight: 1.4 }}>
          <strong>{value.name}</strong>
          {value.address && value.address !== value.name ? (
            <>
              <br />
              {value.address}
            </>
          ) : null}
          {hasCoords ? (
            <>
              <br />
              <span style={{ opacity: 0.85 }}>
                {Number(value.latitude).toFixed(5)}, {Number(value.longitude).toFixed(5)}
              </span>
            </>
          ) : null}
        </p>
      ) : null}
    </>
  );
};

export default HospitalSearchField;
