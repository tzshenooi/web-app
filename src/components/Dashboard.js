import React from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import CreateBooking from './CreateBooking';
import BookingList from './BookingList';
import '../App.css';

const Dashboard = () => {
  const navigate = useNavigate();

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate('/');
  };

  return (
    <div className="dashboard-container">
      <div className="dashboard-header">
        <h1>Dispatcher Command Center</h1>
        <button onClick={handleLogout} className="logout-btn">Logout</button>
      </div>

      <div className="dashboard-grid">
        {/* Left Column: Create Form */}
        <div className="left-column">
          <CreateBooking />
        </div>

        {/* Right Column: Maps & List */}
        <div className="right-column">
          {/* Map Placeholder Card */}
          <div className="panel" style={{ height: '200px', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#f8f9fa' }}>
             <div style={{textAlign: 'center', color: '#777'}}>
                <h3>Google Maps Integration</h3>
                <p>Live fleet tracking will be displayed here.</p>
             </div>
          </div>

          {/* Active Incidents List */}
          <div className="panel">
            <h2>Active Incidents</h2>
            <BookingList />
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;