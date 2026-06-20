import React from 'react';
import HospitalSearchField from './HospitalSearchField';
import { matchClinicByName } from '../utils/clinicRouting';

/**
 * Google Maps hospital search fallback (registered clinics are picked from ClinicsWithBedsPanel).
 * @param {{ name, address, latitude, longitude, clinicId, source }|null} value
 * @param {'registered'|'google'} value.source
 */
const HospitalDestinationField = ({
  value,
  onChange,
  clinics = [],
  disabled = false,
  bookingId,
  compact = false,
}) => {
  const selectGooglePlace = (place) => {
    const matched = matchClinicByName(clinics, place.name);
    onChange({
      ...place,
      clinicId: matched?.id ?? null,
      source: 'google',
    });
  };

  const googleValue = value?.source === 'google' ? value : null;
  const showGoogleChip = value?.source === 'google' && value?.name;

  return (
    <div className={`hospital-destination-field${compact ? ' hospital-destination-field--compact' : ''}`}>
      <span className="hospital-destination-field__or" aria-hidden="true">
        {compact ? 'or' : 'Or search Google Maps'}
      </span>

      <HospitalSearchField
        inputId={`hospital-google-${bookingId}`}
        value={googleValue}
        disabled={disabled}
        placeholder={compact ? 'Search Google Maps…' : 'Search clinic name…'}
        hideSummary
        showSelectionInInput={false}
        onPlaceSelected={selectGooglePlace}
      />

      {showGoogleChip ? (
        <div className="hospital-destination-field__selected" title={value.address || value.name}>
          <span className="hospital-destination-field__selected-name">{value.name}</span>
          <span className="hospital-destination-field__tag">Maps</span>
        </div>
      ) : null}
    </div>
  );
};

export default HospitalDestinationField;
