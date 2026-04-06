import React, { useEffect, useState } from 'react';
import { supabase } from '../supabaseClient';

const VerificationQueue = () => {
  const [pendingDrivers, setPendingDrivers] = useState([]);

  const openDocUrl = (e, url, label) => {
    e.preventDefault();
    const s = url != null && typeof url === 'string' ? url.trim() : '';
    if (!s) {
      window.alert(
        `No ${label} document URL saved. Complete registration in the mobile app so files upload to Storage, or set license_front_url / ic_front_url in Supabase for this row.`
      );
      return;
    }
    window.open(s, '_blank', 'noopener,noreferrer');
  };

  const fetchPending = async () => {
    const { data } = await supabase
      .from('drivers')
      .filter('status', 'eq', 'Pending');
    if (data) setPendingDrivers(data);
  };

  useEffect(() => { fetchPending(); }, []);

  const handleVerify = async (driverId, newStatus) => {
    await supabase.from('drivers').update({ status: newStatus }).eq('id', driverId);
    fetchPending(); // Refresh list
  };

  return (
    <div className="verification-container" style={{ padding: '20px', background: 'white', borderRadius: '12px' }}>
      <h3>🚦 Driver Legitimacy Check</h3>
      {pendingDrivers.length === 0 ? <p>No new drivers to verify.</p> : (
        pendingDrivers.map(driver => (
          <div key={driver.id} className="incident-card" style={{ borderLeft: '5px solid #3b82f6' }}>
            <h4>{driver.name}</h4>
            <p><strong>IC:</strong> {driver.ic_number} | <strong>Phone:</strong> {driver.phone_number}</p>
            <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
              <a
                href={driver.ic_front_url || '#'}
                onClick={(e) => openDocUrl(e, driver.ic_front_url, 'IC')}
                className="trip-btn-ref"
              >View IC</a>
              <a
                href={driver.license_front_url || '#'}
                onClick={(e) => openDocUrl(e, driver.license_front_url, 'license')}
                className="trip-btn-ref"
              >View License</a>
            </div>
            <div style={{ marginTop: '15px', display: 'flex', gap: '10px' }}>
              <button 
                onClick={() => handleVerify(driver.id, 'Offline')} 
                style={{ background: '#10b981', color: 'white', border: 'none', padding: '8px 16px', borderRadius: '6px', cursor: 'pointer' }}>
                Approve Driver
              </button>
              <button 
                onClick={() => handleVerify(driver.id, 'Rejected')} 
                style={{ background: '#ef4444', color: 'white', border: 'none', padding: '8px 16px', borderRadius: '6px', cursor: 'pointer' }}>
                Reject
              </button>
            </div>
          </div>
        ))
      )}
    </div>
  );
};

export default VerificationQueue;