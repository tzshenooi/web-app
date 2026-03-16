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

  const calculateDistance = (lat1, lon1, lat2, lon2) => {
    const R = 6371; 
    const dLat = (lat2 - lat1) * (Math.PI / 180);
    const dLon = (lon2 - lon1) * (Math.PI / 180);
    const a = 
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c; 
  };

  const findNearestAmbulance = async (targetLat, targetLng) => {
    console.log("--- SMART DISPATCH CHECK ---");
    
    const { data: drivers, error } = await supabase.from('drivers').select('*');
    
    if (error || !drivers) return;

    let closest = null;
    let minDistance = Infinity;

    drivers.forEach(driver => {
      // .trim() removes any accidental spaces like "Available "
      const statusClean = (driver.status || "").trim().toLowerCase();
      const isAvailable = statusClean === 'available';
      const hasLocation = driver.current_lat !== null && driver.current_lng !== null;

      if (isAvailable && hasLocation) {
        const dist = calculateDistance(targetLat, targetLng, driver.current_lat, driver.current_lng);
        console.log(`✅ ${driver.name} is available and ${dist.toFixed(2)} km away.`);

        if (dist < minDistance) {
          minDistance = dist;
          closest = { ...driver, distance: dist.toFixed(2) };
        }
      } else {
        console.log(`❌ Skipping ${driver.name}: [Available: ${isAvailable}] [HasLocation: ${hasLocation}] (Status in DB: "${driver.status}")`);
      }
    });

    setNearestDriver(closest);
  };

  const onPlaceChanged = () => {
    const place = autocompleteRef.current.getPlace();
    if (place && place.geometry) {
      const selectedLat = place.geometry.location.lat();
      const selectedLng = place.geometry.location.lng();
      
      setFormData(prev => ({
        ...prev,
        location: place.formatted_address,
        lat: selectedLat,
        lng: selectedLng
      }));

      findNearestAmbulance(selectedLat, selectedLng);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.lat) return alert("Please select a location from the search list!");

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
      alert(`Emergency Dispatched! Assigned to: ${nearestDriver?.name}`);
      setNearestDriver(null);
    }
  };

  return (
    <div className="panel">
      <h2>Create New Emergency Booking</h2>
      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label>Patient Name</label>
          <input 
            type="text" 
            placeholder="Name"
            required 
            onChange={(e) => setFormData({...formData, patient_name: e.target.value})} 
          />
        </div>

        <div className="form-group">
          <label>Location (Search and Select)</label>
          <Autocomplete 
            onLoad={r => (autocompleteRef.current = r)} 
            onPlaceChanged={onPlaceChanged}
          >
            <input type="text" placeholder="Search for incident address..." required />
          </Autocomplete>
        </div>

        <div className="form-group">
          <label>Emergency Type</label>
          <select onChange={(e) => setFormData({...formData, emergency_type: e.target.value})}>
            <option>Medical</option>
            <option>Accident</option>
            <option>Fire</option>
          </select>
        </div>

        <div className="form-group">
          <label>Notes</label>
          <textarea 
            placeholder="Patient condition..."
            onChange={(e) => setFormData({...formData, notes: e.target.value})} 
          />
        </div>

        {nearestDriver ? (
          <div style={{ backgroundColor: '#e3f2fd', padding: '12px', borderRadius: '8px', border: '1px solid #2196f3', marginTop: '10px' }}>
             <p style={{ margin: 0, fontSize: '14px', color: '#0d47a1' }}>
              💡 <strong>Smart Dispatch Suggestion:</strong><br/>
              Nearest: <strong>{nearestDriver.name}</strong> ({nearestDriver.distance} km)
            </p>
          </div>
        ) : (
          <div style={{ padding: '12px', color: '#666', fontSize: '12px' }}>
            Enter a location to find available ambulances...
          </div>
        )}

        <button type="submit" className="btn-primary" style={{ width: '100%', marginTop: '15px' }}>
          Create Booking
        </button>
      </form>
    </div>
  );
};

export default CreateBooking;