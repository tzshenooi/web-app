import React, { useEffect, useState } from 'react';
import { supabase } from '../supabaseClient';
import '../App.css'; // Ensure you have the CSS for the modal

const BookingList = () => {
  const [bookings, setBookings] = useState([]);
  const [drivers, setDrivers] = useState([]); 
  
  // --- STATE FOR ASSIGN POPUP ---
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [selectedJobId, setSelectedJobId] = useState(null);
  const [driverIdInput, setDriverIdInput] = useState('');

  // --- STATE FOR ADD DRIVER POPUP ---
  const [showAddDriverModal, setShowAddDriverModal] = useState(false);
  const [newDriverName, setNewDriverName] = useState('');
  const [newDriverEmail, setNewDriverEmail] = useState('');

  // 1. Fetch Data
  const fetchData = async () => {
    // Fetch Bookings
    const { data: bookingData } = await supabase
      .from('bookings')
      .select('*')
      .order('created_at', { ascending: false });
    if (bookingData) setBookings(bookingData);

    // Fetch Drivers
    const { data: driverData } = await supabase.from('drivers').select('*');
    if (driverData) setDrivers(driverData);
  };

  useEffect(() => {
    fetchData();
    
    // Realtime Listener
    const channel = supabase
      .channel('dashboard-live')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'bookings' }, fetchData)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'drivers' }, fetchData) // Listen to driver changes too
      .subscribe();
    
    const interval = setInterval(fetchData, 2000);
    return () => {
      supabase.removeChannel(channel);
      clearInterval(interval);
    };
  }, []);

  // 2. Handle Assign Driver
  const handleAssignClick = (jobId) => {
    setSelectedJobId(jobId);
    setDriverIdInput('');
    setShowAssignModal(true);
  };

  const submitAssignment = async () => {
    if (!driverIdInput) return alert("Please select a driver");
    try {
      await supabase.from('bookings').update({ status: 'Assigned', driver_id: driverIdInput }).eq('id', selectedJobId);
      await supabase.from('drivers').update({ status: 'Busy' }).eq('email', driverIdInput);
      setShowAssignModal(false);
      fetchData(); 
    } catch (error) {
      alert("Error: " + error.message);
    }
  };

  // 3. Handle Add New Driver
  const addNewDriver = async () => {
    if (!newDriverName || !newDriverEmail) return alert("Please fill in all fields");
    
    try {
      const { error } = await supabase.from('drivers').insert([
        { name: newDriverName, email: newDriverEmail, status: 'Available' }
      ]);

      if (error) throw error;

      alert("✅ Driver Added! (Remember to create their Login in Supabase Auth)");
      setNewDriverName('');
      setNewDriverEmail('');
      setShowAddDriverModal(false);
      fetchData();
    } catch (error) {
      alert("Error adding driver: " + error.message);
    }
  };

  const availableCount = drivers.filter(d => d.status === 'Available').length;

  return (
    <div>
      {/* --- HEADER SECTION --- */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <h3>📋 Live Job Status</h3>
        <button 
          onClick={() => setShowAddDriverModal(true)}
          style={{ padding: '10px 15px', backgroundColor: '#2c3e50', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '5px' }}
        >
          ➕ Add New Driver
        </button>
      </div>

      {/* --- BOOKING LIST --- */}
      {bookings.length === 0 ? <p style={{color: '#777', textAlign:'center'}}>No active incidents.</p> : 
        bookings.map((job) => (
          <div key={job.id} className="incident-card">
            <div className="incident-type" style={{ color: '#d9534f' }}>{job.emergency_type || 'Emergency'}</div>
            <div className="incident-details"><strong>Patient:</strong> {job.patient_name}</div>
            <div className="incident-details"><strong>Loc:</strong> {job.location}</div>
            {job.notes && <div className="incident-details" style={{fontSize:'0.85rem', color:'#666'}}>"{job.notes}"</div>}
            
            <div style={{ marginTop: '10px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span className={`status-badge ${job.status === 'Accepted' ? 'status-accepted' : 'status-pending'}`}>
                {job.status}
              </span>

              {job.status === 'Pending' && (
                <button 
                  onClick={() => handleAssignClick(job.id)}
                  style={{ padding: '6px 12px', backgroundColor: '#007bff', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '0.8rem' }}
                >
                  Assign Driver
                </button>
              )}
            </div>
            {job.driver_id && <div style={{ marginTop: '5px', fontSize: '0.8rem', color: '#888' }}>🚑 Driver: {job.driver_id}</div>}
          </div>
        ))
      }

      {/* --- POPUP 1: ASSIGN DRIVER --- */}
      {showAssignModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h3>Assign Driver</h3>
            <p>Select an available unit ({availableCount} Ready):</p>
            <select 
              value={driverIdInput}
              onChange={(e) => setDriverIdInput(e.target.value)}
              style={{width: '100%', padding: '10px', marginBottom: '15px', borderRadius: '4px', border: '1px solid #ccc'}}
            >
              <option value="">-- Choose Driver --</option>
              {drivers.map((driver) => (
                <option key={driver.id} value={driver.email} disabled={driver.status === 'Busy'} style={{color: driver.status === 'Busy' ? '#ccc' : 'black'}}>
                  {driver.name} ({driver.status})
                </option>
              ))}
            </select>
            <div style={{display: 'flex', justifyContent: 'flex-end', gap: '10px'}}>
              <button onClick={() => setShowAssignModal(false)} style={{padding: '8px', cursor: 'pointer'}}>Cancel</button>
              <button onClick={submitAssignment} style={{padding: '8px 15px', backgroundColor: '#28a745', color:'white', border:'none', borderRadius:'4px', cursor: 'pointer'}}>Confirm</button>
            </div>
          </div>
        </div>
      )}

      {/* --- POPUP 2: ADD NEW DRIVER (NEW!) --- */}
      {showAddDriverModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h3>➕ Register New Unit</h3>
            <p style={{marginBottom: '15px', color: '#666', fontSize: '0.9rem'}}>Add a new ambulance driver to the fleet.</p>
            
            <div className="form-group">
              <label>Driver Name</label>
              <input type="text" value={newDriverName} onChange={(e) => setNewDriverName(e.target.value)} placeholder="e.g. John Doe" />
            </div>

            <div className="form-group">
              <label>Driver Email</label>
              <input type="email" value={newDriverEmail} onChange={(e) => setNewDriverEmail(e.target.value)} placeholder="e.g. john@ambulance.com" />
            </div>

            <div style={{display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '20px'}}>
              <button onClick={() => setShowAddDriverModal(false)} style={{padding: '8px', cursor: 'pointer'}}>Cancel</button>
              <button onClick={addNewDriver} style={{padding: '8px 15px', backgroundColor: '#2c3e50', color:'white', border:'none', borderRadius:'4px', cursor: 'pointer'}}>Add Driver</button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default BookingList;