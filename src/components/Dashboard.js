import React, { useState, useCallback, useEffect, useMemo } from 'react';
import { useJsApiLoader } from '@react-google-maps/api';
import { supabase } from '../supabaseClient';
import MapComponent from './MapComponent';
import CreateBooking from './CreateBooking';
import './Dashboard1.css'; 

const libraries = ['places'];

const Dashboard = () => {
  const [drivers, setDrivers] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [selectedLocation, setSelectedLocation] = useState(null);
  const [mapFocus, setMapFocus] = useState(null);
  const [expandedUnit, setExpandedUnit] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  
  // Notification State
  const [showNotifications, setShowNotifications] = useState(false);
  const notifications = [
    { id: 1, type: 'emergency', msg: 'New trauma case: Padang Serai', time: '2m ago' },
    { id: 2, type: 'status', msg: 'Unit 04 reached Base Station', time: '5m ago' },
    { id: 3, type: 'alert', msg: 'Heavy traffic on Jalan Masjid', time: '12m ago' }
  ];

  const { isLoaded } = useJsApiLoader({
    googleMapsApiKey: "AIzaSyA4N7C2qiLgqaHsYWpxltHI4UvWyx1G-bo", 
    libraries,
  });

  const fetchData = useCallback(async () => {
    const { data: drv } = await supabase.from('drivers').select('*');
    const { data: bkg } = await supabase.from('bookings').select('*').eq('status', 'Pending');
    if (drv) setDrivers(drv);
    if (bkg) setBookings(bkg);
  }, []);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 3000);
    return () => clearInterval(interval);
  }, [fetchData]);

  const filteredDrivers = useMemo(() => {
    return drivers.filter(d => 
      d.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      d.id.toString().includes(searchTerm)
    );
  }, [drivers, searchTerm]);

  const handleUnitClick = (driver) => {
    setExpandedUnit(expandedUnit === driver.id ? null : driver.id);
    setMapFocus({
      lat: driver.current_lat,
      lng: driver.current_lng,
      timestamp: Date.now()
    });
  };

  if (!isLoaded) return <div className="loading-screen"><h2>INITIALIZING SYSTEM...</h2></div>;

  return (
    <div className="app-shell">
      <div className="map-background">
        <MapComponent previewLocation={selectedLocation} mapFocus={mapFocus} />
      </div>

      <div className="ui-container">
        <div className="banner-anchor">
          <header className="main-banner">
            <div className="banner-left">
              <span className="brand-pin">📍</span>
              <h2 className="banner-title">Fleet Management</h2>
            </div>
            
            <div className="banner-right">
              <div className="notification-container">
                <div 
                  className={`notification-wrapper ${showNotifications ? 'active' : ''}`}
                  onClick={() => setShowNotifications(!showNotifications)}
                >
                  <span className="nav-icon">🔔</span>
                  <span className="notification-dot"></span>
                </div>

                {showNotifications && (
                  <div className="notification-dropdown">
                    <header className="noti-header">
                      <span>Notifications</span>
                      <button onClick={() => setShowNotifications(false)}>Clear all</button>
                    </header>
                    <div className="noti-list">
                      {notifications.map(n => (
                        <div key={n.id} className="noti-item">
                          <div className={`noti-indicator ${n.type}`}></div>
                          <div className="noti-content">
                            <p>{n.msg}</p>
                            <span>{n.time}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <button className="status-pill">System Online</button>
              <div className="profile-group">
                <div className="avatar-circle">OS</div>
              </div>
            </div>
          </header>
        </div>

        <div className="workspace-content">
          <nav className="side-nav">
             <div className="nav-top-group">
                <div className="nav-link active">📊</div>
             </div>
             <div className="nav-bottom-group">
                <div className="nav-link">⚙️</div>
             </div>
          </nav>

          <main className="hud-panel">
            <header className="hud-header">
              <h1 className="hud-title">Active Vehicles</h1>
              <input 
                type="text" 
                placeholder="Search units..." 
                className="hud-search" 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </header>
            
            <div className="hud-scroll-hide">
               <div className="fleet-list-container">
                  {filteredDrivers.map(driver => {
                    const isExpanded = expandedUnit === driver.id;
                    return (
                      <div key={driver.id} className={`unit-card-new ${isExpanded ? 'expanded' : ''}`} onClick={() => handleUnitClick(driver)}>
                        <div className="card-main-content">
                          <div className="unit-visual"><div className="unit-icon-bg">🚑</div></div>
                          <div className="unit-content">
                            <span className="unit-name-text">{driver.name}</span>
                            <div className="unit-sub-text">17, May, 20 / 2h 34min</div>
                          </div>
                          <button className="trip-btn-ref">Trip ▼</button>
                        </div>

                        {isExpanded && (
                          <div className="expanded-details">
                            <div className="timeline-item">
                              <div className="node green"></div>
                              <div className="timeline-info"><strong>Base Station</strong><span>Status: Ready</span></div>
                            </div>
                            <div className="timeline-item">
                              <div className="node red"></div>
                              <div className="timeline-info"><strong>Idle</strong><span>Waiting for dispatch</span></div>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
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
              <h3 className="modal-header-title">New Incident Dispatch</h3>
              <button className="close-btn-modern" onClick={() => setShowModal(false)}>&times;</button>
            </header>
            <CreateBooking onLocationSelected={setSelectedLocation} onBookingCreated={() => { setShowModal(false); fetchData(); }} />
          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;