import React, { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase, supabaseAdmin } from '../supabaseClient';
import '../App.css';

const RegisterFacility = () => {
  const [step, setStep] = useState(1);
  const [hospitals, setHospitals] = useState([]);
  const [registering, setRegistering] = useState(false);
  const [account, setAccount] = useState({ email: '', password: '', confirmPassword: '' });
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

  const goToStep2 = (e) => {
    e.preventDefault();
    const email = account.email.trim();
    const { password, confirmPassword } = account;
    if (!email) return showToast('error', 'Enter your email.');
    if (password.length < 6) return showToast('error', 'Password must be at least 6 characters.');
    if (password !== confirmPassword) return showToast('error', 'Passwords do not match.');
    setStep(2);
  };

  const registerFacility = async (e) => {
    e.preventDefault();
    const name = registerForm.name.trim();
    const specialty = registerForm.specialty.trim();
    const email = account.email.trim();
    const { password } = account;

    if (!name) return showToast('error', 'Enter a facility name.');
    if (hospitals.some((h) => String(h.name || '').trim().toLowerCase() === name.toLowerCase())) {
      return showToast('error', 'That name is already registered.');
    }

    setRegistering(true);
    let createdUserId = null;
    try {
      const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        app_metadata: { facility_access: 'pending' },
      });

      if (authError) {
        const msg = authError.message || '';
        showToast(
          'error',
          /already|registered|exists/i.test(msg)
            ? 'This email is already registered.'
            : msg
        );
        return;
      }

      const user = authData?.user;
      if (!user?.id) {
        showToast('error', 'Could not create account.');
        return;
      }
      createdUserId = user.id;

      const { error } = await supabase.from('facility_registrations').insert({
        name,
        specialty: specialty || 'General',
        contact_email: email,
        auth_user_id: user.id,
      });

      if (error) {
        if (error.code === '23505') {
          await supabaseAdmin.auth.admin.deleteUser(user.id);
          return showToast('error', 'A request with that name is already pending.');
        }
        await supabaseAdmin.auth.admin.deleteUser(user.id);
        return showToast('error', error.message);
      }

      setAccount({ email: '', password: '', confirmPassword: '' });
      setRegisterForm({ name: '', specialty: '' });
      setStep(1);
      showToast(
        'success',
        'Request submitted. A dispatcher will review it before the facility appears in the system.'
      );
    } catch (err) {
      showToast('error', err.message || String(err));
      if (createdUserId) {
        await supabaseAdmin.auth.admin.deleteUser(createdUserId).catch(() => {});
      }
    } finally {
      setRegistering(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="auth-header">
          <h1>Register facility</h1>
          {step === 1 ? (
            <p>Sign-in email and password for the Facility Portal after approval.</p>
          ) : (
            <p>Name and specialty. Your request must be approved by a dispatcher.</p>
          )}
        </div>

        {toast && (
          <div className={`facility-toast facility-toast-${toast.type}`} role="status" style={{ marginBottom: '1rem' }}>
            {toast.text}
          </div>
        )}

        {step === 1 && (
          <form onSubmit={goToStep2} className="auth-form">
            <div className="auth-field">
              <label htmlFor="reg-email">Email</label>
              <input
                id="reg-email"
                className="auth-input"
                type="email"
                autoComplete="email"
                value={account.email}
                onChange={(e) => setAccount((p) => ({ ...p, email: e.target.value }))}
                required
              />
            </div>
            <div className="auth-field">
              <label htmlFor="reg-password">Password</label>
              <input
                id="reg-password"
                className="auth-input"
                type="password"
                autoComplete="new-password"
                minLength={6}
                value={account.password}
                onChange={(e) => setAccount((p) => ({ ...p, password: e.target.value }))}
                required
              />
            </div>
            <div className="auth-field">
              <label htmlFor="reg-confirm">Confirm password</label>
              <input
                id="reg-confirm"
                className="auth-input"
                type="password"
                autoComplete="new-password"
                minLength={6}
                value={account.confirmPassword}
                onChange={(e) => setAccount((p) => ({ ...p, confirmPassword: e.target.value }))}
                required
              />
            </div>
            <button type="submit" className="auth-submit">
              Continue
            </button>
          </form>
        )}

        {step === 2 && (
          <form onSubmit={registerFacility} className="auth-form">
            <div className="auth-field">
              <label htmlFor="reg-name">Facility name</label>
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
              {registering ? 'Submitting...' : 'Submit request'}
            </button>
            <p style={{ textAlign: 'center', margin: '12px 0 0' }}>
              <button
                type="button"
                className="auth-link"
                style={{ background: 'none', border: 'none', cursor: registering ? 'wait' : 'pointer', font: 'inherit' }}
                disabled={registering}
                onClick={() => setStep(1)}
              >
                Back to account details
              </button>
            </p>
          </form>
        )}

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
