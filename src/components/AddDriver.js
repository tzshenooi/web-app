import React, { useState } from 'react';
import { supabaseAdmin } from '../supabaseClient';

const DEFAULT_LAT = 5.3544;
const DEFAULT_LNG = 100.3012;

const AddDriver = ({ onComplete, baseClinicId = null, defaultLat = null, defaultLng = null }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);

  const facilityMode = Boolean(baseClinicId);

  const handleRegisterDriver = async (e) => {
    e.preventDefault();
    setLoading(true);
    const trimmedEmail = email.trim();
    const trimmedName = name.trim();

    let currentLat = DEFAULT_LAT;
    let currentLng = DEFAULT_LNG;

    if (facilityMode) {
      const la = defaultLat != null ? Number(defaultLat) : NaN;
      const lo = defaultLng != null ? Number(defaultLng) : NaN;
      if (!Number.isFinite(la) || !Number.isFinite(lo) || la < -90 || la > 90 || lo < -180 || lo > 180) {
        alert(
          'Set your clinic map position under Clinic location (latitude/longitude) before adding drivers, so units appear on the map.'
        );
        setLoading(false);
        return;
      }
      currentLat = la;
      currentLng = lo;
    }

    try {
      const appMeta = { role: 'driver' };
      if (facilityMode && baseClinicId) {
        appMeta.base_clinic_id = String(baseClinicId);
      }

      const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
        email: trimmedEmail,
        password,
        email_confirm: true,
        user_metadata: { role: 'driver', name: trimmedName },
        app_metadata: appMeta,
      });

      if (authError) {
        const msg = authError.message || '';
        alert(
          /already|registered|exists/i.test(msg)
            ? 'This email is already registered.'
            : 'Registration failed: ' + msg
        );
        return;
      }

      const user = authData?.user;
      if (!user?.id) {
        alert('Registration failed: no user returned.');
        return;
      }

      const insertRow = {
        id: user.id,
        name: trimmedName,
        email: trimmedEmail,
        status: 'Offline',
        current_lat: currentLat,
        current_lng: currentLng,
      };
      if (facilityMode && baseClinicId) {
        insertRow.base_clinic_id = baseClinicId;
      }

      const { error: dbError } = await supabaseAdmin.from('drivers').upsert(insertRow, { onConflict: 'id' });

      if (dbError) {
        console.error('Driver DB insert:', dbError);
        alert('Auth user was created, but the driver record failed: ' + dbError.message);
        return;
      }

      setEmail('');
      setPassword('');
      setName('');
      if (onComplete) {
        await onComplete();
      } else {
        alert('Driver registered. They can sign in on the mobile app with this email and password.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="add-driver-container" style={{ padding: '10px' }}>
      <form onSubmit={handleRegisterDriver}>
        <div className="input-group">
          <label className="field-label">DRIVER FULL NAME</label>
          <input type="text" className="modern-input" value={name} onChange={(e) => setName(e.target.value)} required placeholder="e.g. Ahmad bin Ali" />
        </div>

        <div className="input-group">
          <label className="field-label">EMAIL ADDRESS</label>
          <input type="email" className="modern-input" value={email} onChange={(e) => setEmail(e.target.value)} required placeholder="driver@ambulance.com" />
        </div>

        <div className="input-group">
          <label className="field-label">PASSWORD (MIN 6 CHARS)</label>
          <input type="password" className="modern-input" value={password} onChange={(e) => setPassword(e.target.value)} required placeholder="••••••" />
        </div>

        <button type="submit" className="confirm-btn" style={{ background: '#2c3e50' }} disabled={loading}>
          {loading ? 'REGISTERING...' : 'ADD DRIVER LOGIN'}
        </button>
      </form>
    </div>
  );
};

export default AddDriver;
