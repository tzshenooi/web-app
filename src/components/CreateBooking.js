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
    if (!location) return alert("Please select a location from the dropdown suggestions.");
    
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
      setLocation(null);
      onBookingCreated();
    }
    setLoading(false);
  };

  return (
    <div className="dispatch-container">
      <div className="dispatch-header">
        <span className="dispatch-icon">🚨</span>
        <h3 className="dispatch-title">New Incident Dispatch</h3>
      </div>
      
      <form onSubmit={handleSubmit} className="dispatch-form">
        <div className="input-group">
          <label className="field-label">PATIENT NAME</label>
          <input 
            type="text" 
            className="modern-input"
            placeholder="Search or enter name..." 
            value={patientName}
            onChange={(e) => setPatientName(e.target.value)}
            required 
          />
        </div>

        <div className="input-group">
          <label className="field-label">INCIDENT LOCATION</label>
          <Autocomplete
            apiKey="AIzaSyA4N7C2qiLgqaHsYWpxltHI4UvWyx1G-bo"
            onPlaceSelected={(place) => {
              if (!place.geometry) return;
              setLocation({
                address: place.formatted_address,
                lat: place.geometry.location.lat(),
                lng: place.geometry.location.lng(),
              });
            }}
            options={{ types: [], componentRestrictions: { country: 'my' } }}
            placeholder="Search KFC, Hospital, or Street..."
            className="modern-input"
          />
        </div>

        <div className="input-row">
          <div className="input-half">
             <label className="field-label">PRIORITY</label>
             <select className="modern-select" value={priority} onChange={(e) => setPriority(e.target.value)}>
              <option>Medical</option>
              <option>Trauma</option>
              <option>Cardiac</option>
            </select>
          </div>
          <div className="input-half">
            <label className="field-label">NEAREST UNIT</label>
            <div className="nearest-unit-display">
              {location ? "Unit 04 (2.1km)" : "Awaiting GPS..."}
            </div>
          </div>
        </div>

        <button type="submit" className="confirm-btn" disabled={loading}>
          {loading ? "COMMUNICATING..." : "CONFIRM DISPATCH"}
        </button>
      </form>
    </div>
  );
};

export default CreateBooking;