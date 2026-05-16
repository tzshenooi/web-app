import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import { canAccessClinicPortal } from '../utils/resolveClinic';
import '../App.css';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [loading, setLoading] = useState(false);
  /** 'pending' | 'unauthorized' | 'registered' | null */
  const [clinicNotice, setClinicNotice] = useState(null);
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const n = location.state?.loginNotice;
    if (n === 'clinic_registered' || n === 'facility_registered') {
      setClinicNotice('registered');
      navigate(location.pathname, { replace: true, state: {} });
    } else if (n === 'clinic_pending' || n === 'facility_pending') {
      setClinicNotice('pending');
      navigate(location.pathname, { replace: true, state: {} });
    } else if (n === 'clinic_unauthorized' || n === 'facility_unauthorized') {
      setClinicNotice('unauthorized');
      navigate(location.pathname, { replace: true, state: {} });
    }
  }, [location.state, location.pathname, navigate]);

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;

      if (await canAccessClinicPortal(data.user)) {
        navigate('/clinic');
        return;
      }

      const pending =
        data.user?.app_metadata?.clinic_access === 'pending' ||
        data.user?.app_metadata?.facility_access === 'pending';
      await supabase.auth.signOut();
      setClinicNotice(pending ? 'pending' : 'unauthorized');
    } catch (error) {
      alert(error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="auth-header">
          <div className="auth-logo facility" aria-hidden>
            <svg width="36" height="36" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M3 21h18" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
              <path d="M6 21V7.5a1.5 1.5 0 0 1 1.5-1.5h9A1.5 1.5 0 0 1 18 7.5V21" stroke="currentColor" strokeWidth="1.6" />
              <path d="M12 9v6M9 12h6" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
            </svg>
          </div>
          <h1>Clinic Portal</h1>
          <p>Dispatch, incoming patient reports, and driver roster.</p>
        </div>

        {clinicNotice === 'registered' && (
          <div className="auth-login-notice" role="status">
            Clinic registered successfully. Sign in with the email and password you created.
          </div>
        )}
        {clinicNotice === 'pending' && (
          <div className="auth-login-notice" role="status">
            Your clinic access is pending. Complete registration or ask an administrator to approve your account.
          </div>
        )}
        {clinicNotice === 'unauthorized' && (
          <div className="auth-login-notice auth-login-notice-muted" role="status">
            No clinic is linked to this account. Register a clinic or set{' '}
            <code>clinic_access</code> and <code>clinic_id</code> in Auth user metadata.
          </div>
        )}

        <form onSubmit={handleLogin} className="auth-form">
          <div className="auth-field">
            <label htmlFor="email">Email Address</label>
            <input
              id="email"
              className="auth-input"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="clinic@example.com"
              autoComplete="email"
              required
            />
          </div>

          <div className="auth-field">
            <label htmlFor="password">Password</label>
            <input
              id="password"
              className="auth-input"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter your password"
              autoComplete="current-password"
              required
            />
          </div>

          <div className="auth-row">
            <label className="auth-checkbox">
              <input id="remember" type="checkbox" checked={rememberMe} onChange={(e) => setRememberMe(e.target.checked)} />
              <span>Remember me</span>
            </label>
          </div>

          <button type="submit" className="auth-submit" disabled={loading}>
            {loading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>

        <div className="auth-footer" style={{ marginTop: '1rem' }}>
          <p>
            <Link to="/register-facility" className="auth-link">
              Register a new clinic
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Login;
