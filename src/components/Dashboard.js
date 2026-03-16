import React, { useState, useCallback } from 'react';
import { useJsApiLoader } from '@react-google-maps/api';
import MapComponent from './MapComponent';
import CreateBooking from './CreateBooking';
import './Dashboard1.css'; // Ensure your styling is imported

// 1. Define the Google Maps Libraries we need
const libraries = ['places'];

const Dashboard = () => {
  // 2. Load the Google Maps Script
  const { isLoaded, loadError } = useJsApiLoader({
    googleMapsApiKey: "AIzaSyA4N7C2qiLgqaHsYWpxltHI4UvWyx1G-bo", // Replace with your key
    libraries,
  });

  // 3. State to trigger Map Refresh
  const [mapRefreshTrigger, setMapRefreshTrigger] = useState(0);

  // 4. Callback for when a booking is successfully saved in Supabase
  const handleBookingCreated = useCallback(() => {
    console.log("🚀 Booking detected! Refreshing Map...");
    setMapRefreshTrigger(prev => prev + 1);
  }, []);

  if (loadError) return <div className="error">Error loading maps. Check API Key.</div>;
  if (!isLoaded) return <div className="loading">Initializing Smart Dispatcher...</div>;

  return (
    <div className="dashboard-container">
      {/* LEFT PANEL: Booking and Fleet Management */}
      <div className="sidebar">
        <header className="header">
          <h1>Ambulance Command Center</h1>
          <p>Real-time Dispatch & Fleet Monitoring</p>
        </header>

        <div className="scroll-content">
          {/* Booking Form Component */}
          <CreateBooking onBookingCreated={handleBookingCreated} />

          {/* Optional: Fleet Status List */}
          <div className="panel fleet-status">
            <h3>Live Fleet Status</h3>
            <div className="status-item">
              <span className="dot online"></span> 
              <strong>hiarc</strong> - Padang Serai (Available)
            </div>
            <div className="status-item">
              <span className="dot online"></span> 
              <strong>shit</strong> - USM (Available)
            </div>
          </div>
        </div>
      </div>

      {/* RIGHT PANEL: The "Grab-style" Map */}
      <div className="map-area">
        <MapComponent refreshTrigger={mapRefreshTrigger} />
        
        {/* Map Legend Overlay */}
        <div className="map-overlay-legend">
          <div className="legend-item">🚑 Ambulance</div>
          <div className="legend-item">🆘 Emergency Incident</div>
          <div className="legend-item"><span className="line-green"></span> Route Path</div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;