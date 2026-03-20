import React, { useState, useCallback, useEffect } from 'react';
import { useJsApiLoader } from '@react-google-maps/api';
import { supabase } from '../supabaseClient';
import MapComponent from './MapComponent';
import CreateBooking from './CreateBooking';
import './Dashboard1.css'; 

const libraries = ['places'];

const Dashboard = () => {
  const [drivers, setDrivers] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [selectedLocation, setSelectedLocation] = useState(null); // LIVE PREVIEW STATE
  
  const { isLoaded } = useJsApiLoader({
    googleMapsApiKey: "AIzaSyA4N7C2qiLgqaHsYWpxltHI4UvWyx1G-bo", 
    libraries,
  });

  const fetchData = useCallback(async () => {
    const { data: drv } = await supabase.from('drivers').select('*');
    if (drv) setDrivers(drv);
  }, []);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 5000);
    return () => clearInterval(interval);
  }, [fetchData]);

  if (!isLoaded) return <div className="loading-screen"><h2>INITIALIZING SYSTEM...</h2></div>;

  return (
    <div className="app-shell">
      <div className="map-background">
        {/* Pass previewLocation to the Map */}
        <MapComponent previewLocation={selectedLocation} />
      </div>

      <div className="ui-container">
        <div className="banner-anchor">
          <header className="main-banner">
            <div className="banner-left">
              <span className="brand-pin">📍</span>
              <h2 className="banner-title">Fleet Management</h2>
            </div>
            <div className="banner-right">
              <button className="status-pill">System Online</button>
              <div className="profile-group"><div className="avatar">OS</div></div>
            </div>
          </header>
        </div>

        <div className="workspace-content">
          <nav className="side-nav">
             <div className="nav-link active">📊</div>
             <div className="nav-spacer"></div>
             <div className="nav-link">⚙️</div>
          </nav>

          <main className="hud-panel">
            <header className="hud-header">
              <h1 className="hud-title">Active Vehicles</h1>
              <input type="text" placeholder="Search units..." className="hud-search" />
            </header>
            <div className="hud-scroll-hide">
               <div className="fleet-list-container">
                  {drivers.map(driver => (
                    <div key={driver.id} className="unit-row-item">
                      <div className="unit-visual">
                        <div className="unit-icon-bg">🚑</div>
                        <span className={`status-dot-mini ${driver.status === 'Available' ? 'online' : 'busy'}`}></span>
                      </div>
                      <div className="unit-content">
                        <strong>{driver.name}</strong>
                        <div className="unit-secondary-line">Unit {driver.id.toString().slice(0, 5)}</div>
                      </div>
                      <button className="trip-btn">Trip ▼</button>
                    </div>
                  ))}
               </div>
            </div>
          </main>
        </div>

        <button className="fab-dispatch" onClick={() => setShowModal(true)}>
          <span className="fab-icon">🚑</span>
          <span className="fab-text">New Dispatch</span>
        </button>
      </div>

      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <header className="modal-header">
              <h3>New Incident Dispatch</h3>
              <button className="close-btn" onClick={() => setShowModal(false)}>×</button>
            </header>
            <div className="modal-body">
              <CreateBooking 
                onLocationSelected={setSelectedLocation} // Updates map in real-time
                onBookingCreated={() => {
                  setShowModal(false);
                  fetchData();
                }} 
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;