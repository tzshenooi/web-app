import React from 'react';

import ClinicAddressField from './ClinicAddressField';



/**

 * Facility site editor for Settings.

 */

export default function SettingsFacilitySite({

  compact = false,

  facilityName,

  clinicLocationEdit,

  clinicPhone,

  onPhoneChange,

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

    <section

      className={`settings-card${compact ? ' settings-card--flat' : ''}`}

      aria-labelledby={compact ? undefined : 'settings-facility-heading'}

    >

      {!compact ? (

        <header className="settings-card__header">

          <h2 id="settings-facility-heading" className="settings-card__title">

            Facility site

          </h2>

          {facilityName ? (

            <p className="settings-card__meta" title={facilityName}>

              {facilityName}

            </p>

          ) : null}

        </header>

      ) : null}



      <form className="settings-card__body" onSubmit={onSubmit}>

        {compact && facilityName ? (

          <p className="settings-card__facility-name">{facilityName}</p>

        ) : null}

        <div className="settings-field">

          <label className="settings-field__label" htmlFor="settings-clinic-phone">

            Patient contact phone

          </label>

          <input

            id="settings-clinic-phone"

            className="settings-input"

            type="tel"

            autoComplete="tel"

            inputMode="tel"

            value={clinicPhone ?? ''}

            onChange={(e) => onPhoneChange?.(e.target.value)}

            placeholder="e.g. +60123456789"

            disabled={saving}

          />

          <p className="settings-hint settings-hint--muted">

            Patients slide to call this number in the mobile app.

          </p>

        </div>

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

          <p className="settings-hint">Pin updates dispatch, fleet map, and ETAs.</p>

        ) : (

          <p className="settings-hint settings-hint--muted">Pick a suggestion to set the map pin.</p>

        )}



        <button type="submit" className="confirm-btn" disabled={saving || !hasPin}>

          {saving ? 'Saving…' : 'Save clinic details'}

        </button>

      </form>

    </section>

  );

}


