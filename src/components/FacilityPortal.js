import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useJsApiLoader } from '@react-google-maps/api';
import { supabase } from '../supabaseClient';
import MapComponent from './MapComponent';
import AddDriver from './AddDriver';
import './Dashboard1.css';
import '../App.css';

const libraries = ['places'];

const AddDriverNavIcon = ({ active }) => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ display: 'block' }} aria-hidden>
    <path
      d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"
      stroke={active ? '#60A5FA' : '#F8FAFC'}
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path d="M12 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8z" stroke={active ? '#60A5FA' : '#F8FAFC'} strokeWidth="1.8" />
    <path d="M20 8v6M23 11h-6" stroke={active ? '#60A5FA' : '#F8FAFC'} strokeWidth="1.8" strokeLinecap="round" />
  </svg>
);

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
  const [view, setView] = useState('availability');
  const [hospitals, setHospitals] = useState([]);
  const [drivers, setDrivers] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [selectedFacilityId, setSelectedFacilityId] = useState('');
  const [bedsInput, setBedsInput] = useState('');
  const [latInput, setLatInput] = useState('');
  const [lngInput, setLngInput] = useState('');
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState(null);
  const [booting, setBooting] = useState(true);
  const [mapScopeId, setMapScopeId] = useState(null);
  const [mapFocus, setMapFocus] = useState(null);
  const [trafficEnabled, setTrafficEnabled] = useState(false);
  const initialPassRef = useRef(true);
  const toastTimerRef = useRef(null);

  const { isLoaded } = useJsApiLoader({
    googleMapsApiKey: 'AIzaSyA4N7C2qiLgqaHsYWpxltHI4UvWyx1G-bo',
    libraries,
  });

  const fetchAll = useCallback(async () => {
    await supabase.auth.refreshSession();
    const { data: authData } = await supabase.auth.getUser();
    const user = authData?.user;
    if (!user) {
      if (initialPassRef.current) setBooting(false);
      initialPassRef.current = false;
      navigate('/', { replace: true });
      return;
    }

    const access = user.app_metadata?.facility_access;
    const facilityHospitalId = user.app_metadata?.facility_hospital_id;

    if (access === 'approved' && facilityHospitalId) {
      setMapScopeId(String(facilityHospitalId));
    } else if (access === 'pending') {
      if (initialPassRef.current) setBooting(false);
      initialPassRef.current = false;
      await supabase.auth.signOut();
      navigate('/', { replace: true, state: { loginNotice: 'facility_pending' } });
      return;
    } else {
      const { data: pend } = await supabase
        .from('facility_registrations')
        .select('id')
        .eq('auth_user_id', user.id)
        .maybeSingle();
      if (pend) {
        if (initialPassRef.current) setBooting(false);
        initialPassRef.current = false;
        await supabase.auth.signOut();
        navigate('/', { replace: true, state: { loginNotice: 'facility_pending' } });
        return;
      }
      if (initialPassRef.current) setBooting(false);
      initialPassRef.current = false;
      await supabase.auth.signOut();
      navigate('/', { replace: true, state: { loginNotice: 'facility_unauthorized' } });
      return;
    }

    const { data: hospRow, error: hospErr } = await supabase
      .from('hospitals')
      .select('*')
      .eq('id', facilityHospitalId)
      .maybeSingle();

    if (hospErr) {
      console.error(hospErr);
      if (initialPassRef.current) {
        setBooting(false);
        initialPassRef.current = false;
      }
      return;
    }

    const hospList = hospRow ? [hospRow] : [];
    setHospitals(hospList);
    if (hospRow) {
      setSelectedFacilityId(String(hospRow.id));
      setBedsInput(String(hospRow.beds ?? 0));
      const la = hospRow.latitude ?? hospRow.lat;
      const lo = hospRow.longitude ?? hospRow.lng;
      setLatInput(la != null && la !== '' ? String(la) : '');
      setLngInput(lo != null && lo !== '' ? String(lo) : '');
    } else {
      setHospitals([]);
      setSelectedFacilityId('');
      setLatInput('');
      setLngInput('');
    }

    const { data: drv } = await supabase.from('drivers').select('id,name,current_lat,current_lng');
    const { data: bkg } = await supabase.from('bookings').select('*').in('status', ['Assigned', 'Accepted', 'En Route', 'Picked Up']);

    if (drv) setDrivers(drv);
    if (bkg) setBookings(bkg);

    if (initialPassRef.current) {
      setBooting(false);
      initialPassRef.current = false;
    }
  }, [navigate]);

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

  const selectedFacility = useMemo(
    () => hospitals.find((h) => String(h.id) === String(selectedFacilityId)),
    [hospitals, selectedFacilityId]
  );

  useEffect(() => {
    if (!selectedFacility) return;
    const lat = selectedFacility.latitude ?? selectedFacility.lat;
    const lng = selectedFacility.longitude ?? selectedFacility.lng;
    if (lat != null && lng != null && Number.isFinite(Number(lat)) && Number.isFinite(Number(lng))) {
      setMapFocus({ lat: Number(lat), lng: Number(lng), timestamp: Date.now() });
    }
  }, [selectedFacility]);

  const showToast = (type, text) => {
    setToast({ type, text });
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    toastTimerRef.current = setTimeout(() => setToast(null), 4000);
  };

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

  const saveBeds = async (e) => {
    e.preventDefault();
    const beds = Number(bedsInput);
    if (!Number.isFinite(beds) || beds < 0) return showToast('error', 'Beds must be 0 or more.');

    const laStr = String(latInput ?? '').trim();
    const loStr = String(lngInput ?? '').trim();
    if (Boolean(laStr) !== Boolean(loStr)) {
      return showToast('error', 'Enter both latitude and longitude.');
    }
    if (!laStr || !loStr) {
      return showToast('error', 'Latitude and longitude are required (set at registration or here).');
    }
    const latitude = Number(laStr);
    const longitude = Number(loStr);
    if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
      return showToast('error', 'Latitude and longitude must be valid numbers.');
    }
    if (latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180) {
      return showToast('error', 'Coordinates are out of range.');
    }

    setSaving(true);
    const { error } = await supabase
      .from('hospitals')
      .update({ beds, latitude, longitude })
      .eq('id', selectedFacilityId);
    setSaving(false);
    if (error) return showToast('error', error.message);
    await fetchAll();
    showToast('success', 'Saved.');
  };

  const logout = async () => {
    await supabase.auth.signOut();
    navigate('/');
  };

  const hudTitle =
    view === 'availability'
      ? 'Update beds'
      : view === 'incoming'
        ? 'Incoming'
        : view === 'map'
          ? 'Live map'
          : 'Add driver';

  if (booting || !isLoaded) {
    return (
      <div className="loading-screen">
        <h2>INITIALIZING...</h2>
      </div>
    );
  }

  return (
    <div className="app-shell facility-portal-map-shell">
      <div className="map-background">
        <MapComponent
          previewLocation={null}
          mapFocus={mapFocus}
          showHospitals
          showTraffic={trafficEnabled}
          facilityHospitalId={mapScopeId}
        />
        <button
          type="button"
          className={`map-overlay-control ${trafficEnabled ? 'active' : ''}`}
          onClick={() => setTrafficEnabled(!trafficEnabled)}
          aria-pressed={trafficEnabled}
        >
          🚦
        </button>
      </div>

      <div className="ui-container">
        {toast && (
          <div
            className={`facility-toast facility-toast-${toast.type}`}
            style={{
              position: 'fixed',
              top: 88,
              left: '50%',
              transform: 'translateX(-50%)',
              zIndex: 500,
              margin: 0,
              boxShadow: '0 8px 24px rgba(0,0,0,0.12)',
            }}
            role="status"
          >
            {toast.text}
          </div>
        )}

        <div className="banner-anchor">
          <header className="main-banner">
            <div className="banner-left">
              <span className="brand-mark">
                <HeaderLocationIcon />
              </span>
              <h2 className="banner-title">Facility Portal</h2>
            </div>
            <div className="banner-right">
              <button type="button" className="status-pill">
                System Online
              </button>
              <div className="profile-group">
                <div className="avatar-circle">FP</div>
              </div>
            </div>
          </header>
        </div>

        <div className="workspace-content">
          <nav className="side-nav">
            <div className="nav-top-group">
              <div
                className={`nav-link ${view === 'availability' ? 'active' : ''}`}
                onClick={() => setView('availability')}
                title="Availability"
                role="button"
              >
                <SideIcon active={view === 'availability'} path="M12 6v12M7 11h10M5 5h14v14H5z" />
              </div>
              <div
                className={`nav-link ${view === 'incoming' ? 'active' : ''}`}
                onClick={() => setView('incoming')}
                title="Incoming"
                role="button"
              >
                <SideIcon
                  active={view === 'incoming'}
                  path="M3 11.5h18M6.5 15.5h11M8 19h8M7 11.5V7a2 2 0 0 1 2-2h6a2 2 0 0 1 2 2v4.5"
                />
              </div>
              <div
                className={`nav-link ${view === 'map' ? 'active' : ''}`}
                onClick={() => setView('map')}
                title="Map"
                role="button"
              >
                <SideIcon active={view === 'map'} path="M12 21s6-5.4 6-10a6 6 0 1 0-12 0c0 4.6 6 10 6 10z" />
              </div>
              <div
                className={`nav-link ${view === 'addDriver' ? 'active' : ''}`}
                onClick={() => setView('addDriver')}
                title="Add driver"
                role="button"
              >
                <AddDriverNavIcon active={view === 'addDriver'} />
              </div>
            </div>
            <div className="nav-bottom-group">
              <div className="nav-link" title="Sign out" onClick={logout} role="button">
                <SideIcon path="M9 7l-5 5 5 5M4 12h12M15 5h5v14h-5" />
              </div>
            </div>
          </nav>

          <main className="hud-panel">
            <header className="hud-header">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px', flexWrap: 'wrap' }}>
                  <h1 className="hud-title">{hudTitle}</h1>
                  {(view === 'availability' || view === 'incoming' || view === 'map') && (
                    <span style={{ fontSize: '0.85rem', fontWeight: '700', color: '#64748b' }}>
                      (
                      <span style={{ color: '#10b981' }}>{inboundMissions.length}</span>
                      <span style={{ color: '#64748b' }}> inbound</span>)
                    </span>
                  )}
                </div>
              </div>
            </header>

            <div className="hud-scroll-hide">
              {view === 'addDriver' && (
                <div className="fleet-list-container">
                  <div className="unit-card-new" style={{ cursor: 'default' }}>
                    <p className="facility-section-subtitle" style={{ marginTop: 0 }}>
                      Register a new ambulance unit for the mobile app
                    </p>
                    <AddDriver
                      baseHospitalId={mapScopeId}
                      defaultLat={selectedFacility?.latitude ?? selectedFacility?.lat}
                      defaultLng={selectedFacility?.longitude ?? selectedFacility?.lng}
                      onComplete={() => {
                        fetchAll();
                        showToast('success', 'Driver registered. They can sign in with the email and password you set.');
                      }}
                    />
                  </div>
                </div>
              )}

              {view === 'availability' && (
                <div className="fleet-list-container">
                  <div className="unit-card-new" style={{ cursor: 'default' }}>
                    <p className="facility-section-subtitle" style={{ marginTop: 0 }}>
                      Beds and map position for your facility (coordinates move the pin on the map).
                    </p>
                    <form onSubmit={saveBeds}>
                      <div className="input-group">
                        <label className="field-label">Your facility</label>
                        <div className="nearest-unit-box" style={{ marginBottom: '14px' }} aria-readonly="true">
                          {selectedFacility?.name ?? '—'}
                        </div>
                      </div>
                      <div className="input-group">
                        <label className="field-label">Latitude</label>
                        <input
                          className="modern-input"
                          type="text"
                          inputMode="decimal"
                          value={latInput}
                          onChange={(e) => setLatInput(e.target.value)}
                          required
                          style={{ marginBottom: '14px' }}
                          placeholder="e.g. 5.4164"
                        />
                      </div>
                      <div className="input-group">
                        <label className="field-label">Longitude</label>
                        <input
                          className="modern-input"
                          type="text"
                          inputMode="decimal"
                          value={lngInput}
                          onChange={(e) => setLngInput(e.target.value)}
                          required
                          style={{ marginBottom: '14px' }}
                          placeholder="e.g. 100.3327"
                        />
                      </div>
                      <div className="input-group">
                        <label className="field-label">Beds available</label>
                        <input
                          className="modern-input"
                          type="number"
                          min="0"
                          value={bedsInput}
                          onChange={(e) => setBedsInput(e.target.value)}
                          required
                          style={{ marginBottom: '14px' }}
                        />
                      </div>
                      <button type="submit" className="confirm-btn" disabled={saving} style={{ marginTop: 0 }}>
                        {saving ? 'Saving...' : 'Save'}
                      </button>
                    </form>
                  </div>
                </div>
              )}

              {view === 'map' && (
                <div className="fleet-list-container">
                  <div className="unit-card-new" style={{ cursor: 'default' }}>
                    <p className="facility-section-subtitle" style={{ marginTop: 0 }}>
                      Ambulances and routes for your facility use the full map behind this panel. Toggle traffic with the
                      control on the right.
                    </p>
                    {hospitals.length > 0 && (
                      <div className="input-group" style={{ marginTop: '8px' }}>
                        <label className="field-label">Your facility</label>
                        <div className="nearest-unit-box" aria-readonly="true">
                          {selectedFacility?.name ?? '—'}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {view === 'incoming' && (
                <div className="fleet-list-container">
                  {hospitals.length > 0 && (
                    <div className="unit-card-new" style={{ cursor: 'default', marginBottom: '12px' }}>
                      <div className="input-group">
                        <label className="field-label">Your facility</label>
                        <div className="nearest-unit-box" aria-readonly="true">
                          {selectedFacility?.name ?? '—'}
                        </div>
                      </div>
                    </div>
                  )}
                  {inboundMissions.length === 0 ? (
                    <p style={{ color: '#64748b', textAlign: 'center', marginTop: '12px', fontSize: '0.9rem' }}>
                      No inbound missions for this facility.
                    </p>
                  ) : (
                    inboundMissions.map((m) => (
                      <div key={m.id} className="unit-card-new" style={{ cursor: 'default' }}>
                        <div className="card-main-content" style={{ flexDirection: 'column', alignItems: 'flex-start', width: '100%' }}>
                          <strong className="unit-name-text">{m.patientName}</strong>
                          <span className="unit-sub-text">{m.driverName}</span>
                          <div style={{ display: 'flex', gap: '8px', marginTop: '10px', flexWrap: 'wrap' }}>
                            <span className="facility-pill">{m.status}</span>
                            <span className="facility-pill eta">ETA {m.eta}</span>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>
          </main>
        </div>
      </div>
    </div>
  );
};

export default FacilityPortal;
