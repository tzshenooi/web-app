import React, { useState, useMemo } from 'react';
import { supabase } from '../supabaseClient';
import Autocomplete from 'react-google-autocomplete';

const CreateBooking = ({ onBookingCreated, onLocationSelected, drivers }) => {
  const [patientName, setPatientName] = useState('');
  const [location, setLocation] = useState(null);
  const [priority, setPriority] = useState('Medical');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);

  // --- NEW: Calculate the nearest driver based on GPS ---
 const nearestDriver = useMemo(() => {
  // 🟢 CHANGE: Filter to only include drivers with status 'Available'
  const availableDrivers = drivers?.filter(d => d.status === 'Available') || [];

  if (!location || availableDrivers.length === 0) return null;

  return availableDrivers.reduce((prev, curr) => {
    const getDist = (d) => Math.sqrt(Math.pow(d.current_lat - location.lat, 2) + Math.pow(d.current_lng - location.lng, 2));
    return getDist(curr) < getDist(prev) ? curr : prev;
  });
}, [location, drivers]);

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
    
    // --- FIXED: Now including the driver_id ---
    const { error } = await supabase.from('bookings').insert([{
      patient_name: patientName,
      location: location.address,
      latitude: location.lat,
      longitude: location.lng,
      emergency_type: priority,
      notes: notes,
      status: 'Pending',
      driver_id: nearestDriver ? nearestDriver.id : null // ASIGNING THE UNIT
    }]);

    if (!error) {
      onBookingCreated();
      onLocationSelected(null);
    } else {
      console.error("Supabase Error:", error.message);
      alert("Error creating booking. Check console.");
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

        <div className="input-row" style={{ display: 'flex', gap: '20px', marginBottom: '22px' }}>
  <div className="input-half" style={{ flex: 1 }}>
     <label className="field-label">PRIORITY</label>
     <select className="modern-select" value={priority} onChange={(e) => setPriority(e.target.value)}>
       <option>Medical</option>
       <option>Trauma</option>
       <option>Cardiac</option>
     </select>
  </div>
  
  <div className="input-half" style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
    <label className="field-label" style={{ textAlign: 'left', display: 'block', width: '100%' }}>NEAREST UNIT</label>
    <div className={`nearest-unit-box ${nearestDriver ? 'ready' : 'waiting'}`}>
  {nearestDriver 
    ? `Unit ${nearestDriver.name}` 
    : (drivers.some(d => d.status === 'Available') ? "Awaiting GPS..." : "NO UNITS ON DUTY")
  }
</div>
  </div>
        </div>

        <div className="input-group">
          <label className="field-label">CRITICAL NOTES</label>
          <textarea className="modern-input" style={{minHeight: '80px', resize: 'none'}} value={notes} onChange={(e) => setNotes(e.target.value)} />
        </div>

        <button type="submit" className="confirm-btn" disabled={loading || !location}>
          {loading ? "COMMUNICATING..." : "CONFIRM DISPATCH"}
        </button>
      </form>
    </div>
  );
};

export default CreateBooking;