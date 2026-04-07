import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import './Dashboard1.css';
import '../App.css';
import FacilityMapView from './FacilityMapView';

const SideIcon = ({ path, active = false, viewBox = '0 0 24 24' }) => (
  <svg width="18" height="18" viewBox={viewBox} fill="none" xmlns="http://www.w3.org/2000/svg" style={{ display: 'block' }} aria-hidden="true">
    <path d={path} stroke={active ? '#60A5FA' : '#F8FAFC'} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const HeaderLocationIcon = () => (
  <svg width="19" height="19" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
    <path d="M12 21s6-5.4 6-10a6 6 0 1 0-12 0c0 4.6 6 10 6 10z" stroke="#F8FAFC" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M12 13.5A2.5 2.5 0 1 0 12 8.5A2.5 2.5 0 1 0 12 13.5z" stroke="#F8FAFC" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const toKm = (lat1, lng1, lat2, lng2) => {
  const toRad = (d) => (d * Math.PI) / 180;
  const R = 6371;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) * Math.sin(dLng / 2);
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
};

const FacilityPortal = () => {
  const navigate = useNavigate();
  const [view, setView] = useState('register');
  const [hospitals, setHospitals] = useState([]);
  const [drivers, setDrivers] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [selectedFacilityId, setSelectedFacilityId] = useState('');
  const [bedsInput, setBedsInput] = useState('');
  const [saving, setSaving] = useState(false);
  const [registering, setRegistering] = useState(false);
  const [registerForm, setRegisterForm] = useState({ name: '', specialty: '', beds: '0' });
  const [toast, setToast] = useState(null);
  const toastTimerRef = useRef(null);

  const fetchAll = useCallback(async () => {
    const { data: authData } = await supabase.auth.getUser();
    if (!authData?.user) {
      navigate('/');
      return;
    }

    const { data: hosp } = await supabase.from('hospitals').select('*').order('name', { ascending: true });
    const { data: drv } = await supabase.from('drivers').select('id,name,current_lat,current_lng');
    const { data: bkg } = await supabase.from('bookings').select('*').in('status', ['Assigned', 'Accepted', 'En Route', 'Picked Up']);

    if (hosp) {
      setHospitals(hosp);
      if (!selectedFacilityId && hosp.length > 0) {
        setSelectedFacilityId(hosp[0].id);
        setBedsInput(String(hosp[0].beds ?? 0));
      }
    }
    if (drv) setDrivers(drv);
    if (bkg) setBookings(bkg);
  }, [navigate, selectedFacilityId]);

  useEffect(() => {
    fetchAll();
    const channel = supabase
      .channel('facility-live')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'hospitals' }, fetchAll)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'bookings' }, fetchAll)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'drivers' }, fetchAll)
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchAll]);

  const showToast = (type, text) => {
    setToast({ type, text });
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    toastTimerRef.current = setTimeout(() => setToast(null), 4000);
  };

  const selectedFacility = useMemo(
    () => hospitals.find((h) => String(h.id) === String(selectedFacilityId)),
    [hospitals, selectedFacilityId]
  );

  const inboundMissions = useMemo(() => {
    if (!selectedFacility) return [];
    const fLat = selectedFacility.latitude ?? selectedFacility.lat;
    const fLng = selectedFacility.longitude ?? selectedFacility.lng;
    const useFacilityDest =
      fLat != null && fLng != null && Number.isFinite(Number(fLat)) && Number.isFinite(Number(fLng));

    return bookings
      .filter((b) => String(b.destination_facility) === String(selectedFacility.id))
      .map((b) => {
        const driver = drivers.find((d) => d.id === b.driver_id);
        const destLat = useFacilityDest ? Number(fLat) : Number(b.latitude);
        const destLng = useFacilityDest ? Number(fLng) : Number(b.longitude);
        let eta = 'unavailable';
        if (
          driver?.current_lat != null &&
          driver?.current_lng != null &&
          Number.isFinite(destLat) &&
          Number.isFinite(destLng)
        ) {
          const km = toKm(Number(driver.current_lat), Number(driver.current_lng), destLat, destLng);
          eta = `${Math.max(1, Math.round((km / 45) * 60))} min`;
        }
        return {
          id: b.id,
          patientName: b.patient_name || 'Unknown patient',
          status: b.status || 'Unknown',
          eta,
          driverName: driver?.name || 'Ambulance unit',
        };
      });
  }, [bookings, drivers, selectedFacility]);

  const stats = useMemo(
    () => ({
      totalFacilities: hospitals.length,
      availableFacilities: hospitals.filter((h) => Number(h.beds || 0) > 0).length,
      incomingCount: inboundMissions.length,
    }),
    [hospitals, inboundMissions.length]
  );

  const facilityMapData = useMemo(() => {
    if (!selectedFacility) return { facilityPos: null, routes: [] };
    const lat = selectedFacility.latitude ?? selectedFacility.lat;
    const lng = selectedFacility.longitude ?? selectedFacility.lng;
    const facilityPos =
      lat != null &&
      lng != null &&
      Number.isFinite(Number(lat)) &&
      Number.isFinite(Number(lng))
        ? { lat: Number(lat), lng: Number(lng) }
        : null;

    const routes = bookings
      .filter((b) => String(b.destination_facility) === String(selectedFacility.id))
      .map((b) => {
        const driver = drivers.find((d) => d.id === b.driver_id);
        const destLat = facilityPos ? facilityPos.lat : Number(b.latitude);
        const destLng = facilityPos ? facilityPos.lng : Number(b.longitude);
        if (!Number.isFinite(destLat) || !Number.isFinite(destLng)) return null;
        const origin =
          driver?.current_lat != null && driver?.current_lng != null
            ? { lat: Number(driver.current_lat), lng: Number(driver.current_lng) }
            : null;
        return {
          id: b.id,
          title: `${b.patient_name || 'Patient'} · ${driver?.name || 'Ambulance'}`,
          origin,
          dest: { lat: destLat, lng: destLng },
        };
      })
      .filter(Boolean);

    return { facilityPos, routes };
  }, [bookings, drivers, selectedFacility]);

  const handleFacilityChange = (e) => {
    const id = e.target.value;
    setSelectedFacilityId(id);
    const found = hospitals.find((h) => String(h.id) === String(id));
    setBedsInput(String(found?.beds ?? 0));
  };

  const saveBeds = async (e) => {
    e.preventDefault();
    const beds = Number(bedsInput);
    if (!Number.isFinite(beds) || beds < 0) return showToast('error', 'Beds must be 0 or more.');
    setSaving(true);
    const { error } = await supabase.from('hospitals').update({ beds }).eq('id', selectedFacilityId);
    setSaving(false);
    if (error) return showToast('error', error.message);
    await fetchAll();
    showToast('success', 'Saved.');
  };

  const registerFacility = async (e) => {
    e.preventDefault();
    const name = registerForm.name.trim();
    const specialty = registerForm.specialty.trim();
    const beds = Number(registerForm.beds);

    if (!name) return showToast('error', 'Enter a facility name.');
    if (!Number.isFinite(beds) || beds < 0) return showToast('error', 'Beds must be 0 or more.');
    if (hospitals.some((h) => String(h.name || '').trim().toLowerCase() === name.toLowerCase())) {
      return showToast('error', 'That name is already used.');
    }

    setRegistering(true);
    const { data, error } = await supabase
      .from('hospitals')
      .insert({ name, specialty: specialty || 'General', beds })
      .select('id')
      .single();
    setRegistering(false);

    if (error) return showToast('error', error.message);
    setRegisterForm({ name: '', specialty: '', beds: '0' });
    await fetchAll();
    if (data?.id) {
      setSelectedFacilityId(String(data.id));
      setBedsInput(String(beds));
    }
    showToast('success', 'Registered.');
  };

  const logout = async () => {
    await supabase.auth.signOut();
    navigate('/');
  };

  return (
    <div className="app-shell facility-shell-v2">
      <div className="ui-container facility-ui-v2">
        <div className="banner-anchor">
          <header className="main-banner">
            <div className="banner-left">
              <span className="brand-mark"><HeaderLocationIcon /></span>
              <h2 className="banner-title">Facility Portal</h2>
            </div>
            <div className="banner-right">
              <button className="status-pill">System Online</button>
              <div className="profile-group"><div className="avatar-circle">FP</div></div>
              <button className="auth-submit facility-logout-btn" onClick={logout}>Sign Out</button>
            </div>
          </header>
        </div>

        <div className="workspace-content">
          <nav className="side-nav">
            <div className="nav-top-group">
              <div className={`nav-link ${view === 'register' ? 'active' : ''}`} onClick={() => setView('register')} title="Register">
                <SideIcon active={view === 'register'} path="M8 4v16M16 4v16M4 8h16M4 14h16M4 4h16v16H4z" />
              </div>
              <div className={`nav-link ${view === 'availability' ? 'active' : ''}`} onClick={() => setView('availability')} title="Availability">
                <SideIcon active={view === 'availability'} path="M12 6v12M7 11h10M5 5h14v14H5z" />
              </div>
              <div className={`nav-link ${view === 'incoming' ? 'active' : ''}`} onClick={() => setView('incoming')} title="Incoming">
                <SideIcon active={view === 'incoming'} path="M3 11.5h18M6.5 15.5h11M8 19h8M7 11.5V7a2 2 0 0 1 2-2h6a2 2 0 0 1 2 2v4.5" />
              </div>
              <div className={`nav-link ${view === 'map' ? 'active' : ''}`} onClick={() => setView('map')} title="Map">
                <SideIcon active={view === 'map'} path="M12 21s6-5.4 6-10a6 6 0 1 0-12 0c0 4.6 6 10 6 10z" />
              </div>
              <div className={`nav-link ${view === 'facilities' ? 'active' : ''}`} onClick={() => setView('facilities')} title="Facilities">
                <SideIcon active={view === 'facilities'} path="M4 6h16M4 12h16M4 18h16" />
              </div>
            </div>
            <div className="nav-bottom-group">
              <div className="nav-link" title="Sign Out" onClick={logout}>
                <SideIcon path="M9 7l-5 5 5 5M4 12h12M15 5h5v14h-5" />
              </div>
            </div>
          </nav>

          <main className="facility-content-panel">
            {toast && (
              <div className={`facility-toast facility-toast-${toast.type}`} role="status">
                {toast.text}
              </div>
            )}
            <div className="facility-stats facility-stats-compact">
              <div className="facility-stat-card">
                <span className="facility-stat-label">Facilities</span>
                <strong className="facility-stat-value">{stats.totalFacilities}</strong>
              </div>
              <div className="facility-stat-card">
                <span className="facility-stat-label">Open</span>
                <strong className="facility-stat-value success">{stats.availableFacilities}</strong>
              </div>
              <div className="facility-stat-card">
                <span className="facility-stat-label">Incoming</span>
                <strong className="facility-stat-value">{stats.incomingCount}</strong>
              </div>
            </div>

            {view === 'register' && (
              <section className="facility-card facility-card-form">
                <h2>Register Facility</h2>
                <p className="facility-section-subtitle">Name, specialty, and bed count</p>
                <form onSubmit={registerFacility} className="auth-form">
                  <div className="auth-field">
                    <label>Name</label>
                    <input className="auth-input" type="text" value={registerForm.name} onChange={(e) => setRegisterForm((p) => ({ ...p, name: e.target.value }))} required />
                  </div>
                  <div className="auth-field">
                    <label>Specialty</label>
                    <input className="auth-input" type="text" value={registerForm.specialty} onChange={(e) => setRegisterForm((p) => ({ ...p, specialty: e.target.value }))} placeholder="e.g. General" />
                  </div>
                  <div className="auth-field">
                    <label>Available beds</label>
                    <input className="auth-input" type="number" min="0" value={registerForm.beds} onChange={(e) => setRegisterForm((p) => ({ ...p, beds: e.target.value }))} required />
                  </div>
                  <button type="submit" className="auth-submit" disabled={registering}>{registering ? 'Saving...' : 'Add facility'}</button>
                </form>
              </section>
            )}

            {view === 'availability' && (
              <section className="facility-card facility-card-form">
                <h2>Update beds</h2>
                <p className="facility-section-subtitle">Pick a facility and set free beds</p>
                <form onSubmit={saveBeds} className="auth-form">
                  <div className="auth-field">
                    <label>Facility</label>
                    <select className="auth-input" value={selectedFacilityId} onChange={handleFacilityChange} required>
                      {hospitals.map((h) => <option key={h.id} value={h.id}>{h.name}</option>)}
                    </select>
                  </div>
                  <div className="auth-field">
                    <label>Beds available</label>
                    <input className="auth-input" type="number" min="0" value={bedsInput} onChange={(e) => setBedsInput(e.target.value)} required />
                  </div>
                  <button type="submit" className="auth-submit" disabled={saving}>{saving ? 'Saving...' : 'Save'}</button>
                </form>
              </section>
            )}

            {view === 'map' && (
              <section className="facility-card facility-card-list facility-map-section">
                <h2>Map</h2>
                <p className="facility-section-subtitle">Inbound ambulances for the facility you pick</p>
                {hospitals.length > 0 && (
                  <div className="facility-map-facility-row">
                    <label htmlFor="facility-map-select">Facility</label>
                    <select
                      id="facility-map-select"
                      className="auth-input"
                      value={selectedFacilityId}
                      onChange={handleFacilityChange}
                    >
                      {hospitals.map((h) => (
                        <option key={h.id} value={h.id}>{h.name}</option>
                      ))}
                    </select>
                  </div>
                )}
                {!facilityMapData.facilityPos && facilityMapData.routes.length === 0 && (
                  <p className="facility-muted">Nothing to show yet (needs coordinates on the hospital or on active trips).</p>
                )}
                {(facilityMapData.facilityPos || facilityMapData.routes.length > 0) && (
                  <div className="facility-map-shell">
                    <FacilityMapView
                      facilityPos={facilityMapData.facilityPos}
                      routes={facilityMapData.routes}
                      facilityName={selectedFacility?.name}
                    />
                  </div>
                )}
              </section>
            )}

            {view === 'incoming' && (
              <section className="facility-card facility-card-list">
                <h2>Incoming</h2>
                <p className="facility-section-subtitle">{inboundMissions.length} trip{inboundMissions.length === 1 ? '' : 's'}</p>
                {hospitals.length > 0 && (
                  <div className="facility-map-facility-row facility-incoming-facility">
                    <label htmlFor="facility-incoming-select">Facility</label>
                    <select
                      id="facility-incoming-select"
                      className="auth-input"
                      value={selectedFacilityId}
                      onChange={handleFacilityChange}
                    >
                      {hospitals.map((h) => (
                        <option key={h.id} value={h.id}>{h.name}</option>
                      ))}
                    </select>
                  </div>
                )}
                {inboundMissions.length === 0 ? (
                  <p className="facility-muted">No inbound missions for this facility.</p>
                ) : (
                  <div className="facility-list">
                    {inboundMissions.map((m) => (
                      <div key={m.id} className="facility-mission-row">
                        <div>
                          <strong>{m.patientName}</strong>
                          <p>{m.driverName}</p>
                        </div>
                        <div className="facility-badges">
                          <span className="facility-pill">{m.status}</span>
                          <span className="facility-pill eta">ETA {m.eta}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </section>
            )}

            {view === 'facilities' && (
              <section className="facility-card facility-card-list">
                <h2>All facilities</h2>
                <p className="facility-section-subtitle">{hospitals.length} in the system</p>
                {hospitals.length === 0 ? (
                  <p className="facility-muted">No facilities yet.</p>
                ) : (
                  <div className="facility-list">
                    {hospitals.map((h) => {
                      const n = Number(h.beds || 0);
                      const open = n > 0;
                      return (
                        <div key={h.id} className="facility-mission-row">
                          <div>
                            <strong>{h.name}</strong>
                            <p>{h.specialty || 'General'}</p>
                          </div>
                          <div className="facility-badges">
                            <span className={`facility-pill ${open ? 'available' : 'full'}`}>{open ? 'Open' : 'Full'}</span>
                            <span className="facility-beds-inline">{n} beds</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </section>
            )}
          </main>
        </div>
      </div>
    </div>
  );
};

export default FacilityPortal;
