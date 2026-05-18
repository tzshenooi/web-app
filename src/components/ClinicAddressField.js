import React from 'react';
import Autocomplete from 'react-google-autocomplete';
import { GOOGLE_MAPS_API_KEY } from '../config/googleMaps';

/**
 * Google Places address search → formatted address + lat/lng for clinics.
 * @param {'full'|'pin-only'|'none'} previewMode — full: address + coords; pin-only: coords chip only; none: hidden
 */
const ClinicAddressField = ({
  value,
  onPlaceSelected,
  inputClassName = 'auth-input',
  placeholder = 'Search clinic address…',
  disabled = false,
  inputId,
  previewMode = 'full',
}) => {
  if (!GOOGLE_MAPS_API_KEY) {
    return (
      <p className="facility-muted" style={{ fontSize: '0.85rem' }}>
        Add <code>REACT_APP_GOOGLE_MAPS_API_KEY</code> to <code>web-app/.env</code> to search addresses.
      </p>
    );
  }

  const hasCoords =
    value?.address &&
    Number.isFinite(value.latitude) &&
    Number.isFinite(value.longitude);

  const inputStyle =
    inputClassName === 'modern-input' || inputClassName === 'settings-input'
      ? { width: '100%', marginBottom: 0 }
      : undefined;

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
        style={inputStyle}
      />
      {previewMode === 'full' && value?.address ? (
        <p className="facility-muted" style={{ marginTop: 8, fontSize: '0.85rem', lineHeight: 1.4 }}>
          {value.address}
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
      {previewMode === 'pin-only' && hasCoords ? (
        <div className="settings-pin-chip" role="status">
          <span className="settings-pin-chip__dot" aria-hidden="true" />
          <span className="settings-pin-chip__coords">
            {Number(value.latitude).toFixed(5)}, {Number(value.longitude).toFixed(5)}
          </span>
        </div>
      ) : null}
    </>
  );
};

export default ClinicAddressField;
