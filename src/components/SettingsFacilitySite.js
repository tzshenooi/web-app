import React from 'react';
import ClinicAddressField from './ClinicAddressField';

/**
 * Facility site editor for Settings — compact card, no duplicate address block.
 */
export default function SettingsFacilitySite({
  facilityName,
  clinicLocationEdit,
  onPlaceSelected,
  onSubmit,
  saving,
  inputKey,
}) {
  const hasPin =
    clinicLocationEdit?.address &&
    Number.isFinite(clinicLocationEdit.latitude) &&
    Number.isFinite(clinicLocationEdit.longitude);

  return (
    <section className="settings-panel-card" aria-labelledby="settings-facility-heading">
      <header className="settings-panel-card__header">
        <h2 id="settings-facility-heading" className="settings-panel-card__title">
          Facility site
        </h2>
        {facilityName ? (
          <p className="settings-panel-card__meta" title={facilityName}>
            {facilityName}
          </p>
        ) : null}
      </header>

      <form className="settings-panel-card__body" onSubmit={onSubmit}>
        <div className="settings-field">
          <label className="settings-field__label" htmlFor="settings-clinic-address-search">
            Map location
          </label>
          <ClinicAddressField
            key={inputKey}
            inputId="settings-clinic-address-search"
            inputClassName="settings-input"
            value={clinicLocationEdit}
            onPlaceSelected={onPlaceSelected}
            placeholder="Search address…"
            disabled={saving}
            previewMode="pin-only"
          />
        </div>
        {hasPin ? (
          <p className="settings-pin-hint">Pin updates dispatch, fleet map, and ETAs.</p>
        ) : (
          <p className="settings-pin-hint settings-pin-hint--muted">Pick a suggestion to set the map pin.</p>
        )}

        <button type="submit" className="settings-save-btn" disabled={saving || !hasPin}>
          {saving ? 'Saving…' : 'Save location'}
        </button>
      </form>
    </section>
  );
}
