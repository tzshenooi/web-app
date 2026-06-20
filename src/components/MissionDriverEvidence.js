import React from 'react';

/**
 * Scene + handover photos captured by the driver (stored on bookings row).
 */
const MissionDriverEvidence = ({ booking, title = 'Driver evidence' }) => {
  const sceneUrl = (booking?.scene_photo ?? '').toString().trim();
  const handoverUrl = (booking?.handover_photo ?? '').toString().trim();

  if (!sceneUrl && !handoverUrl) {
    return (
      <div className="patient-report-attachments mission-driver-evidence">
        <p className="patient-report-attachments__title">{title}</p>
        <p className="facility-muted" style={{ fontSize: '0.85rem', margin: 0 }}>
          No driver photos stored for this mission.
        </p>
      </div>
    );
  }

  return (
    <div className="patient-report-attachments mission-driver-evidence">
      <p className="patient-report-attachments__title">{title}</p>
      <ul className="patient-report-attachments__list">
        {sceneUrl ? (
          <li className="patient-report-attachments__item">
            <span className="patient-report-attachments__label">📷 Scene photo</span>
            <a
              href={sceneUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="patient-report-attachments__image-link"
              title="Open scene photo"
            >
              <img src={sceneUrl} alt="Scene evidence" className="patient-report-attachments__thumb" />
            </a>
          </li>
        ) : null}
        {handoverUrl ? (
          <li className="patient-report-attachments__item">
            <span className="patient-report-attachments__label">📋 Handover photo</span>
            <a
              href={handoverUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="patient-report-attachments__image-link"
              title="Open handover photo"
            >
              <img src={handoverUrl} alt="Handover evidence" className="patient-report-attachments__thumb" />
            </a>
          </li>
        ) : null}
      </ul>
    </div>
  );
};

export default MissionDriverEvidence;
