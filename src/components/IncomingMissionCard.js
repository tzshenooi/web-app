import React, { useState } from 'react';
import MissionClinicalCard from './MissionClinicalCard';
import PatientReportAttachments from './PatientReportAttachments';

/**
 * Incoming list row: patient name always visible; tap to show everything else.
 */
const IncomingMissionCard = ({ mission, onDispatch, onSaved }) => {
  const [open, setOpen] = useState(false);
  const b = mission.booking;
  const patientSecured = b?.status === 'Picked Up';
  const showRoutingFields =
    patientSecured &&
    (mission.kind === 'transfer' || (mission.kind === 'patient_report' && Boolean(b?.driver_id)));

  return (
    <div className="unit-card-new incoming-mission-card" style={{ cursor: 'default' }}>
      <button
        type="button"
        className="incoming-mission-name-row"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
      >
        <strong className="unit-name-text">{mission.patientName}</strong>
        <span className="incoming-mission-chevron" aria-hidden="true">
          {open ? '▾' : '▸'}
        </span>
      </button>

      {open && (
        <div className="incoming-mission-details">
          {mission.driverName ? (
            <span className="unit-sub-text">{mission.driverName}</span>
          ) : null}
          <div style={{ display: 'flex', gap: '8px', marginTop: '10px', flexWrap: 'wrap' }}>
            <span className="facility-pill">{mission.status}</span>
            <span className="facility-pill eta">
              {mission.kind === 'patient_report' ? mission.eta : `ETA ${mission.eta}`}
            </span>
          </div>

          <MissionClinicalCard
            booking={b}
            showIntakeFields={mission.kind === 'patient_report'}
            showRoutingFields={showRoutingFields}
            onSaved={onSaved}
          />

          {mission.kind === 'patient_report' && b?.patient_report_id && (
            <PatientReportAttachments patientReportId={b.patient_report_id} />
          )}

          {mission.kind === 'patient_report' && !b?.driver_id && (
            <button
              type="button"
              className="confirm-btn"
              style={{ marginTop: 10 }}
              onClick={() => onDispatch(mission)}
            >
              Send ambulance
            </button>
          )}

          {mission.kind === 'patient_report' && b?.driver_id && !patientSecured && (
            <p className="facility-muted" style={{ fontSize: '0.8rem', marginTop: 10 }}>
              Hospital and destination appear here after the driver secures the patient on scene.
            </p>
          )}
          {mission.kind === 'patient_report' && b?.driver_id && patientSecured && (
            <p className="facility-muted" style={{ fontSize: '0.8rem', marginTop: 10 }}>
              {b?.destination_type
                ? 'Record stays until the driver completes discharge. You can edit anytime.'
                : 'Complete destination and hospital below. Record removes after driver completes discharge.'}
            </p>
          )}
        </div>
      )}
    </div>
  );
};

export default IncomingMissionCard;
