import React, { useMemo } from 'react';
import {
  clinicToHospitalPlace,
  explainClinicsWithBedsEmpty,
  listClinicsForBedPicker,
  listClinicsWithBeds,
} from '../utils/clinicBedAvailability';

/**
 * Quick-pick list of registered clinics that report free beds.
 */
const ClinicsWithBedsPanel = ({
  clinics = [],
  patientLat,
  patientLng,
  selectedClinicId,
  dispatchClinicId,
  disabled = false,
  onSelectClinic,
}) => {
  const options = useMemo(
    () => ({
      patientLat: Number(patientLat),
      patientLng: Number(patientLng),
    }),
    [patientLat, patientLng]
  );

  const rows = useMemo(() => listClinicsWithBeds(clinics, options), [clinics, options]);
  const allRows = useMemo(() => listClinicsForBedPicker(clinics, options), [clinics, options]);
  const emptyHint = useMemo(() => explainClinicsWithBedsEmpty(clinics), [clinics]);
  const fullRows = useMemo(() => allRows.filter((row) => !row.hasFree), [allRows]);

  if (rows.length === 0) {
    return (
      <div className="clinics-with-beds clinics-with-beds--empty">
        <p className="clinics-with-beds__title">Clinics with beds</p>
        <p className="clinics-with-beds__empty">{emptyHint}</p>
        {fullRows.length > 0 ? (
          <>
            <p className="clinics-with-beds__empty clinics-with-beds__empty--secondary">
              These clinics track beds but report none free:
            </p>
            <ul className="clinics-with-beds__list">
              {fullRows.map(({ clinic, available, distanceKm }) => {
                const id = String(clinic.id);
                const isOwn = dispatchClinicId != null && String(dispatchClinicId) === id;
                return (
                  <li key={id}>
                    <div className="clinics-with-beds__item clinics-with-beds__item--full" aria-disabled="true">
                      <span className="clinics-with-beds__name">{clinic.name}</span>
                      <span className="clinics-with-beds__meta">
                        <span className="clinics-with-beds__beds clinics-with-beds__beds--full">Full</span>
                        {distanceKm != null ? (
                          <span className="clinics-with-beds__dist">
                            {distanceKm < 1
                              ? `${Math.round(distanceKm * 1000)} m`
                              : `${distanceKm.toFixed(1)} km`}
                          </span>
                        ) : null}
                        {isOwn ? <span className="clinics-with-beds__tag">You</span> : null}
                      </span>
                    </div>
                  </li>
                );
              })}
            </ul>
          </>
        ) : null}
      </div>
    );
  }

  return (
    <div className="clinics-with-beds">
      <p className="clinics-with-beds__title">Clinics with beds</p>
      <ul className="clinics-with-beds__list">
        {rows.map(({ clinic, available, distanceKm }) => {
          const id = String(clinic.id);
          const selected = selectedClinicId != null && String(selectedClinicId) === id;
          const isOwn = dispatchClinicId != null && String(dispatchClinicId) === id;

          return (
            <li key={id}>
              <button
                type="button"
                className={`clinics-with-beds__item${selected ? ' clinics-with-beds__item--selected' : ''}`}
                disabled={disabled}
                onClick={() => onSelectClinic?.(clinicToHospitalPlace(clinic))}
              >
                <span className="clinics-with-beds__name">{clinic.name}</span>
                <span className="clinics-with-beds__meta">
                  <span className="clinics-with-beds__beds">
                    {available} free
                  </span>
                  {distanceKm != null ? (
                    <span className="clinics-with-beds__dist">
                      {distanceKm < 1
                        ? `${Math.round(distanceKm * 1000)} m`
                        : `${distanceKm.toFixed(1)} km`}
                    </span>
                  ) : null}
                  {isOwn ? <span className="clinics-with-beds__tag">You</span> : null}
                </span>
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
};

export default ClinicsWithBedsPanel;
