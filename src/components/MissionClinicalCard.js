import React, { useEffect, useState } from 'react';
import { supabase } from '../supabaseClient';
import { syncPatientReportClinical } from '../utils/syncPatientReportClinical';
import IncidentAddressBlock from './IncidentAddressBlock';
import PatientReportIntakeSummary from './PatientReportIntakeSummary';
import {
  DESTINATION_TYPES,
  destinationLabel,
  formatMissionTime,
  medicationDefaultForDestination,
  toDatetimeLocalValue,
  UNKNOWN_PATIENT_ID,
} from '../constants/missionClinical';
import HospitalDestinationField from './HospitalDestinationField';
import ClinicsWithBedsPanel from './ClinicsWithBedsPanel';
import {
  destinationTypeForClinic,
  isHospitalDestinationType,
} from '../utils/clinicRouting';
import { fetchPatientHomeByReportId, homeToHospitalPlace } from '../utils/patientHomeAddress';
import { broadcastInboundTransfer } from '../utils/inboundTransferSync';

function cardHint({
  intakeOnly,
  routingOnly,
  showIntakeFields,
  showRoutingFields,
  ambulanceDispatched,
  patientSecured,
}) {
  if (intakeOnly && !ambulanceDispatched) {
    return 'Patient ID and pickup location from the caller. Send the ambulance first; destination details come after the driver secures the patient.';
  }
  if (intakeOnly && ambulanceDispatched && !patientSecured) {
    return 'Ambulance is en route. Destination unlocks after the driver taps Secure patient on scene.';
  }
  if (routingOnly) {
    return 'Patient is on board. Record destination and medication eligibility for this case.';
  }
  if (showIntakeFields && showRoutingFields) {
    return 'Update caller details or complete destination below.';
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
  viewerClinicId = null,
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
  const [clinicLoadError, setClinicLoadError] = useState(null);
  const [homeLoadHint, setHomeLoadHint] = useState(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!showRoutingFields) return;
    let cancelled = false;
    (async () => {
      const { data, error } = await supabase
        .from('clinics')
        .select('id, name, latitude, longitude, address, clinic_type, bed_capacity, beds_occupied')
        .order('name');
      if (cancelled) return;
      if (error) {
        setClinicLoadError(error.message);
        setClinicOptions([]);
        return;
      }
      setClinicLoadError(null);
      setClinicOptions(data || []);
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
    } else if (booking.destination_type === 'house' && hasCoords && booking.hospital_name) {
      setHospitalPlace({
        name: booking.hospital_name,
        address: booking.hospital_name,
        latitude: lat,
        longitude: lng,
        clinicId: null,
        source: 'home',
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

  const applyPatientHomeDestination = async () => {
    if (!booking?.patient_report_id) {
      setHomeLoadHint('No patient report linked — cannot load home address.');
      setHospitalPlace(null);
      return;
    }
    setHomeLoadHint('Loading patient home address…');
    try {
      const home = await fetchPatientHomeByReportId(booking.patient_report_id);
      const place = homeToHospitalPlace(home);
      if (!place) {
        setHospitalPlace(null);
        setHomeLoadHint(
          'Patient has not saved a home address yet. Ask them to open the patient app → Profile → Home address.'
        );
        return;
      }
      setHospitalPlace(place);
      setHomeLoadHint(null);
    } catch (err) {
      setHospitalPlace(null);
      setHomeLoadHint(err.message || 'Could not load patient home address.');
    }
  };

  useEffect(() => {
    if (!showRoutingFields || destinationType !== 'house') return;
    if (hospitalPlace?.source === 'home') return;
    const lat = Number(booking?.destination_latitude);
    const lng = Number(booking?.destination_longitude);
    if (
      booking?.destination_type === 'house' &&
      booking?.hospital_name &&
      Number.isFinite(lat) &&
      Number.isFinite(lng)
    ) {
      return;
    }
    applyPatientHomeDestination();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showRoutingFields, destinationType, booking?.patient_report_id]);

  const onDestinationChange = (value) => {
    setDestinationType(value);
    const def = medicationDefaultForDestination(value);
    if (def !== null) setMedicationEligible(def);
    if (value === 'house') {
      setHospitalPlace(null);
      applyPatientHomeDestination();
    } else {
      setHomeLoadHint(null);
    }
  };

  const applyDestinationTypeForClinic = (clinic) => {
    if (!clinic) return;
    const destType = destinationTypeForClinic(clinic);
    setDestinationType(destType);
    const def = medicationDefaultForDestination(destType);
    if (def !== null) setMedicationEligible(def);
  };

  const pickClinicDestination = (place) => {
    if (!place) {
      setHospitalPlace(null);
      return;
    }
    setHospitalPlace(place);

    if (place.clinicId) {
      const clinic = clinicOptions.find((c) => String(c.id) === String(place.clinicId));
      applyDestinationTypeForClinic(clinic);
      return;
    }

    if (!destinationType || destinationType === 'house') {
      setDestinationType('private_hospital');
      const def = medicationDefaultForDestination('private_hospital');
      if (def !== null) setMedicationEligible(def);
    }
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

        if (destinationType === 'house') {
          if (!name || !hasCoords) {
            alert(
              homeLoadHint ||
                'Patient has no home address saved. Ask them to add it in the patient app under Profile → Home address.'
            );
            return;
          }
        } else if (isHospitalDestinationType(destinationType)) {
          if (!name || !hasCoords) {
            alert('Pick a clinic with available beds or search Google Maps.');
            return;
          }
        }

        payload.hospital_name = name || null;
        payload.destination_type = destinationType || null;
        payload.medication_service_eligible = medicationEligible;
        payload.destination_clinic_id =
          destinationType === 'house' ? null : hospitalPlace?.clinicId || null;
        payload.destination_latitude = !hasCoords ? null : dLat;
        payload.destination_longitude = !hasCoords ? null : dLng;
      }
      const { data: updated, error } = await supabase
        .from('bookings')
        .update(payload)
        .eq('id', booking.id)
        .select('*')
        .single();
      if (error) throw error;

      const { error: syncError } = await syncPatientReportClinical(booking, payload);
      if (syncError) {
        throw new Error(
          `${syncError.message} (booking saved; run patient_reports_clinic_update.sql in Supabase to sync patient_reports.)`
        );
      }

      if (updated?.destination_clinic_id) {
        void broadcastInboundTransfer(supabase, updated);
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
  const incidentAddress = booking.location || null;
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
            {routingOnly ? 'Destination' : 'Dispatch record'}
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
                {booking.patient_report_id ? (
                  <PatientReportIntakeSummary booking={booking} compact={compact} />
                ) : null}
                <div className="mission-clinical-field">
                  <label className="field-label">{compact ? 'Patient ID' : 'Patient ID (NRIC / patient no.)'}</label>
                  <input
                    className="modern-input"
                    value={patientId}
                    onChange={(e) => setPatientId(e.target.value)}
                    placeholder="NRIC or patient no."
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
                <ClinicsWithBedsPanel
                  clinics={clinicOptions}
                  patientLat={booking.latitude}
                  patientLng={booking.longitude}
                  selectedClinicId={hospitalPlace?.clinicId}
                  dispatchClinicId={viewerClinicId ?? booking.assigned_clinic_id}
                  disabled={destinationType === 'house' || !editable}
                  onSelectClinic={pickClinicDestination}
                />
                {clinicLoadError ? (
                  <p className="mission-clinical-callout">
                    Could not load clinic bed data ({clinicLoadError}). Run{' '}
                    <code>web-app/supabase/clinics_bed_availability.sql</code> in Supabase SQL Editor.
                  </p>
                ) : null}
                <div className="mission-clinical-field mission-clinical-field--maps-fallback">
                  {!compact ? (
                    <label className="field-label">Other clinic (Google Maps)</label>
                  ) : null}
                  <HospitalDestinationField
                    bookingId={booking.id}
                    clinics={clinicOptions}
                    value={hospitalPlace}
                    disabled={destinationType === 'house'}
                    compact={compact}
                    onChange={pickClinicDestination}
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
                {destinationType === 'house' ? (
                  <div className="mission-clinical-field">
                    <label className="field-label">Patient home</label>
                    {hospitalPlace?.source === 'home' ? (
                      <p className="mission-clinical-callout" style={{ marginTop: 0 }}>
                        {hospitalPlace.address || hospitalPlace.name}
                      </p>
                    ) : (
                      <p className="mission-clinical-callout mission-clinical-callout--muted" style={{ marginTop: 0 }}>
                        {homeLoadHint ||
                          'Select House / home above to load the address from the patient profile.'}
                      </p>
                    )}
                  </div>
                ) : null}
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
                    House and private trips often cannot receive medication from this clinic.
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
                {booking.patient_report_id ? (
                  <PatientReportIntakeSummary booking={booking} />
                ) : null}
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
                <ReadonlyRow label="Facility" value={booking.hospital_name || '—'} />
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
