import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import '../App.css';

const toKm = (lat1, lng1, lat2, lng2) => {
  const toRad = (d) => (d * Math.PI) / 180;
  const R = 6371;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
      Math.sin(dLng / 2) * Math.sin(dLng / 2);
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
};

const FacilityPortal = () => {
  const navigate = useNavigate();
  const [hospitals, setHospitals] = useState([]);
  const [drivers, setDrivers] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [selectedFacilityId, setSelectedFacilityId] = useState('');
  const [bedsInput, setBedsInput] = useState('');
  const [saving, setSaving] = useState(false);

  const fetchAll = useCallback(async () => {
    const { data: authData } = await supabase.auth.getUser();
    if (!authData?.user) {
      navigate('/');
      return;
    }

    const { data: hosp } = await supabase.from('hospitals').select('*').order('name', { ascending: true });
    const { data: drv } = await supabase.from('drivers').select('id,name,current_lat,current_lng');
    const { data: bkg } = await supabase
      .from('bookings')
      .select('*')
      .in('status', ['Assigned', 'Accepted', 'En Route', 'Picked Up']);

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
      .on('postgres_changes', { event: '*', schema: 'public', table: 'hospitals' }, () => fetchAll())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'bookings' }, () => fetchAll())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'drivers' }, () => fetchAll())
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchAll]);

  const selectedFacility = useMemo(
    () => hospitals.find((h) => String(h.id) === String(selectedFacilityId)),
    [hospitals, selectedFacilityId]
  );

  const inboundMissions = useMemo(() => {
    if (!selectedFacility) return [];
    const list = bookings.filter((b) => String(b.destination_facility) === String(selectedFacility.id));
    return list.map((b) => {
      const driver = drivers.find((d) => d.id === b.driver_id);
      let eta = 'ETA unavailable';
      if (driver?.current_lat != null && driver?.current_lng != null && b.latitude != null && b.longitude != null) {
        const km = toKm(
          Number(driver.current_lat),
          Number(driver.current_lng),
          Number(b.latitude),
          Number(b.longitude)
        );
        const mins = Math.max(1, Math.round((km / 45) * 60));
        eta = `${mins} min`;
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

  const handleFacilityChange = (e) => {
    const id = e.target.value;
    setSelectedFacilityId(id);
    const found = hospitals.find((h) => String(h.id) === String(id));
    setBedsInput(String(found?.beds ?? 0));
  };

  const saveBeds = async (e) => {
    e.preventDefault();
    if (!selectedFacilityId) return;
    const beds = Number(bedsInput);
    if (!Number.isFinite(beds) || beds < 0) {
      alert('Beds must be a number >= 0.');
      return;
    }
    setSaving(true);
    const { error } = await supabase.from('hospitals').update({ beds }).eq('id', selectedFacilityId);
    setSaving(false);
    if (error) {
      alert(error.message);
      return;
    }
    await fetchAll();
    alert('Bed availability updated.');
  };

  const logout = async () => {
    await supabase.auth.signOut();
    navigate('/');
  };

  return (
    <div className="facility-page">
      <div className="facility-shell">
        <div className="facility-topbar">
          <div>
            <h1>Facility Portal</h1>
            <p>Manage bed availability and incoming ambulance ETA</p>
          </div>
          <button className="auth-submit facility-logout-btn" onClick={logout}>Sign Out</button>
        </div>

        <div className="facility-grid">
          <div className="facility-card">
            <h2>Facility Availability</h2>
            <form onSubmit={saveBeds} className="auth-form">
              <div className="auth-field">
                <label>Facility</label>
                <select className="auth-input" value={selectedFacilityId} onChange={handleFacilityChange} required>
                  {hospitals.map((h) => (
                    <option key={h.id} value={h.id}>{h.name}</option>
                  ))}
                </select>
              </div>
              <div className="auth-field">
                <label>Available Beds</label>
                <input
                  className="auth-input"
                  type="number"
                  min="0"
                  value={bedsInput}
                  onChange={(e) => setBedsInput(e.target.value)}
                  required
                />
              </div>
              <button type="submit" className="auth-submit" disabled={saving}>
                {saving ? 'Saving...' : 'Update Availability'}
              </button>
            </form>
          </div>

          <div className="facility-card">
            <h2>Incoming Ambulances</h2>
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
          </div>
        </div>
      </div>
    </div>
  );
};

export default FacilityPortal;
