import React, { useEffect, useState } from 'react';
import { fetchReporterUserId, loadPatientReportAttachments } from '../utils/patientReportAttachments';

/**
 * Voice / photo / video the patient attached when submitting their report.
 * Visible to clinic dispatch and (via driver app) the assigned driver.
 */
const PatientReportAttachments = ({ patientReportId, title = 'Patient attachments' }) => {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!patientReportId) {
      setItems([]);
      setLoading(false);
      return undefined;
    }

    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const reporterId = await fetchReporterUserId(patientReportId);
        if (!reporterId) {
          if (!cancelled) {
            setItems([]);
            setLoading(false);
          }
          return;
        }
        const files = await loadPatientReportAttachments(reporterId, patientReportId);
        if (!cancelled) {
          setItems(files);
          setLoading(false);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err.message || 'Could not load attachments.');
          setLoading(false);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [patientReportId]);

  if (!patientReportId) return null;

  return (
    <div className="patient-report-attachments">
      <p className="patient-report-attachments__title">{title}</p>
      {loading && <p className="facility-muted" style={{ fontSize: '0.85rem' }}>Loading attachments…</p>}
      {error && (
        <p className="facility-muted" style={{ fontSize: '0.85rem', color: '#b45309' }}>
          {error}
          <br />
          Run <code>patient_reports_storage_read.sql</code> in Supabase if access is denied.
        </p>
      )}
      {!loading && !error && items.length === 0 && (
        <p className="facility-muted" style={{ fontSize: '0.85rem' }}>No media attached to this report.</p>
      )}
      {!loading && !error && items.length > 0 && (
        <ul className="patient-report-attachments__list">
          {items.map((item) => (
            <li key={item.path} className="patient-report-attachments__item">
              <span className="patient-report-attachments__label">
                {item.kind === 'audio' ? '🎤' : item.kind === 'video' ? '🎬' : item.kind === 'image' ? '🖼' : '📎'}{' '}
                {item.name}
              </span>
              {item.kind === 'audio' && (
                <audio controls preload="metadata" src={item.url} className="patient-report-attachments__media" />
              )}
              {item.kind === 'video' && (
                <video controls preload="metadata" src={item.url} className="patient-report-attachments__media" />
              )}
              {item.kind === 'image' && (
                <a href={item.url} target="_blank" rel="noopener noreferrer">
                  <img src={item.url} alt={item.name} className="patient-report-attachments__thumb" />
                </a>
              )}
              {item.kind === 'file' && (
                <a href={item.url} target="_blank" rel="noopener noreferrer" className="auth-link">
                  Open file
                </a>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default PatientReportAttachments;
