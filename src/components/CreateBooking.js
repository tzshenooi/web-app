import React, { useState } from 'react';
import { supabase } from '../supabaseClient';
import Autocomplete from 'react-google-autocomplete';

const CreateBooking = ({ onBookingCreated, onLocationSelected }) => {
  const [patientName, setPatientName] = useState('');
  const [location, setLocation] = useState(null);
  const [priority, setPriority] = useState('Medical');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);

  const handlePlaceSelect = (place) => {
    if (!place.geometry) return;
    const locData = {
      address: place.formatted_address,
      lat: place.geometry.location.lat(),
      lng: place.geometry.location.lng(),
    };
    setLocation(locData);
    onLocationSelected(locData); 
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!location) return alert("Select a location.");
    setLoading(true);
    
    const { error } = await supabase.from('bookings').insert([{
      patient_name: patientName,
      location: location.address,
      latitude: location.lat,
      longitude: location.lng,
      emergency_type: priority,
      notes: notes,
      status: 'Pending'
    }]);

    if (!error) {
      onBookingCreated();
      onLocationSelected(null);
    }
    setLoading(false);
  };

  return (
    <div className="dispatch-container">
      <form onSubmit={handleSubmit} className="dispatch-form">
        <div className="input-group">
          <label className="field-label">PATIENT NAME</label>
          <input type="text" className="modern-input" value={patientName} onChange={(e) => setPatientName(e.target.value)} required />
        </div>

        <div className="input-group">
          <label className="field-label">INCIDENT LOCATION</label>
          <Autocomplete
            apiKey="AIzaSyA4N7C2qiLgqaHsYWpxltHI4UvWyx1G-bo"
            onPlaceSelected={handlePlaceSelect}
            options={{ types: [], componentRestrictions: { country: 'my' } }}
            className="modern-input"
            placeholder="Enter a location"
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
            <div className="nearest-unit-display" style={{ fontWeight: '700', marginTop: '10px' }}>
              {location ? "Unit 04 (2.1km)" : "Awaiting GPS..."}
            </div>
          </div>
        </div>

        <div className="input-group">
          <label className="field-label">CRITICAL NOTES</label>
          <textarea className="modern-input" style={{minHeight: '80px', resize: 'none'}} value={notes} onChange={(e) => setNotes(e.target.value)} />
        </div>

        <button type="submit" className="confirm-btn" disabled={loading}>
          {loading ? "COMMUNICATING..." : "CONFIRM DISPATCH"}
        </button>
      </form>
    </div>
  );
};

export default CreateBooking;