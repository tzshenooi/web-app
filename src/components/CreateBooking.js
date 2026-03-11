import React, { useState, useRef } from 'react';
import { Autocomplete } from '@react-google-maps/api';
import { supabase } from '../supabaseClient';

const CreateBooking = ({ onBookingCreated }) => {
  const [formData, setFormData] = useState({
    patient_name: '',
    location: '',
    lat: null,
    lng: null,
    emergency_type: 'Medical',
    notes: ''
  });
  const [nearestDriver, setNearestDriver] = useState(null);
  const autocompleteRef = useRef(null);

  // Haversine Formula for distance calculation
  const calculateDistance = (lat1, lon1, lat2, lon2) => {
    const R = 6371; 
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c; 
  };

  const findNearestAmbulance = async (patientLat, patientLng) => {
    const { data: drivers } = await supabase.from('drivers').select('*').eq('status', 'Available');
    
    if (drivers && drivers.length > 0) {
      let closest = null;
      let minDistance = Infinity;

      drivers.forEach(driver => {
        if (driver.current_lat && driver.current_lng) {
          const dist = calculateDistance(patientLat, patientLng, driver.current_lat, driver.current_lng);
          if (dist < minDistance) {
            minDistance = dist;
            closest = { ...driver, distance: dist.toFixed(2) };
          }
        }
      });
      setNearestDriver(closest);
    }
  };

  const onPlaceChanged = () => {
    const place = autocompleteRef.current.getPlace();
    if (place.geometry) {
      const lat = place.geometry.location.lat();
      const lng = place.geometry.location.lng();
      setFormData({ ...formData, location: place.formatted_address, lat, lng });
      findNearestAmbulance(lat, lng);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.lat) return alert("Please select an address from the dropdown!");

    const { error } = await supabase.from('bookings').insert([{
      patient_name: formData.patient_name,
      location: formData.location,
      latitude: formData.lat,
      longitude: formData.lng,
      emergency_type: formData.emergency_type,
      notes: formData.notes,
      status: 'Pending',
      suggested_driver: nearestDriver ? nearestDriver.name : null
    }]);

    if (!error) {
      onBookingCreated(formData.lat, formData.lng);
      alert(`✅ Booking Created! Suggested: ${nearestDriver ? nearestDriver.name : "None"}`);
    }
  };

  return (
    <div className="panel">
      <h2>Create New Emergency Booking</h2>
      <form onSubmit={handleSubmit}>
        
        {/* 1. Patient Name (Was Missing) */}
        <div className="form-group">
          <label>Patient Name</label>
          <input 
            type="text" 
            required 
            onChange={(e) => setFormData({...formData, patient_name: e.target.value})} 
          />
        </div>

        {/* 2. Location */}
        <div className="form-group">
          <label>Location (Search and Select)</label>
          <Autocomplete onLoad={r => autocompleteRef.current = r} onPlaceChanged={onPlaceChanged}>
            <input type="text" placeholder="Search address..." required />
          </Autocomplete>
        </div>

        {/* 3. Emergency Type (Was Missing) */}
        <div className="form-group">
          <label>Emergency Type</label>
          <select onChange={(e) => setFormData({...formData, emergency_type: e.target.value})}>
            <option>Medical</option>
            <option>Accident</option>
            <option>Fire</option>
          </select>
        </div>

        {/* 4. Notes (Was Missing) */}
        <div className="form-group">
          <label>Notes</label>
          <textarea 
            onChange={(e) => setFormData({...formData, notes: e.target.value})} 
            placeholder="Additional details..."
          />
        </div>

        {/* Smart Suggestion Box */}
        {nearestDriver && (
          <div style={{ backgroundColor: '#e1f5fe', padding: '10px', borderRadius: '5px', margin: '10px 0', border: '1px solid #01579b' }}>
            <p style={{ margin: 0, fontSize: '14px', color: '#01579b' }}>
              💡 <strong>Smart Dispatch Suggestion:</strong> <br/>
              Nearest: <strong>{nearestDriver.name}</strong> ({nearestDriver.distance} km)
            </p>
          </div>
        )}

        <button type="submit" className="btn-primary" style={{width: '100%', marginTop: '10px'}}>
          Create Booking
        </button>
      </form>
    </div>
  );
};

export default CreateBooking;