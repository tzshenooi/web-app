import React, { useState } from 'react';
import { supabase } from '../supabaseClient';
import Autocomplete from 'react-google-autocomplete';

const CreateBooking = ({ onBookingCreated }) => {
  const [patientName, setPatientName] = useState('');
  const [location, setLocation] = useState(null);
  const [priority, setPriority] = useState('Medical');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!location) return alert("Please validate a location via GPS search.");
    
    setLoading(true);
    const { error } = await supabase.from('bookings').insert([{
      patient_name: patientName,
      emergency_location: location.address,
      latitude: location.lat,
      longitude: location.lng,
      emergency_type: priority,
      critical_notes: notes,
      status: 'Pending'
    }]);

    if (!error) {
      setPatientName('');
      setNotes('');
      setLocation(null);
      onBookingCreated();
    }
    setLoading(false);
  };

  return (
    <div className="dispatch-form-container">
      <div className="form-header">
        <span className="emergency-indicator">🚨</span>
        <h3 className="form-title">Incident Dispatch Log</h3>
      </div>
      
      <form onSubmit={handleSubmit} className="modern-form">
        <div className="form-input-group">
          <label className="form-label">Patient Name</label>
          <input 
            type="text" 
            className="form-input-field"
            placeholder="Full Legal Name" 
            value={patientName}
            onChange={(e) => setPatientName(e.target.value)}
            required 
          />
        </div>

        <div className="form-input-group">
          <label className="form-label">Emergency Location</label>
          <Autocomplete
            apiKey="AIzaSyA4N7C2qiLgqaHsYWpxltHI4UvWyx1G-bo"
            onPlaceSelected={(place) => {
              setLocation({
                address: place.formatted_address,
                lat: place.geometry.location.lat(),
                lng: place.geometry.location.lng(),
              });
            }}
            options={{ 
              types: ['address'], 
              componentRestrictions: { country: 'my' } 
            }}
            placeholder="Validate via GPS Search..."
            className="form-input-field" 
          />
        </div>

        <div className="form-row">
          <div className="form-input-group half">
            <label className="form-label">Priority Class</label>
            <select className="form-select-field" value={priority} onChange={(e) => setPriority(e.target.value)}>
              <option>Medical</option>
              <option>Trauma</option>
              <option>Cardiac</option>
              <option>Other</option>
            </select>
          </div>
          <div className="form-input-group half">
            <label className="form-label">Suggested Unit</label>
            <div className="unit-preview-box">
              {location ? "Searching nearby..." : "Awaiting Loc..."}
            </div>
          </div>
        </div>

        <div className="form-input-group">
          <label className="form-label">Critical Notes</label>
          <textarea 
            className="form-textarea-field"
            placeholder="Patient condition or hazard info..." 
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows="2"
          />
        </div>

        <button type="submit" className="btn-confirm-dispatch" disabled={loading}>
          {loading ? "Processing..." : "Confirm Dispatch"}
        </button>
      </form>
    </div>
  );
};

export default CreateBooking;