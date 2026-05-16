import React, { useEffect, useState } from 'react';
import { supabase } from '../supabaseClient';
import { syncPatientReportClinical } from '../utils/syncPatientReportClinical';
import IncidentAddressBlock from './IncidentAddressBlock';
import {
  DESTINATION_TYPES,
  destinationLabel,
  formatMissionTime,
  medicationDefaultForDestination,
  toDatetimeLocalValue,
  UNKNOWN_PATIENT_ID,
} from '../constants/missionClinical';

function cardHint({
  intakeOnly,
  routingOnly,
  showIntakeFields,
  showRoutingFields,
  ambulanceDispatched,
  patientSecured,
}) {
  if (intakeOnly && !ambulanceDispatched) {
    return 'Patient ID and pickup location from the caller. Send the ambulance first; hospital details come after the driver secures the patient.';
  }
  if (intakeOnly && ambulanceDispatched && !patientSecured) {
    return 'Ambulance is en route. Hospital and destination unlock after the driver taps Secure patient on scene.';
  }
  if (routingOnly) {
    return 'Patient is on board. Record destination and medication eligibility for this case.';
  }
  if (showIntakeFields && showRoutingFields) {
    return 'Update caller details or complete hospital and destination below.';
  }
  return null;
}

function ReadonlyRow({ label, value, muted = false }) {
  if (!label && !value) return null;
  return (
    <div className="mission-clinical-row">
      <dt>{label || '\u00a0'}</dt>
      <dd className={muted ? 'mission-clinical-row__muted' : undefined}>{value}</dd>
    </div>
  );
}

