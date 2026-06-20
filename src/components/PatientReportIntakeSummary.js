import React, { useEffect, useState } from 'react';
import { supabase } from '../supabaseClient';
import { incidentCategoryLabel } from '../constants/missionClinical';

function DetailRow({ label, value, multiline = false }) {
  const text = value?.toString().trim();
  if (!text) return null;
  return (
    <div className={`mission-clinical-row${multiline ? ' mission-clinical-row--multiline' : ''}`}>
      <dt>{label}</dt>
      <dd>{text}</dd>
    </div>
  );
}

/**
 * Read-only caller / incident details from booking (+ patient_reports fallback).
 */
const PatientReportIntakeSummary = ({ booking, compact = false, showCaller = true }) => {
  const [report, setReport] = useState(null);

  useEffect(() => {
    const reportId = booking?.patient_report_id;
    if (!reportId) {
      setReport(null);
      return undefined;
    }
    const hasBookingDetails =
      Boolean(booking?.notes?.trim()) && Boolean(booking?.emergency_type?.trim());
    if (hasBookingDetails) {
      setReport(null);
      return undefined;
    }

    let cancelled = false;
    (async () => {
      const { data, error } = await supabase
        .from('patient_reports')
        .select('details, incident_category, patient_id, location_label, reporter_name')
        .eq('id', reportId)
        .maybeSingle();
      if (!cancelled && !error) setReport(data || null);
    })();
    return () => {
      cancelled = true;
    };
  }, [booking?.patient_report_id, booking?.notes, booking?.emergency_type, booking?.patient_id]);

  if (!booking) return null;

  const patientId = booking.patient_id?.trim() || report?.patient_id?.trim() || '';
  const emergencyType =
    booking.emergency_type?.trim() || incidentCategoryLabel(report?.incident_category);
  const notes = booking.notes?.trim() || report?.details?.trim() || '';
  const callerName = booking.patient_name?.trim() || report?.reporter_name?.trim() || '';

  if (!emergencyType && !notes && (showCaller ? !callerName : true)) return null;

  return (
    <div className="patient-report-intake-summary">
      {!compact ? (
        <p className="mission-clinical-readonly__block-title">Patient report</p>
      ) : null}
      <dl className="mission-clinical-readonly">
        {showCaller ? <DetailRow label="Caller" value={callerName} /> : null}
        <DetailRow label="Emergency type" value={emergencyType} />
        <DetailRow label="Details" value={notes} multiline />
      </dl>
    </div>
  );
};

export default PatientReportIntakeSummary;
