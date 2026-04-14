import React, { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import '../App.css';

const RegisterFacility = () => {
  const [hospitals, setHospitals] = useState([]);
  const [registering, setRegistering] = useState(false);
  const [registerForm, setRegisterForm] = useState({ name: '', specialty: '' });
  const [toast, setToast] = useState(null);
  const toastTimerRef = useRef(null);

  useEffect(() => {
    const load = async () => {
      const { data } = await supabase.from('hospitals').select('name');
      if (data) setHospitals(data);
    };
    load();
  }, []);

  const showToast = (type, text) => {
    setToast({ type, text });
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    toastTimerRef.current = setTimeout(() => setToast(null), 4000);
  };

  const registerFacility = async (e) => {
    e.preventDefault();
    const name = registerForm.name.trim();
    const specialty = registerForm.specialty.trim();

    if (!name) return showToast('error', 'Enter a facility name.');
    if (hospitals.some((h) => String(h.name || '').trim().toLowerCase() === name.toLowerCase())) {
      return showToast('error', 'That name is already used.');
    }

    setRegistering(true);
    const { error } = await supabase
      .from('hospitals')
      .insert({ name, specialty: specialty || 'General', beds: 0 });
    setRegistering(false);

    if (error) return showToast('error', error.message);
    setRegisterForm({ name: '', specialty: '' });
    setHospitals((prev) => [...prev, { name }]);
    showToast('success', 'Registered. You can sign in to the Facility Portal.');
  };

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="auth-header">
          <h1>Register facility</h1>
          <p>Name and specialty</p>
        </div>

        {toast && (
          <div className={`facility-toast facility-toast-${toast.type}`} role="status" style={{ marginBottom: '1rem' }}>
            {toast.text}
          </div>
        )}

        <form onSubmit={registerFacility} className="auth-form">
          <div className="auth-field">
            <label htmlFor="reg-name">Name</label>
            <input
              id="reg-name"
              className="auth-input"
              type="text"
              value={registerForm.name}
              onChange={(e) => setRegisterForm((p) => ({ ...p, name: e.target.value }))}
              required
            />
          </div>
          <div className="auth-field">
            <label htmlFor="reg-specialty">Specialty</label>
            <input
              id="reg-specialty"
              className="auth-input"
              type="text"
              value={registerForm.specialty}
              onChange={(e) => setRegisterForm((p) => ({ ...p, specialty: e.target.value }))}
              placeholder="e.g. General"
            />
          </div>
          <button type="submit" className="auth-submit" disabled={registering}>
            {registering ? 'Saving...' : 'Add facility'}
          </button>
        </form>

        <div className="auth-footer">
          <p>
            <Link to="/" className="auth-link">
              Back to sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default RegisterFacility;
