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
  const [hospitals, setHospitals] = useState([]); 
  const [view, setView] = useState('fleet'); 
  const [showModal, setShowModal] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [selectedLocation, setSelectedLocation] = useState(null);
  const [mapFocus, setMapFocus] = useState(null);
  const [expandedUnit, setExpandedUnit] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [trafficEnabled, setTrafficEnabled] = useState(false);

  const [notifications, setNotifications] = useState([
    { id: 'init', type: 'status', msg: 'Fleet Systems Online', time: 'Now' }
  ]);

  const { isLoaded } = useJsApiLoader({
    googleMapsApiKey: "AIzaSyA4N7C2qiLgqaHsYWpxltHI4UvWyx1G-bo", 
    libraries,
  });

  // --- NEW: PRIORITY HELPER ---
  const getPriorityClass = (type) => {
    switch (type) {
      case 'Cardiac': return 'priority-critical';
      case 'Trauma': return 'priority-high';
      default: return 'priority-standard';
    }
  };

  // Floating Map Feature (Side Feature)
  const renderTrafficControl = () => (
    <button 
      className={`map-overlay-control ${trafficEnabled ? 'active' : ''}`} 
      onClick={() => setTrafficEnabled(!trafficEnabled)}
      title="Toggle Live Traffic"
    >
      🚦
    </button>
  );
  
  const playDispatchSound = () => {
    const audio = new Audio('https://assets.mixkit.co/active_storage/sfx/2568/2568-preview.mp3'); 
    audio.volume = 0.4;
    audio.play().catch(e => console.log("Audio waiting for user interaction."));
  };

  const getNearestHospital = useCallback((incidentLat, incidentLng) => {
    if (hospitals.length === 0) return null;
    return hospitals.reduce((prev, curr) => {
      const getDistance = (h) => Math.sqrt(Math.pow(h.latitude - incidentLat, 2) + Math.pow(h.longitude - incidentLng, 2));
      return getDistance(curr) < getDistance(prev) ? curr : prev;
    });
  }, [hospitals]);

  const calculateETA = useCallback((driver, booking) => {
    if (!window.google || !driver || !booking) return;
    const service = new window.google.maps.DistanceMatrixService();
    service.getDistanceMatrix(
      {
        origins: [{ lat: driver.current_lat, lng: driver.current_lng }],
        destinations: [{ lat: booking.latitude, lng: booking.longitude }],
        travelMode: window.google.maps.TravelMode.DRIVING,
      },
      (response, status) => {
        if (status === "OK") {
          const element = response.rows[0].elements[0];
          if (element.status === "OK") {
            setDrivers(prev => prev.map(d => 
              d.id === driver.id ? { ...d, live_eta: `${element.distance.text} (${element.duration.text})` } : d
            ));
          }
        }
      }
    );
  }, []);

  const handleHospitalDispatch = async (bookingId, hospital, driverId) => {
    const { error } = await supabase
      .from('bookings')
      .update({ 
        location: `Transferring to ${hospital.name}`,
        latitude: hospital.latitude, 
        longitude: hospital.longitude
      })
      .eq('id', bookingId);

    if (!error) {
      playDispatchSound();
      setNotifications(prev => [{ id: Date.now(), type: 'status', msg: `Unit ${driverId.slice(0,5)} rerouted to ${hospital.name}`, time: 'Just now' }, ...prev]);
      fetchData();
    }
  };

  const handleCompleteTrip = async (bookingId, driverId) => {
    const { error } = await supabase
      .from('bookings')
      .update({ 
        status: 'Completed',
        driver_id: null 
      })
      .eq('id', bookingId);

    if (!error) {
      setNotifications(prev => [{ id: Date.now(), type: 'status', msg: `Unit ${driverId.slice(0,5)} Mission Completed.`, time: 'Just now' }, ...prev]);
      setExpandedUnit(null); 
      fetchData();
    }
  };

  const fetchData = useCallback(async () => {
    const { data: drv } = await supabase.from('drivers').select('*');
    const { data: bkg } = await supabase.from('bookings').select('*').eq('status', 'Pending');
    const { data: hosp } = await supabase.from('hospitals').select('*'); 
    if (drv) setDrivers(drv);
    if (bkg) setBookings(bkg);
    if (hosp) setHospitals(hosp);
  }, []);

  useEffect(() => {
    fetchData();
    const channel = supabase.channel('live-updates').on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'bookings' }, (payload) => {
          playDispatchSound(); 
          setNotifications(prev => [{ id: payload.new.id, type: 'emergency', msg: `DISPATCH: ${payload.new.patient_name}`, time: 'Just now' }, ...prev]);
          fetchData();
      }).subscribe();
    return () => supabase.removeChannel(channel);
  }, [fetchData]);

  useEffect(() => {
    if (expandedUnit) {
      const driver = drivers.find(d => d.id === expandedUnit);
      const activeTrip = bookings.find(b => b.driver_id === expandedUnit);
      if (driver && activeTrip) calculateETA(driver, activeTrip);
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
        <MapComponent 
            previewLocation={selectedLocation} 
            mapFocus={mapFocus} 
            showHospitals={view === 'hospitals'} 
            showTraffic={trafficEnabled} 
        />
        {/* Traffic button now floats on the map */}
        {renderTrafficControl()}
      </div>
      <div className="ui-container">
        <div className="banner-anchor">
          <header className="main-banner">
            <div className="banner-left"><span>📍</span><h2 className="banner-title">Fleet Management</h2></div>
            <div className="banner-right">
              <div className="notification-container">
                <div className={`notification-wrapper ${showNotifications ? 'active' : ''}`} onClick={() => setShowNotifications(!showNotifications)}>
                  <span className="nav-icon">🔔</span>{notifications.length > 0 && <span className="notification-dot pulse"></span>}
                </div>
                {showNotifications && (
                  <div className="notification-dropdown">
                    <header className="noti-header"><span>Live Alerts</span><button onClick={() => setNotifications([])}>Clear all</button></header>
                    <div className="noti-list">
                      {notifications.map(n => (
                        <div key={n.id} className="noti-item"><div className={`noti-indicator ${n.type}`}></div><div className="noti-content"><p>{n.msg}</p><span>{n.time}</span></div></div>
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
                {/* <div className={`nav-link ${trafficEnabled ? 'active' : ''}`} onClick={() => setTrafficEnabled(!trafficEnabled)} style={{ marginTop: '10px' }}>🚦</div> */}
             </div>
             <div className="nav-bottom-group"><div className="nav-link">⚙️</div></div>
          </nav>

          <main className="hud-panel">
            <header className="hud-header">
              <h1 className="hud-title">{view === 'fleet' ? 'Active Vehicles' : 'Facilities'}</h1>
              <div className="search-wrapper">
                <input type="text" placeholder="Search..." className="hud-search" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
                {searchTerm && <button className="search-clear-btn" onClick={() => setSearchTerm("")}>×</button>}
              </div>
            </header>
            
            <div className="hud-scroll-hide">
               <div className="fleet-list-container">
                  {view === 'fleet' ? (
                    filteredData.map(driver => {
                        const isExpanded = expandedUnit === driver.id;
                        const activeTrip = bookings.find(b => b.driver_id === driver.id);
                        const recHosp = activeTrip ? getNearestHospital(activeTrip.latitude, activeTrip.longitude) : null;
                        
                        // NEW: Determine Class based on trip priority
                        const priorityClass = activeTrip ? getPriorityClass(activeTrip.emergency_type) : '';

                        return (
                          <div 
                            key={driver.id} 
                            className={`unit-card-new ${isExpanded ? 'expanded' : ''} ${priorityClass}`} 
                            onClick={() => handleUnitClick(driver)}
                          >
                            <div className="card-main-content">
                              <div className="unit-visual"><div className="unit-icon-bg">🚑</div></div>
                              <div className="unit-content"><span className="unit-name-text">{driver.name}</span><div className="unit-sub-text">Unit {driver.id.slice(0, 5)}</div></div>
                              <button className={`trip-btn-ref ${activeTrip ? 'active-trip' : ''}`}>{activeTrip ? "On Trip" : "Idle"} ▼</button>
                            </div>
                            {isExpanded && (
                              <div className="expanded-details">
                                {activeTrip && recHosp && (
                                  <div className="recommendation-badge">
                                    <span className="badge-icon">🏥</span>
                                    <div className="badge-text"><strong>Nearest Hospital</strong><span>{recHosp.name}</span></div>
                                    <button className="mini-dispatch-btn" onClick={(e) => { e.stopPropagation(); handleHospitalDispatch(activeTrip.id, recHosp, driver.id); }}>GO</button>
                                  </div>
                                )}
                                <div className="timeline-item"><div className="node green"></div><div className="timeline-info"><strong>Base Station</strong><span>Dispatched</span></div></div>
                                <div className="timeline-item"><div className="node red"></div><div className="timeline-info"><strong>{activeTrip ? activeTrip.location : "Ready"}</strong><span>{driver.live_eta || "Calculating..."}</span></div></div>
                                
                                {activeTrip && (
                                  <button className="complete-mission-btn" onClick={(e) => { e.stopPropagation(); handleCompleteTrip(activeTrip.id, driver.id); }}>
                                    ✅ Mark Mission Completed
                                  </button>
                                )}
                              </div>
                            )}
                          </div>
                        );
                      })
                  ) : (
                    filteredData.map(h => (
                        <div key={h.id} className="unit-card-new"><div className="card-main-content"><div className="unit-visual">🏥</div><div className="unit-content"><span className="unit-name-text">{h.name}</span><div className="unit-sub-text">{h.type}</div></div><div className="status-pill">{h.beds} Beds</div></div></div>
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
    </div>
  );
};

export default Dashboard;