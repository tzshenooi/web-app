import React, { useState, useCallback, useEffect, useMemo } from 'react';
import { useJsApiLoader } from '@react-google-maps/api';
import { supabase } from '../supabaseClient';
import MapComponent from './MapComponent';
import CreateBooking from './CreateBooking';
import AddDriver from './AddDriver'; 
import './Dashboard1.css'; 

const libraries = ['places'];

const Dashboard = () => {
  const [drivers, setDrivers] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [hospitals, setHospitals] = useState([]); 
  const [view, setView] = useState('fleet'); 
  const [showModal, setShowModal] = useState(false);
  const [showAddDriverModal, setShowAddDriverModal] = useState(false);
  
  const [showNotifications, setShowNotifications] = useState(false);
  const [notifications, setNotifications] = useState([
    { id: 'init', type: 'status', msg: 'Fleet Systems Online', time: 'Now' }
  ]);

  const [selectedLocation, setSelectedLocation] = useState(null);
  const [mapFocus, setMapFocus] = useState(null);
  const [expandedUnit, setExpandedUnit] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [trafficEnabled, setTrafficEnabled] = useState(false);

  const { isLoaded } = useJsApiLoader({
    googleMapsApiKey: "AIzaSyA4N7C2qiLgqaHsYWpxltHI4UvWyx1G-bo", 
    libraries,
  });

  // 🟢 FIXED: Fleet statistics logic to match the orange dot design
  const vehicleStats = useMemo(() => {
    return {
      available: drivers.filter(d => d.status === 'Available').length,
      busy: drivers.filter(d => 
        d.status === 'Busy' || 
        d.status === 'Accepted' || 
        d.status === 'Assigned' ||
        d.status === 'Offline'
      ).length,
      total: drivers.length
    };
  }, [drivers]);

  const fetchData = useCallback(async () => {
    const { data: drv } = await supabase.from('drivers').select('*');
    const { data: bkg } = await supabase.from('bookings').select('*').neq('status', 'Completed');
    const { data: hosp } = await supabase.from('hospitals').select('*'); 
    if (drv) setDrivers(drv);
    if (bkg) setBookings(bkg);
    if (hosp) setHospitals(hosp);
  }, []);

  const playDispatchSound = useCallback(() => {
    const audio = new Audio('https://assets.mixkit.co/active_storage/sfx/2568/2568-preview.mp3'); 
    audio.volume = 0.4;
    audio.play().catch(e => console.log("Audio interaction required."));
  }, []);

  useEffect(() => {
    fetchData();
    const channel = supabase
      .channel('live-updates')
      .on(
        'postgres_changes', 
        { event: '*', schema: 'public', table: 'bookings' }, 
        (payload) => {
          if (payload.eventType === 'INSERT') {
            playDispatchSound();
            setNotifications(prev => [
              { id: payload.new.id, type: 'emergency', msg: `DISPATCH: ${payload.new.patient_name}`, time: 'Just now' }, 
              ...prev
            ]);
          }
          fetchData();
        }
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'drivers' }, 
        () => fetchData()
      )
      .subscribe();

    return () => supabase.removeChannel(channel);
  }, [fetchData, playDispatchSound]);

  const calculateETA = useCallback((driver, booking) => {
    if (!window.google || !driver || !booking) return;
    const service = new window.google.maps.DistanceMatrixService();
    service.getDistanceMatrix({
        origins: [{ lat: driver.current_lat, lng: driver.current_lng }],
        destinations: [{ lat: booking.latitude, lng: booking.longitude }],
        travelMode: window.google.maps.TravelMode.DRIVING,
    }, (response, status) => {
        if (status === "OK") {
            const element = response.rows[0].elements[0];
            if (element.status === "OK") {
                setDrivers(prev => prev.map(d => 
                    d.id === driver.id ? { ...d, live_eta: `${element.distance.text} (${element.duration.text})` } : d
                ));
            }
        }
    });
  }, [setDrivers]);

  useEffect(() => {
    if (expandedUnit) {
      const driver = drivers.find(d => d.id === expandedUnit);
      const activeTrip = bookings.find(b => 
        b.driver_id === expandedUnit && 
        (b.status === 'Accepted' || b.status === 'Assigned' || b.status === 'Pending')
      );
      if (driver && activeTrip) {
        calculateETA(driver, activeTrip);
      }
    }
  }, [expandedUnit, bookings, calculateETA, drivers]);

  const filteredData = useMemo(() => {
    const list = view === 'fleet' ? drivers : hospitals;
    return list.filter(item => item.name.toLowerCase().includes(searchTerm.toLowerCase()));
  }, [drivers, hospitals, searchTerm, view]);

  const handleUnitClick = (driver) => {
    setExpandedUnit(expandedUnit === driver.id ? null : driver.id);
    setMapFocus({ lat: driver.current_lat, lng: driver.current_lng, timestamp: Date.now() });
  };

  if (!isLoaded) return <div className="loading-screen"><h2>INITIALIZING...</h2></div>;

  return (
    <div className="app-shell">
      <div className="map-background">
        <MapComponent previewLocation={selectedLocation} mapFocus={mapFocus} showHospitals={view === 'hospitals'} showTraffic={trafficEnabled} />
        <button className={`map-overlay-control ${trafficEnabled ? 'active' : ''}`} onClick={() => setTrafficEnabled(!trafficEnabled)}>🚦</button>
      </div>
      
      <div className="ui-container">
        <div className="banner-anchor">
          <header className="main-banner">
            <div className="banner-left">
              <span>📍</span>
              <h2 className="banner-title">Fleet Management</h2>
            </div>
            <div className="banner-right">
              <div className="notification-container">
                <div className={`notification-wrapper ${showNotifications ? 'active' : ''}`} onClick={() => setShowNotifications(!showNotifications)}>
                  <span className="nav-icon">🔔</span>
                  {notifications.length > 0 && <span className="notification-dot pulse"></span>}
                </div>
                {showNotifications && (
                  <div className="notification-dropdown">
                    <header className="noti-header">
                      <span>Live Alerts</span>
                      <button onClick={() => setNotifications([])}>Clear all</button>
                    </header>
                    <div className="noti-list">
                      {notifications.map(n => (
                        <div key={n.id} className="noti-item">
                           <div className={`noti-indicator ${n.type}`}></div>
                           <div className="noti-content"><p>{n.msg}</p><span>{n.time}</span></div>
                        </div>
                      ))}
                      {notifications.length === 0 && <div className="noti-empty">No alerts</div>}
                    </div>
                  </div>
                )}
              </div>
              <button className="status-pill">System Online</button>
              <div className="profile-group"><div className="avatar-circle">OS</div></div>
            </div>
          </header>
        </div>

        <div className="workspace-content">
          <nav className="side-nav">
             <div className="nav-top-group">
                <div className={`nav-link ${view === 'fleet' ? 'active' : ''}`} onClick={() => setView('fleet')}>📊</div>
                <div className={`nav-link ${view === 'hospitals' ? 'active' : ''}`} onClick={() => setView('hospitals')}>🏥</div>
             </div>
             <div className="nav-bottom-group"><div className="nav-link">⚙️</div></div>
          </nav>

          <main className="hud-panel">
            <header className="hud-header">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px' }}>
                  <h1 className="hud-title">{view === 'fleet' ? 'Active Vehicles' : 'Facilities'}</h1>
                  {view === 'fleet' && (
                    <span style={{ fontSize: '0.85rem', fontWeight: '700', color: '#64748b' }}>
                      (<span style={{ color: '#10b981' }}>{vehicleStats.available}</span>/<span style={{ color: '#f59e0b' }}>{vehicleStats.busy}</span>/{vehicleStats.total})
                    </span>
                  )}
                </div>
                <button className="add-driver-btn-mini" onClick={() => setShowAddDriverModal(true)}>＋</button>
              </div>
              <div className="search-wrapper">
                <input type="text" placeholder="Enter Value" className="hud-search" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
              </div>
            </header>
            
            <div className="hud-scroll-hide">
              <div className="fleet-list-container">
                {view === 'fleet' ? (
                  filteredData.map(driver => {
                    const isExpanded = expandedUnit === driver.id;
                    const activeTrip = bookings.find(b => 
                      b.driver_id === driver.id && 
                      (b.status === 'Assigned' || b.status === 'Accepted' || b.status === 'Pending')
                    );
                    return (
                      <div key={driver.id} className="unit-card-new" onClick={() => handleUnitClick(driver)}>
                        <div className="card-main-content">
                          {/* 🟢 Status Dot: Green for Available, Orange for Busy/Accepted */}
                          <div className={`status-dot ${driver.status === 'Available' ? 'available' : (driver.status === 'Busy' || activeTrip ? 'busy' : 'offline')}`}></div>
                          <div className="unit-icon-bg">🚑</div>
                          <div className="unit-content">
                            <span className="unit-name-text">{driver.name}</span>
                            <div className="unit-sub-text">26, Mar, 26 / 1h 12min</div>
                          </div>
                          <button className={`trip-btn-ref ${activeTrip ? 'active-trip' : ''}`}>
                            {activeTrip ? 'Active ↗' : 'Trip ↗'}
                          </button>
                        </div>
                        {isExpanded && (
                          <div className="expanded-details" style={{ padding: '14px 0 10px 52px' }}>
                            <div className="timeline-item">
                              <div className="node green"></div>
                              <div className="timeline-info">
                                <strong>Base Station</strong>
                                <span>Mar 26, 4:00 PM</span>
                              </div>
                            </div>
                            {activeTrip && activeTrip.status !== 'Pending' ? (
                              <div className="timeline-item">
                                {/* 🟢 Node Color: Orange to match 'Busy' design */}
                                <div className="node busy"></div>
                                <div className="timeline-info">
                                  <strong>Incident Scene</strong>
                                  <span className={driver.live_eta ? "live-eta" : ""}>
                                    {driver.live_eta || "Calculating..."}
                                  </span>
                                </div>
                              </div>
                            ) : (
                              <div className="timeline-item">
                                <div className="node green"></div>
                                <div className="timeline-info">
                                  <strong>Ready</strong>
                                  <span>Standby</span>
                                </div>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })
                ) : (
                  filteredData.map(h => (
                    <div key={h.id} className="unit-card-new facility-card">
                      <div className="card-main-content">
                        <div className={`status-dot ${h.beds > 0 ? 'available' : 'busy'}`}></div>
                        <div className="unit-icon-bg">🏥</div>
                        <div className="unit-content">
                          <span className="unit-name-text">{h.name}</span>
                          <div className="unit-sub-text">• {h.specialty} {h.type || ""}</div>
                        </div>
                        <div className={`status-pill ${h.beds > 0 ? 'available' : 'full'}`}>{h.beds} Beds</div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </main>
        </div>
        <button className="fab-dispatch" onClick={() => setShowModal(true)}><span>🚑</span><span>New Dispatch</span></button>
      </div>

      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <header className="modal-header"><h3 className="modal-header-title">New Dispatch</h3><button className="close-btn-modern" onClick={() => setShowModal(false)}>&times;</button></header>
            <CreateBooking drivers={drivers} onLocationSelected={setSelectedLocation} onBookingCreated={() => { setShowModal(false); fetchData(); }} />
          </div>
        </div>
      )}

      {showAddDriverModal && (
        <div className="modal-overlay" onClick={() => setShowAddDriverModal(false)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <header className="modal-header">
              <h3 className="modal-header-title">➕ Register Unit</h3>
              <button className="close-btn-modern" onClick={() => setShowAddDriverModal(false)}>&times;</button>
            </header>
            <AddDriver onComplete={() => { setShowAddDriverModal(false); fetchData(); }} />
          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;