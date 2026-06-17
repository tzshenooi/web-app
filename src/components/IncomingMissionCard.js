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
  const awaitingDestination = showRoutingFields && !b?.destination_type;

  return (
    <div className="unit-card-new incoming-mission-card" style={{ cursor: 'default' }}>
      <button
        type="button"
        className="incoming-mission-name-row"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
      >
        <div className="incoming-mission-name-block">
          <strong className="unit-name-text">{mission.patientName}</strong>
          {!open && (
            <span className="incoming-mission-name-meta">
              <span className="facility-pill facility-pill--sm">{mission.status}</span>
            </span>
          )}
        </div>
        <span className="incoming-mission-chevron" aria-hidden="true">
          {open ? '▾' : '▸'}
        </span>
      </button>

      {open && (
        <div className="incoming-mission-details">
          {mission.driverName ? (
            <span className="unit-sub-text incoming-mission-driver">{mission.driverName}</span>
          ) : null}
          <div className="incoming-mission-pills">
            <span className="facility-pill facility-pill--sm">{mission.status}</span>
            <span className="facility-pill eta facility-pill--sm">
              {mission.kind === 'patient_report' ? mission.eta : `ETA ${mission.eta}`}
            </span>
          </div>

          <MissionClinicalCard
            booking={b}
            compact
            showIntakeFields={mission.kind === 'patient_report' && !showRoutingFields}
            showRoutingFields={showRoutingFields}
            onSaved={onSaved}
          />

          {mission.kind === 'patient_report' && b?.patient_report_id && (
            <PatientReportAttachments patientReportId={b.patient_report_id} />
          )}

          {mission.kind === 'patient_report' && !b?.driver_id && (
            <button
              type="button"
              className="confirm-btn incoming-mission-action"
              onClick={() => onDispatch(mission)}
            >
              Send ambulance
            </button>
          )}

          {awaitingDestination && (
            <p className="incoming-mission-footnote">Set destination below, then save.</p>
          )}
        </div>
      )}
    </div>
  );
};

export default IncomingMissionCard;
