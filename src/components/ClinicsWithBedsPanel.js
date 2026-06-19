import React, { useMemo } from 'react';
import { clinicToHospitalPlace, listClinicsWithBeds } from '../utils/clinicBedAvailability';

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
  const rows = useMemo(
    () =>
      listClinicsWithBeds(clinics, {
        patientLat: Number(patientLat),
        patientLng: Number(patientLng),
      }),
    [clinics, patientLat, patientLng]
  );

  if (rows.length === 0) {
    return (
      <div className="clinics-with-beds clinics-with-beds--empty">
        <p className="clinics-with-beds__title">Clinics with beds</p>
        <p className="clinics-with-beds__empty">
          No registered clinics report free beds. Clinics can set totals under Settings → Beds.
        </p>
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
