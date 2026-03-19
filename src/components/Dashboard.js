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
  const [bookings, setBookings] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  
  const { isLoaded } = useJsApiLoader({
    googleMapsApiKey: "AIzaSyA4N7C2qiLgqaHsYWpxltHI4UvWyx1G-bo", 
    libraries,
  });

  const fetchData = useCallback(async () => {
    const { data: drv } = await supabase.from('drivers').select('*');
    const { data: bkg } = await supabase.from('bookings').select('*').order('created_at', { ascending: false });
    if (drv) setDrivers(drv);
    if (bkg) setBookings(bkg);
  }, []);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 5000);
    return () => clearInterval(interval);
  }, [fetchData]);

  if (!isLoaded) return <div className="loading-screen">Syncing Satellite Data...</div>;

  const onlineUnits = drivers.filter(d => d.status === 'Available').length;

  return (
    <div className="app-shell">
      {/* 1. TOP BANNER - FLOATING OVER MAP */}
      <header className="top-banner">
        <div className="banner-left">
          <span className="banner-icon">📍</span>
          <h2>Fleet Management</h2>
        </div>
        <div className="banner-right">
          <button className="submit-report-btn">Submit Report</button>
          <div className="banner-notif">🔔</div>
          <div className="user-avatar">OS</div>
        </div>
      </header>

      {/* 2. THE MAP BASE LAYER (COVERS EVERYTHING) */}
      <div className="map-background">
        <MapComponent />
      </div>

      {/* 3. INTERACTIVE UI LAYER */}
      <div className="workspace-layer">
        {/* SLIM SIDEBAR */}
        <nav className="pill-sidebar">
          <div className={`nav-item ${activeTab === 'dashboard' ? 'active' : ''}`} onClick={() => setActiveTab('dashboard')}>📊</div>
          <div className={`nav-item ${activeTab === 'fleet' ? 'active' : ''}`} onClick={() => setActiveTab('fleet')}>🚚</div>
          <div className={`nav-item ${activeTab === 'history' ? 'active' : ''}`} onClick={() => setActiveTab('history')}>📂</div>
          <div className="nav-spacer"></div>
          <div className="nav-bottom-item">⚙️</div>
          <div className="nav-arrow">›</div>
        </nav>

        {/* FEATURE PANEL */}
        <aside className="feature-panel">
          <header className="panel-header">
            <h1>{activeTab === 'dashboard' ? 'Active Vehicles' : 'Incident Logs'}</h1>
            <div className="search-box-wrapper">
              <input 
                type="text" 
                className="panel-search" 
                placeholder="Search..." 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </header>

          <div className="scroll-area">
            {activeTab === 'dashboard' && (
              <div className="view-fade">
                <CreateBooking onBookingCreated={fetchData} />
                <h3 className="section-label">Fleet HUD</h3>
                {drivers.map(driver => (
                  <div key={driver.id} className="unit-card">
                    <div className="card-top">
                      <strong>{driver.name}</strong>
                      <span className={`status-text ${driver.status === 'Available' ? 'on' : 'off'}`}>{driver.status}</span>
                    </div>
                    <div className="card-meta">ALS Unit • Padang Serai</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </aside>

        {/* TOP STATUS CHIPS */}
        <div className="status-chips">
          <div className="chip"><span className="dot green"></span> {onlineUnits} Online</div>
          <div className="chip"><span className="dot blue"></span> {bookings.length} Jobs</div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;