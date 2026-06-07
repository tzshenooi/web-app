import React, { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase, supabaseAdmin } from '../supabaseClient';
import ClinicAddressField from './ClinicAddressField';
import '../App.css';

const RegisterFacility = () => {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [clinicNames, setClinicNames] = useState([]);
  const [registering, setRegistering] = useState(false);
  const [account, setAccount] = useState({ email: '', password: '', confirmPassword: '' });
  const [registerForm, setRegisterForm] = useState({ name: '', specialty: '', phone: '' });
  const [clinicLocation, setClinicLocation] = useState(null);
  const [toast, setToast] = useState(null);
  const toastTimerRef = useRef(null);

  useEffect(() => {
    const load = async () => {
      const { data } = await supabase.from('clinics').select('name');
      if (data) setClinicNames(data);
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

  const phoneDigits = (raw) => String(raw || '').replace(/\D/g, '');

  const registerFacility = async (e) => {
    e.preventDefault();
    const name = registerForm.name.trim();
    const specialty = registerForm.specialty.trim();
    const phone = registerForm.phone.trim();
    const email = account.email.trim();
    const { password } = account;

    if (!name) return showToast('error', 'Enter a clinic name.');
    if (phoneDigits(phone).length < 8) {
      return showToast('error', 'Enter a valid clinic phone number (at least 8 digits).');
    }
    if (clinicNames.some((h) => String(h.name || '').trim().toLowerCase() === name.toLowerCase())) {
      return showToast('error', 'That clinic name is already registered.');
    }

    const { data: emailTaken } = await supabase.from('clinics').select('id').ilike('email', email).maybeSingle();
    if (emailTaken) return showToast('error', 'This email is already linked to a clinic.');

    if (!clinicLocation?.address || !Number.isFinite(clinicLocation.latitude) || !Number.isFinite(clinicLocation.longitude)) {
      return showToast('error', 'Search and pick your clinic address from the suggestions.');
    }

    if (!supabaseAdmin) {
      return showToast(
        'error',
        'Registration is not configured. Add REACT_APP_SUPABASE_SERVICE_ROLE_KEY to web-app/.env and restart the dev server.'
      );
    }

    setRegistering(true);
    let createdUserId = null;
    try {
      const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        app_metadata: { clinic_access: 'pending' },
      });

      if (authError) {
        const msg = authError.message || '';
        showToast(
          'error',
          /already|registered|exists/i.test(msg) ? 'This email is already registered.' : msg
        );
        return;
      }

      const user = authData?.user;
      if (!user?.id) {
        showToast('error', 'Could not create account.');
        return;
      }
      createdUserId = user.id;

      const clinicPayload = {
        name,
        email,
        phone,
        specialty: specialty || 'General',
        auth_user_id: user.id,
        address: clinicLocation.address,
        latitude: clinicLocation.latitude,
        longitude: clinicLocation.longitude,
      };

      const { data: clinicRow, error: clinicError } = await supabaseAdmin
        .from('clinics')
        .insert(clinicPayload)
        .select('id')
        .single();

      if (clinicError) {
        await supabaseAdmin.auth.admin.deleteUser(user.id);
        if (clinicError.code === '23505') {
          return showToast('error', 'That clinic name or email is already registered.');
        }
        if (clinicError.code === 'PGRST204' || /address|phone/i.test(clinicError.message || '')) {
          return showToast(
            'error',
            'Database is missing required columns. Run web-app/supabase/clinics_address.sql and clinics_phone.sql in Supabase SQL Editor.'
          );
        }
        return showToast('error', clinicError.message);
      }

      const { error: metaError } = await supabaseAdmin.auth.admin.updateUserById(user.id, {
        app_metadata: {
          clinic_access: 'approved',
          clinic_id: clinicRow.id,
        },
      });
      if (metaError) {
        await supabaseAdmin.from('clinics').delete().eq('id', clinicRow.id);
        await supabaseAdmin.auth.admin.deleteUser(user.id);
        return showToast('error', metaError.message);
      }

      setAccount({ email: '', password: '', confirmPassword: '' });
      setRegisterForm({ name: '', specialty: '', phone: '' });
      setClinicLocation(null);
      setStep(1);
      navigate('/', { replace: true, state: { loginNotice: 'clinic_registered' } });
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
          <h1>Register clinic</h1>
          {step === 1 ? (
            <p>Sign-in email and password for the Clinic Portal.</p>
          ) : (
            <p>Clinic name, specialty, contact phone, and address (used for the map pin). Patients call this number from the mobile app.</p>
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
              <label htmlFor="reg-name">Clinic name</label>
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
            <div className="auth-field">
              <label htmlFor="reg-phone">Clinic phone</label>
              <input
                id="reg-phone"
                className="auth-input"
                type="tel"
                autoComplete="tel"
                inputMode="tel"
                value={registerForm.phone}
                onChange={(e) => setRegisterForm((p) => ({ ...p, phone: e.target.value }))}
                placeholder="e.g. +60123456789"
                required
              />
              <p className="facility-muted" style={{ marginTop: 6, fontSize: '0.8rem' }}>
                Shown to patients for phone bookings via the mobile app.
              </p>
            </div>
            <div className="auth-field">
              <label htmlFor="reg-address">Clinic address</label>
              <ClinicAddressField
                inputId="reg-address"
                value={clinicLocation}
                onPlaceSelected={setClinicLocation}
                placeholder="Search street, building, or area…"
                disabled={registering}
              />
              <p className="facility-muted" style={{ marginTop: 6, fontSize: '0.8rem' }}>
                Pick a suggestion so we can place your clinic on the map.
              </p>
            </div>
            <button type="submit" className="auth-submit" disabled={registering}>
              {registering ? 'Submitting...' : 'Create clinic account'}
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