const MissionClinicalCard = ({
  booking,
  editable = true,
  showIntakeFields = true,
  showRoutingFields = false,
  showTimelineFields = false,
  onSaved,
}) => {
  const [patientId, setPatientId] = useState('');
  const [hospitalName, setHospitalName] = useState('');
  const [destinationType, setDestinationType] = useState('');
  const [medicationEligible, setMedicationEligible] = useState(true);
  const [requestedAtLocal, setRequestedAtLocal] = useState('');
  const [departedAtLocal, setDepartedAtLocal] = useState('');
  const [pickedUpAtLocal, setPickedUpAtLocal] = useState('');
  const [dischargeAtLocal, setDischargeAtLocal] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!booking) return;
    setPatientId(booking.patient_id ?? '');
    setHospitalName(booking.hospital_name ?? '');
    setDestinationType(booking.destination_type ?? '');
    const med =
      booking.medication_service_eligible ??
      medicationDefaultForDestination(booking.destination_type);
    setMedicationEligible(med !== false && med !== null);
    setRequestedAtLocal(toDatetimeLocalValue(booking.requested_at || booking.created_at));
    setDepartedAtLocal(toDatetimeLocalValue(booking.ambulance_departed_at));
    setPickedUpAtLocal(toDatetimeLocalValue(booking.patient_picked_up_at));
    setDischargeAtLocal(toDatetimeLocalValue(booking.discharge_completed_at));
  }, [booking]);

  const onDestinationChange = (value) => {
    setDestinationType(value);
    const def = medicationDefaultForDestination(value);
    if (def !== null) setMedicationEligible(def);
  };

  const save = async () => {
    if (!booking?.id) return;
    setSaving(true);
    try {
      const payload = {};
      if (showIntakeFields) {
        payload.patient_id = patientId.trim() || null;
        if (showTimelineFields) {
          if (requestedAtLocal) {
            payload.requested_at = new Date(requestedAtLocal).toISOString();
          }
          payload.ambulance_departed_at = departedAtLocal
            ? new Date(departedAtLocal).toISOString()
            : null;
          payload.patient_picked_up_at = pickedUpAtLocal
            ? new Date(pickedUpAtLocal).toISOString()
            : null;
          payload.discharge_completed_at = dischargeAtLocal
            ? new Date(dischargeAtLocal).toISOString()
            : null;
        }
      }
      if (showRoutingFields) {
        payload.hospital_name = hospitalName.trim() || null;
        payload.destination_type = destinationType || null;
        payload.medication_service_eligible = medicationEligible;
      }
      const { error } = await supabase.from('bookings').update(payload).eq('id', booking.id);
      if (error) throw error;

      const { error: syncError } = await syncPatientReportClinical(booking, payload);
      if (syncError) {
        throw new Error(
          `${syncError.message} (booking saved; run patient_reports_clinic_update.sql in Supabase to sync patient_reports.)`
        );
      }

      if (onSaved) onSaved();
    } catch (err) {
      alert(err.message || 'Could not save record.');
    } finally {
      setSaving(false);
    }
  };

  if (!booking) return null;

  const departed = booking.ambulance_departed_at;
  const pickedUp = booking.patient_picked_up_at;
  const dischargeDone = booking.discharge_completed_at;
  const intakeOnly = showIntakeFields && !showRoutingFields;
  const routingOnly = showRoutingFields && !showIntakeFields;
  const ambulanceDispatched = Boolean(booking?.driver_id);
  const patientSecured = booking?.status === 'Picked Up';
  const incidentAddress = booking.location || booking.emergency_type || null;
  const hint = cardHint({
    intakeOnly,
    routingOnly,
    showIntakeFields,
    showRoutingFields,
    ambulanceDispatched,
    patientSecured,
  });

  return (
    <div className="mission-clinical-card">
      <header className="mission-clinical-card__header">
        <span className="mission-clinical-card__eyebrow">
          {routingOnly ? 'Destination' : 'Clinical record'}
        </span>
        <h3 className="mission-clinical-card__title">
          {routingOnly ? 'Hospital & destination' : 'Dispatch record'}
        </h3>
        {hint ? <p className="mission-clinical-card__hint">{hint}</p> : null}
      </header>

      <div className="mission-clinical-card__body">
        {editable ? (
          <>
            {showIntakeFields && (
              <section className="mission-clinical-section">
                <h4 className="mission-clinical-section__title">Caller details</h4>
                <div className="mission-clinical-field">
                  <label className="field-label">Patient ID (NRIC / hospital no.)</label>
                  <input
                    className="modern-input"
                    value={patientId}
                    onChange={(e) => setPatientId(e.target.value)}
                    placeholder="NRIC / hospital no."
                  />
                  <button
                    type="button"
                    className="mission-clinical-unknown-btn"
                    onClick={() => setPatientId(UNKNOWN_PATIENT_ID)}
                  >
                    Mark as unknown
                  </button>
                </div>
                <IncidentAddressBlock address={incidentAddress} />
                {showTimelineFields && (
                  <div className="mission-clinical-readonly__block">
                    <p className="mission-clinical-readonly__block-title">Mission timeline</p>
                    <div className="mission-clinical-field">
                      <label className="field-label">Service requested</label>
                      <input
                        type="datetime-local"
                        className="modern-input"
                        value={requestedAtLocal}
                        onChange={(e) => setRequestedAtLocal(e.target.value)}
                      />
                    </div>
                    <div className="mission-clinical-field">
                      <label className="field-label">Ambulance departed</label>
                      <input
                        type="datetime-local"
                        className="modern-input"
                        value={departedAtLocal}
                        onChange={(e) => setDepartedAtLocal(e.target.value)}
                      />
                      <p className="mission-clinical-field__hint">Set when the driver acknowledges the job.</p>
                    </div>
                    <div className="mission-clinical-field">
                      <label className="field-label">Patient picked up</label>
                      <input
                        type="datetime-local"
                        className="modern-input"
                        value={pickedUpAtLocal}
                        onChange={(e) => setPickedUpAtLocal(e.target.value)}
                      />
                    </div>
                    <div className="mission-clinical-field">
                      <label className="field-label">Discharge completed</label>
                      <input
                        type="datetime-local"
                        className="modern-input"
                        value={dischargeAtLocal}
                        onChange={(e) => setDischargeAtLocal(e.target.value)}
                      />
                    </div>
                  </div>
                )}
              </section>
            )}

            {showRoutingFields && (
              <section className="mission-clinical-section mission-clinical-section--routing">
                <h4 className="mission-clinical-section__title">After patient secured</h4>
                <div className="mission-clinical-field">
                  <label className="field-label">Hospital name</label>
                  <input
                    className="modern-input"
                    value={hospitalName}
                    onChange={(e) => setHospitalName(e.target.value)}
                    placeholder="Receiving / referring hospital"
                  />
                </div>
                <div className="mission-clinical-field">
                  <label className="field-label">Destination type</label>
                  <select
                    className="modern-select"
                    value={destinationType}
                    onChange={(e) => onDestinationChange(e.target.value)}
                    style={{ width: '100%' }}
                  >
                    <option value="">Select destination type…</option>
                    {DESTINATION_TYPES.map((d) => (
                      <option key={d.value} value={d.value}>
                        {d.label}
                      </option>
                    ))}
                  </select>
                </div>
                <label className="mission-clinical-checkbox">
                  <input
                    type="checkbox"
                    checked={medicationEligible}
                    onChange={(e) => setMedicationEligible(e.target.checked)}
                  />
                  <span>Clinic can provide medication for this case</span>
                </label>
                {!medicationEligible && destinationType && destinationType !== 'public_hospital' ? (
                  <p className="mission-clinical-callout">
                    House and private hospital trips often cannot receive medication from this clinic.
                  </p>
                ) : null}
              </section>
            )}

            <button type="button" className="mission-clinical-save" disabled={saving} onClick={save}>
              {saving ? 'Saving…' : showRoutingFields && !showIntakeFields ? 'Save destination' : 'Save record'}
            </button>
          </>
        ) : (
          <div className="mission-clinical-readonly">
            {showIntakeFields && (
              <div
                className="mission-clinical-readonly__block"
                style={{ paddingTop: 0, marginTop: 0, borderTop: 'none' }}
              >
                <p className="mission-clinical-readonly__block-title">Caller details</p>
                <ReadonlyRow label="Patient ID" value={booking.patient_id || '—'} />
                {incidentAddress ? <ReadonlyRow label="Pickup" value={incidentAddress} /> : null}
              </div>
            )}
            {showTimelineFields && (
              <div className="mission-clinical-readonly__block">
                <p className="mission-clinical-readonly__block-title">Mission timeline</p>
                <ReadonlyRow
                  label="Requested"
                  value={formatMissionTime(booking.requested_at || booking.created_at)}
                />
                <ReadonlyRow
                  label="Departed"
                  value={departed ? formatMissionTime(departed) : 'Not recorded yet'}
                  muted={!departed}
                />
                <ReadonlyRow
                  label="Picked up"
                  value={pickedUp ? formatMissionTime(pickedUp) : 'Not recorded yet'}
                  muted={!pickedUp}
                />
                <ReadonlyRow
                  label="Discharge"
                  value={dischargeDone ? formatMissionTime(dischargeDone) : 'Not recorded yet'}
                  muted={!dischargeDone}
                />
              </div>
            )}
            {showRoutingFields && (
              <div className="mission-clinical-readonly__block">
                <p className="mission-clinical-readonly__block-title">Destination</p>
                <ReadonlyRow label="Hospital" value={booking.hospital_name || '—'} />
                <ReadonlyRow label="Type" value={destinationLabel(booking.destination_type)} />
                <ReadonlyRow
                  label="Medication"
                  value={
                    booking.medication_service_eligible === false ? 'Not offered' : 'Eligible / offered'
                  }
                />
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default MissionClinicalCard;
