import React, { useState } from 'react';
import MissionClinicalCard from './MissionClinicalCard';
import PatientReportAttachments from './PatientReportAttachments';

/** Completed mission — name visible; tap to view full archived record (read-only). */
const ArchiveMissionCard = ({ booking, driverName }) => {
  const [open, setOpen] = useState(false);
  const patientName = booking.patient_name || 'Unknown patient';

  return (
    <div className="unit-card-new incoming-mission-card archive-mission-card">
      <button
        type="button"
        className="incoming-mission-name-row"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
      >
        <strong className="unit-name-text">{patientName}</strong>
        <span className="incoming-mission-chevron" aria-hidden="true">
          {open ? '▾' : '▸'}
        </span>
      </button>

      {open && (
        <div className="incoming-mission-details archive-mission-details">
          <div className="archive-mission-meta">
            <span className="facility-pill">Completed</span>
            {driverName ? <span className="facility-pill neutral">{driverName}</span> : null}
          </div>

          <MissionClinicalCard
            booking={booking}
            editable={false}
            showIntakeFields
            showRoutingFields
            showTimelineFields
          />

          {booking.patient_report_id ? (
            <PatientReportAttachments patientReportId={booking.patient_report_id} />
          ) : null}
        </div>
      )}
    </div>
  );
};

export default ArchiveMissionCard;
