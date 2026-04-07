import React, { useState, useCallback, useEffect, useMemo } from 'react';
import { useJsApiLoader } from '@react-google-maps/api';
import { supabase, supabaseAdmin } from '../supabaseClient';
import MapComponent from './MapComponent';
import CreateBooking from './CreateBooking';
import './Dashboard1.css'; 

const libraries = ['places'];

const SideIcon = ({ path, active = false, viewBox = '0 0 24 24' }) => (
  <svg
    width="18"
    height="18"
    viewBox={viewBox}
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    style={{ display: 'block' }}
    aria-hidden="true"
  >
    <path
      d={path}
      stroke={active ? '#60A5FA' : '#F8FAFC'}
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

const HeaderLocationIcon = () => (
  <svg width="19" height="19" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
    <path d="M12 21s6-5.4 6-10a6 6 0 1 0-12 0c0 4.6 6 10 6 10z" stroke="#F8FAFC" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M12 13.5A2.5 2.5 0 1 0 12 8.5A2.5 2.5 0 1 0 12 13.5z" stroke="#F8FAFC" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const HeaderBellIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
    <path d="M15.5 17H8.5L9.2 15.8C9.7 14.9 10 13.8 10 12.8V10.8C10 9.1 11.3 7.8 13 7.8C14.7 7.8 16 9.1 16 10.8V12.8C16 13.8 16.3 14.9 16.8 15.8L17.5 17H15.5Z" stroke="#E2E8F0" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M11.7 19.3C11.9 19.7 12.4 20 13 20C13.6 20 14.1 19.7 14.3 19.3" stroke="#E2E8F0" strokeWidth="1.8" strokeLinecap="round" />
  </svg>
);

// --- 🟢 INTERNAL COMPONENT: VerificationQueue ---
const VerificationQueue = ({ onStatusChange }) => {
  const [pendingDrivers, setPendingDrivers] = useState([]);

  const openDocUrl = (url, label) => {
    const s = url != null && typeof url === 'string' ? url.trim() : '';
    if (!s) {
      window.alert(
        `No ${label} document URL in the database. Drivers added from the web admin have no uploads; register drivers in the mobile app (IC + license), or paste a Storage public URL manually in Supabase.`
      );
      return;
    }
    window.open(s, '_blank', 'noopener,noreferrer');
  };

  const fetchPending = useCallback(async () => {
    const { data } = await supabase.from('drivers').select('*').eq('status', 'Pending');
    if (data) setPendingDrivers(data);
  }, []);

  useEffect(() => {
    fetchPending();

    const channel = supabase
      .channel('verification-queue-drivers')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'drivers' },
        () => {
          fetchPending();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchPending]);

  const handleVerify = async (id, newStatus) => {
    try {
      if (newStatus === 'Rejected') {
        const confirmReject = window.confirm("Are you sure? This will delete the driver's login account and database record entirely.");
        if (!confirmReject) return;
  
        // 1. Delete from Supabase Auth using the Admin client
        // This is the critical part that removes the email from the 'Authentication' tab
        const { error: authError } = await supabaseAdmin.auth.admin.deleteUser(id);
        
        // If the user is already missing from Auth, we still want to clean up the DB
        if (authError && authError.message !== 'User not found') {
          throw authError;
        }
  
        // 2. Delete the record from the 'drivers' table
        const { error: dbError } = await supabase.from('drivers').delete().eq('id', id);
        if (dbError) throw dbError;
  
        alert("Driver rejected: Auth and Database records successfully deleted.");
      } else {
        // Standard approval logic: Update status to 'Offline'
        const { error } = await supabase
          .from('drivers')
          .update({ status: newStatus })
          .eq('id', id);
  
        if (error) throw error;
        alert(`Driver account has been approved.`);
      }
  
      // Refresh the UI lists
      fetchPending(); 
      if (onStatusChange) onStatusChange(); 
    } catch (err) {
      console.error("Technical Error during deletion:", err);
      alert("Action failed: " + err.message);
    }
  };

  return (
    <div className="fleet-list-container">
      {pendingDrivers.length === 0 ? (
        <p style={{ color: '#64748b', textAlign: 'center', marginTop: '20px' }}>No pending drivers to verify.</p>
      ) : (
        pendingDrivers.map(driver => (
          <div key={driver.id} className="unit-card-new" style={{ cursor: 'default' }}>
            <div className="card-main-content" style={{ flexDirection: 'column', alignItems: 'flex-start' }}>
              <strong className="unit-name-text">{driver.name}</strong>
              <span className="unit-sub-text">IC: {driver.ic_number}</span>
              
              {/* Document Review Section */}
              <div style={{ display: 'flex', gap: '8px', margin: '12px 0' }}>
                <button 
                  onClick={() => openDocUrl(driver.ic_front_url, 'MyKad')}
                  className="trip-btn-ref active-trip"
                >View MyKad ↗</button>
                <button 
                  onClick={() => openDocUrl(driver.license_front_url, 'license')}
                  className="trip-btn-ref active-trip"
                >View License ↗</button>
              </div>

              {/* Action Buttons */}
              <div style={{ display: 'flex', gap: '10px', width: '100%' }}>
                <button 
                  onClick={() => handleVerify(driver.id, 'Offline')}
                  className="status-pill available" style={{ cursor: 'pointer', flex: 1, textAlign: 'center' }}
                >APPROVE</button>
                <button 
                  onClick={() => handleVerify(driver.id, 'Rejected')}
                  className="status-pill full" style={{ cursor: 'pointer', flex: 1, textAlign: 'center' }}
                >REJECT</button>
              </div>
            </div>
          </div>
        ))
      )}
    </div>
  );
};

// --- 🔵 MAIN COMPONENT: Dashboard ---
const Dashboard = () => {
  const [drivers, setDrivers] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [hospitals, setHospitals] = useState([]); 
  const [view, setView] = useState('fleet'); 
  const [showModal, setShowModal] = useState(false);
  
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

  const vehicleStats = useMemo(() => {
    return {
      available: drivers.filter(d => d.status === 'Available').length,
      busy: drivers.filter(d => 
        d.status === 'Busy' || 
        d.status === 'Accepted' || 
        d.status === 'Assigned' ||
        d.status === 'Picked Up' ||
        d.status === 'Offline'
      ).length,
      total: drivers.length
    };
  }, [drivers]);

  const facilityStats = useMemo(() => {
    return {
      available: hospitals.filter(h => h.beds > 0).length,
      total: hospitals.length
    };
  }, [hospitals]);

  const fetchData = useCallback(async () => {
    // 🟢 UPDATED: Exclude 'Pending' and 'Rejected' drivers from the active fleet list
    const { data: drv } = await supabase
      .from('drivers')
      .select('*')
      .neq('status', 'Pending')
      .neq('status', 'Rejected');

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
    const channel = supabase.channel('live-updates')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'bookings' }, (payload) => {
          if (payload.eventType === 'INSERT') {
            playDispatchSound();
            setNotifications(prev => [{ id: payload.new.id, type: 'emergency', msg: `DISPATCH: ${payload.new.patient_name}`, time: 'Just now' }, ...prev]);
          }
          fetchData();
      })
      // Keep fleet state instant without full refetch on each toggle.
      .on('postgres_changes', { event: '*', schema: 'public', table: 'drivers' }, (payload) => {
        const isVisibleDriver = (d) => d && d.status !== 'Pending' && d.status !== 'Rejected';

        if (payload.eventType === 'DELETE') {
          setDrivers(prev => prev.filter(d => d.id !== payload.old.id));
          return;
        }

        const updatedDriver = payload.new;
        if (!updatedDriver || !updatedDriver.id) {
          fetchData();
          return;
        }

        setDrivers(prev => {
          const exists = prev.some(d => d.id === updatedDriver.id);
          if (!isVisibleDriver(updatedDriver)) {
            return prev.filter(d => d.id !== updatedDriver.id);
          }
          if (exists) {
            return prev.map(d => (d.id === updatedDriver.id ? { ...d, ...updatedDriver } : d));
          }
          return [updatedDriver, ...prev];
        });
      })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'bookings' }, () => fetchData())
      .subscribe();

    const onWindowFocus = () => fetchData();
    window.addEventListener('focus', onWindowFocus);
    return () => {
      window.removeEventListener('focus', onWindowFocus);
      supabase.removeChannel(channel);
    };
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
                setDrivers(prev => prev.map(d => d.id === driver.id ? { ...d, live_eta: `${element.distance.text} (${element.duration.text})` } : d));
            }
        }
    });
  }, [setDrivers]);

  useEffect(() => {
    if (expandedUnit) {
      const driver = drivers.find(d => d.id === expandedUnit);
      const activeTrip = bookings.find(
        b =>
          b.driver_id === expandedUnit &&
          (b.status === 'Accepted' ||
            b.status === 'Assigned' ||
            b.status === 'Pending' ||
            b.status === 'En Route' ||
            b.status === 'Picked Up')
      );
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
        <MapComponent previewLocation={selectedLocation} mapFocus={mapFocus} showHospitals={view === 'hospitals'} showTraffic={trafficEnabled} />
        <button className={`map-overlay-control ${trafficEnabled ? 'active' : ''}`} onClick={() => setTrafficEnabled(!trafficEnabled)}>🚦</button>
      </div>
      
      <div className="ui-container">
        <div className="banner-anchor">
          <header className="main-banner">
            <div className="banner-left">
              <span className="brand-mark"><HeaderLocationIcon /></span>
              <h2 className="banner-title">Fleet Management</h2>
            </div>
            <div className="banner-right">
              <div className="notification-container">
                <div className={`notification-wrapper ${showNotifications ? 'active' : ''}`} onClick={() => setShowNotifications(!showNotifications)}>
                  <span className="nav-icon"><HeaderBellIcon /></span>
                  {notifications.length > 0 && <span className="notification-dot pulse"></span>}
                </div>
                {showNotifications && (
                  <div className="notification-dropdown">
                    <header className="noti-header"><span>Live Alerts</span><button onClick={() => setNotifications([])}>Clear all</button></header>
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
                <div className={`nav-link ${view === 'fleet' ? 'active' : ''}`} onClick={() => setView('fleet')} title="Fleet">
                  <SideIcon
                    active={view === 'fleet'}
                    path="M3 11.5h18M6.5 15.5h11M8 19h8M7 11.5V7a2 2 0 0 1 2-2h6a2 2 0 0 1 2 2v4.5"
                  />
                </div>
                <div className="nav-link nav-dispatch" onClick={() => setShowModal(true)} title="New Dispatch">
                  <SideIcon active={false} path="M12 5v14M5 12h14" />
                </div>
                <div className={`nav-link ${view === 'hospitals' ? 'active' : ''}`} onClick={() => setView('hospitals')} title="Hospitals">
                  <SideIcon
                    active={view === 'hospitals'}
                    path="M8 4v16M16 4v16M4 8h16M4 14h16M4 4h16v16H4z"
                  />
                </div>
                <div className={`nav-link ${view === 'verify' ? 'active' : ''}`} onClick={() => setView('verify')} title="Verify Drivers">
                  <SideIcon
                    active={view === 'verify'}
                    path="M5 12l4 4 10-10M12 22C6.5 22 2 17.5 2 12S6.5 2 12 2s10 4.5 10 10-4.5 10-10 10z"
                  />
                </div>
             </div>
             <div className="nav-bottom-group">
               <div className="nav-link" title="Settings">
                 <SideIcon path="M12 8.5A3.5 3.5 0 1 0 12 15.5A3.5 3.5 0 1 0 12 8.5zM19 12a7.8 7.8 0 0 0-.1-1.2l2-1.6-2-3.4-2.4 1a7.9 7.9 0 0 0-2.1-1.2L14 3h-4l-.4 2.6a7.9 7.9 0 0 0-2.1 1.2l-2.4-1-2 3.4 2 1.6A7.8 7.8 0 0 0 5 12c0 .4 0 .8.1 1.2l-2 1.6 2 3.4 2.4-1c.6.5 1.3.9 2.1 1.2L10 21h4l.4-2.6c.8-.3 1.5-.7 2.1-1.2l2.4 1 2-3.4-2-1.6c.1-.4.1-.8.1-1.2z" />
               </div>
             </div>
          </nav>

          <main className="hud-panel">
            <header className="hud-header">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px' }}>
                  <h1 className="hud-title">
                    {view === 'fleet' ? 'Active Vehicles' : view === 'hospitals' ? 'Facilities' : 'Verify Drivers'}
                  </h1>
                  {view === 'fleet' && (
                    <span style={{ fontSize: '0.85rem', fontWeight: '700', color: '#64748b' }}>
                      (<span style={{ color: '#10b981' }}>{vehicleStats.available}</span>/<span style={{ color: '#f59e0b' }}>{vehicleStats.busy}</span>/{vehicleStats.total})
                    </span>
                  )}
                  {view === 'hospitals' && (
                    <span style={{ fontSize: '0.85rem', fontWeight: '700', color: '#64748b' }}>
                      (<span style={{ color: '#10b981' }}>{facilityStats.available}</span>/{facilityStats.total})
                    </span>
                  )}
                </div>
              </div>
              <div className="search-wrapper">
                <input type="text" placeholder="Search..." className="hud-search" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
              </div>
            </header>
            
            <div className="hud-scroll-hide">
              {/* 🟢 CONDITIONAL VIEW LOGIC */}
              {view === 'verify' ? (
                <VerificationQueue onStatusChange={fetchData} />
              ) : view === 'fleet' ? (
                <div className="fleet-list-container">
                  {filteredData.map(driver => {
                    const isExpanded = expandedUnit === driver.id;
                    const activeTrip = bookings.find(b => 
                      b.driver_id === driver.id && 
                      ['Pending', 'Assigned', 'Accepted', 'En Route', 'Picked Up'].includes(b.status)
                    );

                    return (
                      <div key={driver.id} className="unit-card-new" onClick={() => handleUnitClick(driver)}>
                        <div className="card-main-content">
                          <div className={`status-dot ${
                            driver.status === 'Offline' ? 'offline' : 
                            (activeTrip ? 'busy' : 'available')
                          }`}></div>
                          
                          <div className="unit-icon-bg">🚑</div>
                          <div className="unit-content">
                            <span className="unit-name-text">{driver.name}</span>
                            <div className="unit-sub-text">Active Ops / Standby</div>
                          </div>
                          <button className={`trip-btn-ref ${activeTrip ? 'active-trip' : ''}`}>
                            {activeTrip ? 'Active ↗' : 'Trip ↗'}
                          </button>
                        </div>

                        {isExpanded && (
                          <div className="expanded-details" style={{ padding: '14px 0 10px 52px' }}>
                            {driver.status === 'Offline' ? (
                              <div className="timeline-item">
                                <div className="node offline"></div>
                                <div className="timeline-info">
                                  <strong style={{ color: '#94a3b8' }}>Disconnected</strong>
                                  <span>Unit is currently Off Duty</span>
                                </div>
                              </div>
                            ) : (
                              <>
                                <div className="timeline-item">
                                  <div className="node green"></div>
                                  <div className="timeline-info">
                                    <strong>Status: {driver.status}</strong>
                                    <span>Last GPS update received</span>
                                  </div>
                                </div>
                                {activeTrip && (
                                  <div className="timeline-item">
                                    <div className="node busy"></div>
                                    <div className="timeline-info">
                                      <strong>Mission: {activeTrip.patient_name}</strong>
                                      <span>ETA: {driver.live_eta || "Calculating..."}</span>
                                    </div>
                                  </div>
                                )}
                              </>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="fleet-list-container">
                  {filteredData.map(h => (
                    <div key={h.id} className="unit-card-new facility-card">
                      <div className="card-main-content">
                        <div className={`status-dot ${h.beds > 0 ? 'available' : 'busy'}`}></div>
                        <div className="unit-icon-bg">🏥</div>
                        <div className="unit-content">
                          <span className="unit-name-text">{h.name}</span>
                          <div className="unit-sub-text">• {h.specialty}</div>
                        </div>
                        <div className={`status-pill ${h.beds > 0 ? 'available' : 'full'}`}>{h.beds} Beds</div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </main>
        </div>
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