import React, { useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useJsApiLoader } from '@react-google-maps/api';
import { supabase } from '../supabaseClient';
import CreateBooking from './CreateBooking';
import BookingList from './BookingList';
import MapComponent from './MapComponent';
import AddDriver from './AddDriver'; // 1. Import your new component
import '../App.css';

const libraries = ['places'];

const Dashboard = () => {
  const navigate = useNavigate();
  const mapRef = useRef(null);

  const { isLoaded } = useJsApiLoader({
    id: 'google-map-script',
    googleMapsApiKey: "AIzaSyA4N7C2qiLgqaHsYWpxltHI4UvWyx1G-bo",
    libraries: libraries
  });

  const handleMoveMap = (lat, lng) => {
    if (mapRef.current) {
      mapRef.current.panTo({ lat, lng });
      mapRef.current.setZoom(16);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate('/');
  };

  if (!isLoaded) return <div>Initialising Systems...</div>;

  return (
    <div className="dashboard-container">
      <div className="dashboard-header">
        <h1>Dispatcher Command Center</h1>
        <button onClick={handleLogout} className="logout-btn">Logout</button>
      </div>

      <div className="dashboard-grid">
        {/* LEFT COLUMN: All Data Entry Forms */}
        <div className="left-column">
          <div className="panel">
            <CreateBooking onBookingCreated={handleMoveMap} />
          </div>

          {/* 2. Dedicated Fleet Management Section */}
          <div className="panel" style={{ marginTop: '20px' }}>
            <AddDriver />
          </div>
        </div>

        {/* RIGHT COLUMN: Live Map and Incident Monitoring */}
        <div className="right-column">
          <div className="panel" style={{ height: '500px', padding: '0', overflow: 'hidden' }}>
             <MapComponent onMapLoad={(map) => (mapRef.current = map)} /> 
          </div>

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