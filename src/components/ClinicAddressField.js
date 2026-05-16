import React from 'react';
import Autocomplete from 'react-google-autocomplete';
import { GOOGLE_MAPS_API_KEY } from '../config/googleMaps';

/**
 * Google Places address search → formatted address + lat/lng for clinics.
 * @param {{ address?: string, latitude?: number, longitude?: number } | null} value
 * @param {(loc: { address: string, latitude: number, longitude: number }) => void} onPlaceSelected
 */
const ClinicAddressField = ({
  value,
  onPlaceSelected,
  inputClassName = 'auth-input',
  placeholder = 'Search clinic address…',
  disabled = false,
  inputId,
}) => {
  if (!GOOGLE_MAPS_API_KEY) {
    return (
      <p className="facility-muted" style={{ fontSize: '0.85rem' }}>
        Add <code>REACT_APP_GOOGLE_MAPS_API_KEY</code> to <code>web-app/.env</code> to search addresses.
      </p>
    );
  }

  return (
    <>
      <Autocomplete
        key={value?.address ?? 'empty'}
        id={inputId}
        apiKey={GOOGLE_MAPS_API_KEY}
        defaultValue={value?.address ?? ''}
        onPlaceSelected={(place) => {
          if (!place?.geometry?.location) return;
          onPlaceSelected({
            address: place.formatted_address || place.name || '',
            latitude: place.geometry.location.lat(),
            longitude: place.geometry.location.lng(),
          });
        }}
        options={{
          types: ['geocode'],
          componentRestrictions: { country: 'my' },
        }}
        className={inputClassName}
        placeholder={placeholder}
        disabled={disabled}
        style={inputClassName === 'modern-input' ? { width: '100%', marginBottom: 0 } : undefined}
      />
      {value?.address ? (
        <p className="facility-muted" style={{ marginTop: 8, fontSize: '0.85rem', lineHeight: 1.4 }}>
          {value.address}
          {Number.isFinite(value.latitude) && Number.isFinite(value.longitude) ? (
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

export default ClinicAddressField;
