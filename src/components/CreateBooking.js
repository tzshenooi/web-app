import React, { useState } from 'react';
import axios from 'axios';

const CreateBooking = () => {
    const [formData, setFormData] = useState({
        patient_name: '',
        location: '',
        emergency_type: 'Medical',
        notes: ''
    });
    const [message, setMessage] = useState('');

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            const response = await axios.post('http://localhost:5000/create_booking', formData);
            if (response.data.status === 'success') {
                setMessage('Emergency Booking Created Successfully! ID: ' + response.data.id);
                // Clear form
                setFormData({ patient_name: '', location: '', emergency_type: 'Medical', notes: '' });
            }
        } catch (error) {
            setMessage('Error creating booking.');
            console.error(error);
        }
    };

    return (
        <div className="card shadow p-4 mb-4">
            <h4 className="text-danger mb-3">Create New Emergency Booking</h4>
            {message && <div className={`alert ${message.includes('Error') ? 'alert-danger' : 'alert-success'}`}>{message}</div>}
            
            <form onSubmit={handleSubmit}>
                <div className="mb-3">
                    <label className="form-label">Patient Name</label>
                    <input 
                        type="text" 
                        className="form-control" 
                        value={formData.patient_name}
                        onChange={(e) => setFormData({...formData, patient_name: e.target.value})} 
                        required 
                    />
                </div>
                <div className="mb-3">
                    <label className="form-label">Location (Address or Coordinates)</label>
                    <input 
                        type="text" 
                        className="form-control" 
                        value={formData.location}
                        onChange={(e) => setFormData({...formData, location: e.target.value})} 
                        required 
                    />
                </div>
                <div className="mb-3">
                    <label className="form-label">Emergency Type</label>
                    <select 
                        className="form-select" 
                        value={formData.emergency_type}
                        onChange={(e) => setFormData({...formData, emergency_type: e.target.value})}
                    >
                        <option>Medical</option>
                        <option>Accident</option>
                        <option>Fire</option>
                        <option>Other</option>
                    </select>
                </div>
                <div className="mb-3">
                    <label className="form-label">Notes</label>
                    <textarea 
                        className="form-control" 
                        rows="3"
                        value={formData.notes}
                        onChange={(e) => setFormData({...formData, notes: e.target.value})}
                    ></textarea>
                </div>
                <button type="submit" className="btn btn-danger w-100">Create Booking</button>
            </form>
        </div>
    );
};

export default CreateBooking;