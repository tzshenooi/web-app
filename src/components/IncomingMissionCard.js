import React, { useState } from 'react';
import MissionClinicalCard from './MissionClinicalCard';
import PatientReportAttachments from './PatientReportAttachments';
import InboundCriticalSummary from './InboundCriticalSummary';
import { incidentCategoryLabel } from '../constants/missionClinical';

/**
 * Incoming list row: patient name always visible; tap to show everything else.
 */
const IncomingMissionCard = ({ mission, viewerClinicId, onDispatch, onSaved }) => {
  const [open, setOpen] = useState(false);
  const b = mission.booking;
  const isInboundTransfer = mission.kind === 'transfer';
  const isClinicDispatch = mission.kind === 'clinic_dispatch';
  const patientSecured = b?.status === 'Picked Up';
  const showRoutingFields =
    !isInboundTransfer &&
    Boolean(b?.driver_id) &&
    (isClinicDispatch
      ? Boolean(b?.destination_type)
      : patientSecured && mission.kind === 'patient_report');
  const routingEditable =
    !isInboundTransfer && patientSecured && mission.ownsMission !== false;
  const awaitingDestination = showRoutingFields && !b?.destination_type;
  const emergencyLabel = b?.emergency_type
    ? incidentCategoryLabel(b.emergency_type)
    : null;
  const detailsPreview = b?.notes?.trim() || '';

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
              {emergencyLabel ? (
                <span className="facility-pill facility-pill--sm neutral">{emergencyLabel}</span>
              ) : null}
            </span>
          )}
        </div>
        <span className="incoming-mission-chevron" aria-hidden="true">
          {open ? '▾' : '▸'}
        </span>
      </button>
      {!open && detailsPreview ? (
        <p className="incoming-mission-details-preview">{detailsPreview}</p>
      ) : null}

      {open && (
        <div className="incoming-mission-details">
          {mission.driverName ? (
            <span className="unit-sub-text incoming-mission-driver">
              {isInboundTransfer ? `Ambulance: ${mission.driverName}` : mission.driverName}
            </span>
          ) : null}
          <div className="incoming-mission-pills">
            <span className="facility-pill facility-pill--sm">{mission.status}</span>
            <span className="facility-pill eta facility-pill--sm">
              {mission.kind === 'patient_report' || isClinicDispatch
                ? mission.eta
                : `ETA ${mission.eta}`}
            </span>
          </div>

          {isInboundTransfer && (
            <p className="incoming-mission-footnote">
              Incoming <strong>{mission.patientName}</strong> from{' '}
              <strong>{mission.sourceClinicName || 'another clinic'}</strong>.
            </p>
          )}

          {isInboundTransfer ? (
            <InboundCriticalSummary booking={b} />
          ) : (
            <MissionClinicalCard
              booking={b}
              compact
              editable={routingEditable}
              viewerClinicId={viewerClinicId}
              showIntakeFields={mission.kind === 'patient_report' && !showRoutingFields}
              showRoutingFields={showRoutingFields && (isClinicDispatch || mission.ownsMission !== false)}
              onSaved={onSaved}
            />
          )}

          {showRoutingFields && mission.ownsMission === false && (
            <p className="incoming-mission-footnote">
              This mission is managed by another clinic. You will see it here only when the patient is
              routed to your facility.
            </p>
          )}

          {b?.patient_report_id && (
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
