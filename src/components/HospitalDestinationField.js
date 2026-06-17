import React from 'react';
import HospitalSearchField from './HospitalSearchField';
import { clinicHasMapPosition, matchClinicByName } from '../utils/clinicRouting';

/**
 * Hybrid destination picker: registered clinic dropdown OR Google Maps hospital search.
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
  const routableClinics = (clinics || []).filter(clinicHasMapPosition);
  const registeredId =
    value?.source === 'registered' && value?.clinicId ? String(value.clinicId) : '';

  const selectRegisteredClinic = (clinicId) => {
    if (!clinicId) {
      onChange(null);
      return;
    }
    const clinic = routableClinics.find((c) => String(c.id) === String(clinicId));
    if (!clinic) return;
    const lat = Number(clinic.latitude ?? clinic.lat);
    const lng = Number(clinic.longitude ?? clinic.lng);
    onChange({
      name: clinic.name,
      address: clinic.address || clinic.name,
      latitude: lat,
      longitude: lng,
      clinicId: clinic.id,
      source: 'registered',
    });
  };

  const selectGooglePlace = (place) => {
    const matched = matchClinicByName(clinics, place.name);
    onChange({
      ...place,
      clinicId: matched?.id ?? null,
      source: 'google',
    });
  };

  const googleValue = value?.source === 'google' ? value : null;

  return (
    <div className={`hospital-destination-field${compact ? ' hospital-destination-field--compact' : ''}`}>
      <select
        className="modern-select"
        value={registeredId}
        onChange={(e) => selectRegisteredClinic(e.target.value)}
        style={{ width: '100%' }}
        disabled={disabled}
        aria-label="Registered clinic"
      >
        <option value="">{compact ? 'Registered clinic…' : 'Quick pick from registered clinics…'}</option>
        {routableClinics.map((c) => (
          <option key={c.id} value={c.id}>
            {c.name}
            {c.specialty && !compact ? ` · ${c.specialty}` : ''}
          </option>
        ))}
      </select>

      <span className="hospital-destination-field__or" aria-hidden="true">or</span>

      <HospitalSearchField
        inputId={`hospital-google-${bookingId}`}
        value={googleValue}
        disabled={disabled}
        placeholder={compact ? 'Search Google Maps…' : 'Search hospital name…'}
        hideSummary
        showSelectionInInput={false}
        onPlaceSelected={selectGooglePlace}
      />

      {value?.name ? (
        <div className="hospital-destination-field__selected" title={value.address || value.name}>
          <span className="hospital-destination-field__selected-name">{value.name}</span>
          {value.source === 'registered' ? (
            <span className="hospital-destination-field__tag">Registry</span>
          ) : value.source === 'google' ? (
            <span className="hospital-destination-field__tag">Maps</span>
          ) : null}
        </div>
      ) : null}
    </div>
  );
};

export default HospitalDestinationField;
