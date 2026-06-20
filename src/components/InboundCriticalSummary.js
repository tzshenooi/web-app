import React from 'react';
import PatientReportIntakeSummary from './PatientReportIntakeSummary';
import { incidentCategoryLabel, UNKNOWN_PATIENT_ID } from '../constants/missionClinical';

function CriticalRow({ label, value, multiline = false }) {
  const text = value?.toString().trim();
  if (!text) return null;
  return (
    <div className={`mission-clinical-row${multiline ? ' mission-clinical-row--multiline' : ''}`}>
      <dt>{label}</dt>
      <dd>{text}</dd>
    </div>
  );
}

/** Read-only essentials for a clinic receiving an inbound transfer. */
export default function InboundCriticalSummary({ booking }) {
  if (!booking) return null;

  const patientId = booking.patient_id?.trim();
  const showPatientId = patientId && patientId !== UNKNOWN_PATIENT_ID;
  const pickup = booking.location?.trim();
  const emergencyLabel = booking.emergency_type
    ? incidentCategoryLabel(booking.emergency_type)
    : null;
  const notes = booking.notes?.trim();
  const hasIntakeSummary = Boolean(emergencyLabel || notes || booking.patient_report_id);

  if (!hasIntakeSummary && !showPatientId && !pickup) return null;

  return (
    <div className="inbound-critical-summary">
      <p className="inbound-critical-summary__title">Critical info</p>
      {hasIntakeSummary ? (
        <PatientReportIntakeSummary booking={booking} compact showCaller={false} />
      ) : (
        <>
          <CriticalRow label="Emergency type" value={emergencyLabel} />
          <CriticalRow label="Details" value={notes} multiline />
        </>
      )}
      <CriticalRow label="Patient ID" value={showPatientId ? patientId : null} />
      <CriticalRow label="Pickup" value={pickup} multiline />
    </div>
  );
}
