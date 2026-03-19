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
      <div className="form-header" style={{display:'flex', alignItems:'center', gap:'10px', marginBottom:'15px'}}>
        <span style={{fontSize:'1.2rem'}}>🚨</span>
        <h3 style={{margin:0, fontSize:'1rem', fontWeight:800}}>New Incident Dispatch</h3>
      </div>
      
      <form onSubmit={handleSubmit}>
        <div style={{marginBottom:'12px'}}>
          <label style={{display:'block', fontSize:'0.75rem', fontWeight:700, color:'#64748b', marginBottom:'5px'}}>PATIENT NAME</label>
          <input 
            type="text" 
            style={{width:'100%', padding:'10px', borderRadius:'8px', border:'1px solid #e2e8f0', outline:'none'}}
            placeholder="Search or enter name..." 
            value={patientName}
            onChange={(e) => setPatientName(e.target.value)}
            required 
          />
        </div>

        <div style={{marginBottom:'12px'}}>
          <label style={{display:'block', fontSize:'0.75rem', fontWeight:700, color:'#64748b', marginBottom:'5px'}}>INCIDENT LOCATION</label>
          <Autocomplete
            apiKey="YOUR_API_KEY"
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
            placeholder="Verify Address via GPS..."
            style={{width:'100%', padding:'10px', borderRadius:'8px', border:'1px solid #e2e8f0', outline:'none'}}
          />
        </div>

        <div style={{display:'flex', gap:'10px', marginBottom:'12px'}}>
          <div style={{flex:1}}>
             <label style={{display:'block', fontSize:'0.75rem', fontWeight:700, color:'#64748b', marginBottom:'5px'}}>PRIORITY</label>
             <select 
                style={{width:'100%', padding:'10px', borderRadius:'8px', border:'1px solid #e2e8f0', background:'white'}} 
                value={priority} 
                onChange={(e) => setPriority(e.target.value)}
             >
              <option>Medical</option>
              <option>Trauma</option>
              <option>Cardiac</option>
            </select>
          </div>
          <div style={{flex:1}}>
            <label style={{display:'block', fontSize:'0.75rem', fontWeight:700, color:'#64748b', marginBottom:'5px'}}>NEAREST UNIT</label>
            <div style={{fontSize:'0.8rem', color:'#3b82f6', paddingTop:'10px'}}>
              {location ? "Unit 04 (2.1km)" : "Awaiting GPS..."}
            </div>
          </div>
        </div>

        <button type="submit" className="btn-confirm-dispatch" disabled={loading}>
          {loading ? "COMMUNICATING..." : "CONFIRM DISPATCH"}
        </button>
      </form>
    </div>
  );
};

export default CreateBooking;