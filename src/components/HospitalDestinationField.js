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
    <div className="hospital-destination-field">
      <div className="mission-clinical-field">
        <label className="field-label">Registered clinic</label>
        <select
          className="modern-select"
          value={registeredId}
          onChange={(e) => selectRegisteredClinic(e.target.value)}
          style={{ width: '100%' }}
          disabled={disabled}
        >
          <option value="">Quick pick from registered clinics…</option>
          {routableClinics.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
              {c.specialty ? ` · ${c.specialty}` : ''}
            </option>
          ))}
        </select>
        {routableClinics.length === 0 ? (
          <p className="mission-clinical-field__hint">
            No registered clinics with map coordinates yet — use Google search below or set location under Settings.
          </p>
        ) : null}
      </div>

      <p
        className="facility-muted"
        style={{ textAlign: 'center', fontSize: '0.8rem', margin: '12px 0', opacity: 0.85 }}
      >
        — or search on Google Maps —
      </p>

      <div className="mission-clinical-field">
        <label className="field-label">Search hospital name</label>
        <HospitalSearchField
          inputId={`hospital-google-${bookingId}`}
          value={googleValue}
          disabled={disabled}
          placeholder="Search hospital name…"
          onPlaceSelected={selectGooglePlace}
        />
      </div>

      {value?.name && value?.source === 'registered' ? (
        <p className="facility-muted" style={{ marginTop: 8, fontSize: '0.85rem', lineHeight: 1.4 }}>
          <strong>{value.name}</strong>
          {value.address && value.address !== value.name ? (
            <>
              <br />
              {value.address}
            </>
          ) : null}
          {Number.isFinite(value.latitude) && Number.isFinite(value.longitude) ? (
            <>
              <br />
              <span style={{ opacity: 0.85 }}>
                {Number(value.latitude).toFixed(5)}, {Number(value.longitude).toFixed(5)}
              </span>
            </>
          ) : null}
          <br />
          <span className="facility-pill neutral" style={{ marginTop: 6, display: 'inline-block' }}>
            Registered clinic
          </span>
        </p>
      ) : null}
    </div>
  );
};

export default HospitalDestinationField;
