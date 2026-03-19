import React, { useState, useCallback, useEffect } from 'react';
import { useJsApiLoader } from '@react-google-maps/api';
import { supabase } from '../supabaseClient';
import MapComponent from './MapComponent';
import CreateBooking from './CreateBooking';
import './Dashboard1.css'; 

const libraries = ['places'];

const Dashboard = () => {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [drivers, setDrivers] = useState([]);
  
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
      {/* BASE LAYER: FULLSCREEN MAP */}
      <div className="map-background">
        <MapComponent />
      </div>

      {/* UI OVERLAY */}
      <div className="ui-container">
        {/* FLOATING BANNER */}
        <div className="banner-anchor">
          <header className="main-banner">
            <div className="banner-left">
              <span className="brand-pin">📍</span>
              <h2 className="banner-title">Fleet Management</h2>
            </div>
            <div className="banner-right">
              <button className="submit-btn">Submit to get the template</button>
              <div className="notif-wrapper">
                <span className="icon">🔔</span>
                <span className="blue-dot"></span>
              </div>
              <div className="profile-group">
                <div className="avatar">OS</div>
                <span className="arrow">▼</span>
              </div>
            </div>
          </header>
        </div>

        {/* WORKSPACE AREA */}
        <div className="workspace-content">
          <nav className="side-nav">
             <div className={`nav-link ${activeTab === 'dashboard' ? 'active' : ''}`} onClick={() => setActiveTab('dashboard')}>📊</div>
             <div className="nav-link">🚚</div>
             <div className="nav-link">📂</div>
             <div className="nav-spacer"></div>
             <div className="nav-link">⚙️</div>
          </nav>

          <main className="hud-panel">
            <header className="hud-header">
              <h1>Operations HUD</h1>
              <input type="text" placeholder="Search units..." className="hud-search" />
            </header>
            <div className="hud-scroll-hide">
               <CreateBooking onBookingCreated={fetchData} />
               <div className="unit-list">
                 {drivers.map(driver => (
                   <div key={driver.id} className="unit-item">
                     <div className="unit-icon-box">🚑</div>
                     <div className="unit-info">
                       <p className="name">{driver.name}</p>
                       <p className="meta">Unit {driver.id.toString().slice(0,5)}</p>
                     </div>
                     <span className="badge available">AVAILABLE</span>
                   </div>
                 ))}
               </div>
            </div>
          </main>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;