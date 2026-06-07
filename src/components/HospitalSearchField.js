import React from 'react';
import Autocomplete from 'react-google-autocomplete';
import { GOOGLE_MAPS_API_KEY } from '../config/googleMaps';

/**
 * Google Places hospital search — name + lat/lng like maps.google.com.
 */
const HospitalSearchField = ({
  value,
  onPlaceSelected,
  inputClassName = 'modern-input',
  placeholder = 'Search hospital name…',
  disabled = false,
  inputId,
}) => {
  if (!GOOGLE_MAPS_API_KEY) {
    return (
      <p className="facility-muted" style={{ fontSize: '0.85rem' }}>
        Add <code>REACT_APP_GOOGLE_MAPS_API_KEY</code> to <code>web-app/.env</code> to search hospitals.
      </p>
    );
  }

  const displayLabel = value?.name || value?.address || '';
  const hasCoords =
    Number.isFinite(value?.latitude) && Number.isFinite(value?.longitude);

  return (
    <>
      <Autocomplete
        key={displayLabel || 'empty-hospital'}
        id={inputId}
        apiKey={GOOGLE_MAPS_API_KEY}
        defaultValue={displayLabel}
        onPlaceSelected={(place) => {
          if (!place?.geometry?.location) return;
          const name =
            place.name ||
            place.formatted_address?.split(',')[0]?.trim() ||
            place.formatted_address ||
            '';
          onPlaceSelected({
            name,
            address: place.formatted_address || name,
            latitude: place.geometry.location.lat(),
            longitude: place.geometry.location.lng(),
          });
        }}
        options={{
          types: ['hospital'],
          componentRestrictions: { country: 'my' },
        }}
        className={inputClassName}
        placeholder={placeholder}
        disabled={disabled}
        style={{ width: '100%', marginBottom: 0 }}
      />
      {value?.name ? (
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
