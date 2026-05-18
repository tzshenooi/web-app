import React, { useMemo, useState } from 'react';
import { supabase } from '../supabaseClient';
import Autocomplete from 'react-google-autocomplete';
import { GOOGLE_MAPS_API_KEY } from '../config/googleMaps';
import {
  DESTINATION_TYPES,
  medicationDefaultForDestination,
  toDatetimeLocalValue,
} from '../constants/missionClinical';

const CreateScheduledBooking = ({ clinicId, drivers = [], onBookingCreated, onLocationSelected }) => {
  const [patientName, setPatientName] = useState('');
  const [patientId, setPatientId] = useState('');
  const [location, setLocation] = useState(null);
  const [hospitalName, setHospitalName] = useState('');
  const [destinationType, setDestinationType] = useState('');
  const [medicationEligible, setMedicationEligible] = useState(true);
  const [scheduledAt, setScheduledAt] = useState('');
  const [isBedridden, setIsBedridden] = useState(true);
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [driverId, setDriverId] = useState('');

  const assignableDrivers = useMemo(() => drivers, [drivers]);

  const minDatetimeLocal = useMemo(() => {
    const d = new Date();
    d.setMinutes(d.getMinutes() + 30);
    return toDatetimeLocalValue(d.toISOString());
  }, []);

  const handlePlaceSelect = (place) => {
    if (!place?.geometry?.location) return;
    const lat = place.geometry.location.lat();
    const lng = place.geometry.location.lng();
    const address = place.formatted_address || place.name || '';
    const next = { address, lat, lng };
    setLocation(next);
    if (onLocationSelected) onLocationSelected({ lat, lng });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!patientName.trim()) {
      alert('Enter the patient name.');
      return;
    }
    if (!patientId.trim()) {
      alert('Enter the patient ID.');
      return;
    }
    if (!location?.lat || !location?.lng) {
      alert('Select a pickup address from the suggestions.');
      return;
    }
    if (!destinationType) {
      alert('Select the destination type.');
      return;
    }
    if (!scheduledAt) {
      alert('Choose the planned pickup date and time.');
      return;
    }
    const pickup = new Date(scheduledAt);
    if (Number.isNaN(pickup.getTime())) {
      alert('Invalid pickup time.');
      return;
    }
    if (pickup.getTime() < Date.now() + 15 * 60 * 1000) {
      alert('Pickup must be at least 15 minutes from now.');
      return;
    }
    if (!clinicId) {
      alert('Clinic is not loaded.');
      return;
    }
    if (!driverId) {
      alert('Assign an ambulance driver for this scheduled transport.');
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.from('bookings').insert({
        patient_name: patientName.trim(),
        patient_id: patientId.trim(),
        location: location.address,
        latitude: location.lat,
        longitude: location.lng,
        emergency_type: 'Scheduled',
        notes: notes.trim() || null,
        status: 'Scheduled',
        booking_kind: 'scheduled',
        scheduled_at: pickup.toISOString(),
        is_bedridden: isBedridden,
        driver_id: driverId,
        scheduled_driver_acknowledged_at: null,
        assigned_clinic_id: clinicId,
        requested_at: new Date().toISOString(),
        hospital_name: hospitalName.trim() || null,
        destination_type: destinationType,
        medication_service_eligible: medicationEligible,
      });

      if (error) throw error;

      setPatientName('');
      setPatientId('');
      setLocation(null);
      setHospitalName('');
      setDestinationType('');
      setMedicationEligible(true);
      setScheduledAt('');
      setIsBedridden(true);
      setNotes('');
      setDriverId('');
      if (onLocationSelected) onLocationSelected(null);
      if (onBookingCreated) onBookingCreated();
    } catch (err) {
      alert(err.message || 'Could not save scheduled booking.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form className="create-booking-form" onSubmit={handleSubmit} style={{ padding: '8px 4px 4px' }}>
      <p className="facility-muted" style={{ fontSize: '0.88rem', marginBottom: 14, lineHeight: 1.45 }}>
        Assign a driver now. They see this in the driver app. Sound alerts begin ~30 minutes before pickup until they
        acknowledge.
      </p>

      <div className="input-group">
        <label className="field-label">ASSIGNED DRIVER</label>
        <select
          className="modern-select"
          value={driverId}
          onChange={(e) => setDriverId(e.target.value)}
          required
        >
          <option value="">Select driver…</option>
          {assignableDrivers.map((d) => (
            <option key={d.id} value={d.id}>
              {d.name || d.email || 'Driver'} ({d.status || '—'})
            </option>
          ))}
        </select>
      </div>

      <div className="input-group">
        <label className="field-label">PLANNED PICKUP</label>
        <input
          type="datetime-local"
          className="modern-input"
          value={scheduledAt}
          min={minDatetimeLocal}
          onChange={(e) => setScheduledAt(e.target.value)}
          required
        />
      </div>

      <label className="auth-checkbox" style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
        <input type="checkbox" checked={isBedridden} onChange={(e) => setIsBedridden(e.target.checked)} />
        <span style={{ fontSize: '0.85rem' }}>Bedridden / stretcher required</span>
      </label>

      <div className="input-group">
        <label className="field-label">PATIENT ID</label>
        <input
          type="text"
          className="modern-input"
          value={patientId}
          onChange={(e) => setPatientId(e.target.value)}
          placeholder="NRIC / hospital registration no."
          required
        />
      </div>

      <div className="input-group">
        <label className="field-label">PATIENT NAME</label>
        <input
          type="text"
          className="modern-input"
          value={patientName}
          onChange={(e) => setPatientName(e.target.value)}
          placeholder="e.g. Ahmad bin Ali"
          required
        />
      </div>

      <div className="input-group">
        <label className="field-label">PICKUP ADDRESS</label>
        <Autocomplete
          apiKey={GOOGLE_MAPS_API_KEY}
          onPlaceSelected={handlePlaceSelect}
          options={{
            types: ['geocode'],
            componentRestrictions: { country: 'my' },
          }}
          className="modern-input"
          placeholder="Search pickup location…"
          style={{ width: '100%', marginBottom: 22 }}
        />
        {location?.address && (
          <p className="facility-muted" style={{ marginTop: -12, marginBottom: 16, fontSize: '0.85rem' }}>
            {location.address}
          </p>
        )}
      </div>

      <div className="input-group">
        <label className="field-label">HOSPITAL NAME (OPTIONAL)</label>
        <input
          type="text"
          className="modern-input"
          value={hospitalName}
          onChange={(e) => setHospitalName(e.target.value)}
          placeholder="Receiving / referring hospital"
        />
      </div>

      <div className="input-group">
        <label className="field-label">DESTINATION</label>
        <select
          className="modern-select"
          value={destinationType}
          onChange={(e) => {
            const v = e.target.value;
            setDestinationType(v);
            const def = medicationDefaultForDestination(v);
            if (def !== null) setMedicationEligible(def);
          }}
          required
        >
          <option value="">Select…</option>
          {DESTINATION_TYPES.map((d) => (
            <option key={d.value} value={d.value}>
              {d.label}
            </option>
          ))}
        </select>
      </div>

      <label className="auth-checkbox" style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
        <input
          type="checkbox"
          checked={medicationEligible}
          onChange={(e) => setMedicationEligible(e.target.checked)}
        />
        <span style={{ fontSize: '0.85rem' }}>Clinic can provide medication</span>
      </label>

      <div className="input-group">
        <label className="field-label">NOTES (OPTIONAL)</label>
        <textarea
          className="modern-input"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Ward, mobility aids, contact person…"
          rows={3}
          style={{ resize: 'vertical', minHeight: 72 }}
        />
      </div>

      <button type="submit" className="confirm-btn" disabled={loading}>
        {loading ? 'SAVING…' : 'SAVE SCHEDULED BOOKING'}
      </button>
    </form>
  );
};

export default CreateScheduledBooking;
