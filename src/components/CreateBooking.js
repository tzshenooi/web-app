import React, { useState } from 'react';
import { supabase } from '../supabaseClient';

const CreateBooking = () => {
  const [formData, setFormData] = useState({
    patient_name: '',
    location: '',
    emergency_type: 'Medical',
    notes: ''
  });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await supabase.from('bookings').insert([{ 
        patient_name: formData.patient_name, 
        location: formData.location,
        emergency_type: formData.emergency_type,
        notes: formData.notes,
        status: 'Pending'
      }]);
      alert('Booking Created Successfully!');
      setFormData({ patient_name: '', location: '', emergency_type: 'Medical', notes: '' });
    } catch (error) {
      alert(error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="panel">
      <h2>Create New Emergency Booking</h2>
      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label>Patient Name</label>
          <input type="text" value={formData.patient_name} onChange={(e) => setFormData({...formData, patient_name: e.target.value})} required />
        </div>
        <div className="form-group">
          <label>Location (Address or Coordinates)</label>
          <input type="text" value={formData.location} onChange={(e) => setFormData({...formData, location: e.target.value})} required />
        </div>
        <div className="form-group">
          <label>Emergency Type</label>
          <select value={formData.emergency_type} onChange={(e) => setFormData({...formData, emergency_type: e.target.value})}>
            <option>Medical</option>
            <option>Accident</option>
            <option>Fire</option>
          </select>
        </div>
        <div className="form-group">
          <label>Notes</label>
          <textarea rows="4" value={formData.notes} onChange={(e) => setFormData({...formData, notes: e.target.value})} />
        </div>
        <button type="submit" className="btn-primary" disabled={loading}>{loading ? "Creating..." : "Create Booking"}</button>
      </form>
    </div>
  );
};

export default CreateBooking;