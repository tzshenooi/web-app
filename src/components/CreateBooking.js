import React, { useMemo, useState } from 'react';
import { supabase } from '../supabaseClient';
import Autocomplete from 'react-google-autocomplete';
import { GOOGLE_MAPS_API_KEY } from '../config/googleMaps';
import { DESTINATION_TYPES, medicationDefaultForDestination } from '../constants/missionClinical';

const PRIORITIES = ['Medical', 'Trauma', 'Cardiac'];

const CreateBooking = ({ onBookingCreated, onLocationSelected, drivers = [] }) => {
  const [patientName, setPatientName] = useState('');
  const [location, setLocation] = useState(null);
  const [priority, setPriority] = useState('Medical');
  const [notes, setNotes] = useState('');
  const [patientId, setPatientId] = useState('');
  const [hospitalName, setHospitalName] = useState('');
  const [destinationType, setDestinationType] = useState('');
  const [medicationEligible, setMedicationEligible] = useState(true);
  const [loading, setLoading] = useState(false);

  /** One ambulance: whichever driver account is Available gets the job. */
  const ambulanceDriver = useMemo(
    () => drivers.find((d) => d.status === 'Available') ?? null,
    [drivers]
  );

  const driverStatusText = useMemo(() => {
    if (!drivers.length) return 'No driver registered for this clinic yet.';
    if (!ambulanceDriver) return 'Put a driver on Available in the mobile app before dispatching.';
    return `Ambulance: ${ambulanceDriver.name || ambulanceDriver.email || 'Driver'}`;
  }, [drivers.length, ambulanceDriver]);

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
    if (!location?.lat || !location?.lng) {
      alert('Select an incident address from the suggestions.');
      return;
    }
    if (!destinationType) {
      alert('Select the destination type.');
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
        emergency_type: priority,
        notes: notes.trim() || null,
        status: 'Pending',
        driver_id: ambulanceDriver?.id ?? null,
        requested_at: new Date().toISOString(),
        hospital_name: hospitalName.trim() || null,
        destination_type: destinationType,
        medication_service_eligible: medicationEligible,
      });

      if (error) throw error;

      setPatientName('');
      setLocation(null);
      setPriority('Medical');
      setNotes('');
      setPatientId('');
      setHospitalName('');
      setDestinationType('');
      setMedicationEligible(true);
      if (onLocationSelected) onLocationSelected(null);
      if (onBookingCreated) onBookingCreated();
    } catch (err) {
      alert(err.message || 'Could not create dispatch.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form className="create-booking-form" onSubmit={handleSubmit} style={{ padding: '8px 4px 4px' }}>
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
          placeholder="e.g. Siti Aminah"
          required
        />
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
        <label className="field-label">INCIDENT ADDRESS</label>
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
        <label className="field-label">PRIORITY</label>
        <select className="modern-select" value={priority} onChange={(e) => setPriority(e.target.value)}>
          {PRIORITIES.map((p) => (
            <option key={p} value={p}>
              {p}
            </option>
          ))}
        </select>
      </div>

      <div className="input-group">
        <label className="field-label">NOTES (OPTIONAL)</label>
        <textarea
          className="modern-input"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Access, vitals, caller phone…"
          rows={3}
          style={{ resize: 'vertical', minHeight: 72 }}
        />
      </div>

      <p className="facility-muted" style={{ marginBottom: 12, fontSize: '0.9rem' }}>
        {driverStatusText}
      </p>

      <button type="submit" className="confirm-btn" disabled={loading}>
        {loading ? 'SENDING…' : 'SEND DISPATCH'}
      </button>
    </form>
  );
};

export default CreateBooking;
