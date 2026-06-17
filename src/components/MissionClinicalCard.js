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
import HospitalDestinationField from './HospitalDestinationField';
import {
  isHospitalDestinationType,
} from '../utils/clinicRouting';

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
  compact = false,
  onSaved,
}) => {
  const [patientId, setPatientId] = useState('');
  const [destinationType, setDestinationType] = useState('');
  const [medicationEligible, setMedicationEligible] = useState(true);
  const [requestedAtLocal, setRequestedAtLocal] = useState('');
  const [departedAtLocal, setDepartedAtLocal] = useState('');
  const [pickedUpAtLocal, setPickedUpAtLocal] = useState('');
  const [dischargeAtLocal, setDischargeAtLocal] = useState('');
  const [hospitalPlace, setHospitalPlace] = useState(null);
  const [clinicOptions, setClinicOptions] = useState([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!showRoutingFields) return;
    let cancelled = false;
    (async () => {
      const { data, error } = await supabase
        .from('clinics')
        .select('id, name, latitude, longitude, address, specialty')
        .order('name');
      if (!cancelled && !error) setClinicOptions(data || []);
    })();
    return () => {
      cancelled = true;
    };
  }, [showRoutingFields]);

  useEffect(() => {
    if (!booking?.destination_clinic_id || clinicOptions.length === 0) return;
    const clinic = clinicOptions.find((c) => String(c.id) === String(booking.destination_clinic_id));
    if (!clinic) return;
    const lat = Number(clinic.latitude ?? clinic.lat);
    const lng = Number(clinic.longitude ?? clinic.lng);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return;
    setHospitalPlace({
      name: clinic.name,
      address: clinic.address || clinic.name,
      latitude: lat,
      longitude: lng,
      clinicId: clinic.id,
      source: 'registered',
    });
  }, [booking?.destination_clinic_id, clinicOptions]);

  useEffect(() => {
    if (!booking) return;
    setPatientId(booking.patient_id ?? '');
    setDestinationType(booking.destination_type ?? '');

    const lat = Number(booking.destination_latitude);
    const lng = Number(booking.destination_longitude);
    const hasCoords = Number.isFinite(lat) && Number.isFinite(lng);
    const clinicId = booking.destination_clinic_id ? String(booking.destination_clinic_id) : null;

    if (clinicId && hasCoords && booking.hospital_name) {
      setHospitalPlace({
        name: booking.hospital_name,
        address: booking.hospital_name,
        latitude: lat,
        longitude: lng,
        clinicId,
        source: 'registered',
      });
    } else if (hasCoords && booking.hospital_name) {
      setHospitalPlace({
        name: booking.hospital_name,
        address: booking.hospital_name,
        latitude: lat,
        longitude: lng,
        clinicId: clinicId || null,
        source: 'google',
      });
    } else if (booking.hospital_name) {
      setHospitalPlace({
        name: booking.hospital_name,
        address: booking.hospital_name,
        clinicId,
        source: clinicId ? 'registered' : 'google',
      });
    } else {
      setHospitalPlace(null);
    }
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
    if (value === 'house') setHospitalPlace(null);
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
        const name = hospitalPlace?.name?.trim() || '';
        const dLat = hospitalPlace?.latitude;
        const dLng = hospitalPlace?.longitude;
        const hasCoords = Number.isFinite(dLat) && Number.isFinite(dLng);

        if (isHospitalDestinationType(destinationType)) {
          if (!name || !hasCoords) {
            alert(
              'Pick a registered clinic from the list or search and select a hospital on Google Maps.'
            );
            return;
          }
        }

        payload.hospital_name = name || null;
        payload.destination_type = destinationType || null;
        payload.medication_service_eligible = medicationEligible;
        payload.destination_clinic_id =
          destinationType === 'house' ? null : hospitalPlace?.clinicId || null;
        payload.destination_latitude =
          destinationType === 'house' || !hasCoords ? null : dLat;
        payload.destination_longitude =
          destinationType === 'house' || !hasCoords ? null : dLng;
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
  const hint =
    compact
      ? null
      : cardHint({
          intakeOnly,
          routingOnly,
          showIntakeFields,
          showRoutingFields,
          ambulanceDispatched,
          patientSecured,
        });

  const cardClass = compact
    ? 'mission-clinical-card mission-clinical-card--compact'
    : 'mission-clinical-card';

  return (
    <div className={cardClass}>
      {!compact && (
        <header className="mission-clinical-card__header">
          <span className="mission-clinical-card__eyebrow">
            {routingOnly ? 'Destination' : 'Clinical record'}
          </span>
          <h3 className="mission-clinical-card__title">
            {routingOnly ? 'Hospital & destination' : 'Dispatch record'}
          </h3>
          {hint ? <p className="mission-clinical-card__hint">{hint}</p> : null}
        </header>
      )}

      <div className="mission-clinical-card__body">
        {editable ? (
          <>
            {showIntakeFields && (
              <section className="mission-clinical-section">
                {!compact ? (
                  <h4 className="mission-clinical-section__title">Caller details</h4>
                ) : null}
                <div className="mission-clinical-field">
                  <label className="field-label">{compact ? 'Patient ID' : 'Patient ID (NRIC / hospital no.)'}</label>
                  <input
                    className="modern-input"
                    value={patientId}
                    onChange={(e) => setPatientId(e.target.value)}
                    placeholder="NRIC or hospital no."
                  />
                  <button
                    type="button"
                    className="confirm-btn confirm-btn--outline confirm-btn--sm mission-clinical-unknown-btn"
                    onClick={() => setPatientId(UNKNOWN_PATIENT_ID)}
                  >
                    Unknown
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
                {!compact ? (
                  <h4 className="mission-clinical-section__title">After patient secured</h4>
                ) : (
                  <h4 className="mission-clinical-section__title mission-clinical-section__title--compact">
                    Destination
                  </h4>
                )}
                <div className="mission-clinical-field">
                  {!compact ? <label className="field-label">Receiving hospital</label> : null}
                  <HospitalDestinationField
                    bookingId={booking.id}
                    clinics={clinicOptions}
                    value={hospitalPlace}
                    disabled={destinationType === 'house'}
                    compact={compact}
                    onChange={setHospitalPlace}
                  />
                </div>
                <div className="mission-clinical-field">
                  <label className="field-label">{compact ? 'Type' : 'Destination type'}</label>
                  <select
                    className="modern-select"
                    value={destinationType}
                    onChange={(e) => onDestinationChange(e.target.value)}
                    style={{ width: '100%' }}
                  >
                    <option value="">{compact ? 'Select type…' : 'Select destination type…'}</option>
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
                  <span>{compact ? 'Medication eligible' : 'Clinic can provide medication for this case'}</span>
                </label>
                {!compact && !medicationEligible && destinationType && destinationType !== 'public_hospital' ? (
                  <p className="mission-clinical-callout">
                    House and private hospital trips often cannot receive medication from this clinic.
                  </p>
                ) : null}
              </section>
            )}

            <button type="button" className="confirm-btn mission-clinical-save" disabled={saving} onClick={save}>
              {saving
                ? 'Saving…'
                : compact && showRoutingFields
                  ? 'Save'
                  : showRoutingFields && !showIntakeFields
                    ? 'Save destination'
                    : 'Save record'}
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
                <ReadonlyRow
                  label="Source"
                  value={
                    booking.destination_clinic_id
                      ? 'Registered clinic'
                      : booking.destination_latitude != null
                        ? 'Google Maps'
                        : '—'
                  }
                />
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
