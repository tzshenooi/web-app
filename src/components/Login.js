import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import '../App.css'; 

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [portalType, setPortalType] = useState('dispatcher');
  const [loading, setLoading] = useState(false);
  /** 'pending' | 'unauthorized' | null */
  const [facilityNotice, setFacilityNotice] = useState(null);
  const navigate = useNavigate();
  const location = useLocation();
  const isFacility = portalType === 'facility';

  useEffect(() => {
    const n = location.state?.loginNotice;
    if (n === 'facility_pending' || n === 'facility_unauthorized') {
      setPortalType('facility');
      setFacilityNotice(n === 'facility_pending' ? 'pending' : 'unauthorized');
      navigate(location.pathname, { replace: true, state: {} });
    }
  }, [location.state, location.pathname, navigate]);

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
      if (portalType === 'facility') {
        const access = data.user?.app_metadata?.facility_access;
        if (access === 'approved') {
          navigate('/facility');
        } else if (access === 'pending') {
          await supabase.auth.signOut();
          setFacilityNotice('pending');
        } else {
          const { data: pend } = await supabase
            .from('facility_registrations')
            .select('id')
            .eq('auth_user_id', data.user.id)
            .maybeSingle();
          if (pend) {
            await supabase.auth.signOut();
            setFacilityNotice('pending');
          } else {
            await supabase.auth.signOut();
            setFacilityNotice('unauthorized');
          }
        }
      } else {
        navigate('/dashboard');
      }
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
          <div className={`auth-logo ${isFacility ? 'facility' : ''}`} aria-hidden>
            {isFacility ? (
              <svg width="36" height="36" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M3 21h18" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
                <path d="M6 21V7.5a1.5 1.5 0 0 1 1.5-1.5h9A1.5 1.5 0 0 1 18 7.5V21" stroke="currentColor" strokeWidth="1.6" />
                <path d="M12 9v6M9 12h6" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
              </svg>
            ) : (
              <svg width="36" height="36" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path
                  d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            )}
          </div>
          <h1>{isFacility ? 'Facility Portal' : 'Dispatcher Portal'}</h1>
          <p>{isFacility ? 'Manage beds and incoming ETA' : 'Sign in to your account'}</p>
        </div>

        {facilityNotice === 'pending' && (
          <div className="auth-login-notice" role="status">
            Your facility request is still being reviewed by a dispatcher.
          </div>
        )}
        {facilityNotice === 'unauthorized' && (
          <div className="auth-login-notice auth-login-notice-muted" role="status">
            This account is not linked to an approved facility. Use dispatcher login if you are staff, or register your facility and wait for approval.
          </div>
        )}

        <form onSubmit={handleLogin} className="auth-form">
          <div className="auth-portal-switch">
            <button
              type="button"
              className={`auth-portal-btn ${portalType === 'dispatcher' ? 'active' : ''}`}
              onClick={() => {
                setPortalType('dispatcher');
                setFacilityNotice(null);
              }}
            >
              Dispatcher
            </button>
            <button
              type="button"
              className={`auth-portal-btn ${portalType === 'facility' ? 'active' : ''}`}
              onClick={() => setPortalType('facility')}
            >
              Facility
            </button>
          </div>

          <div className="auth-field">
            <label htmlFor="email">Email Address</label>
            <input
              id="email"
              className="auth-input"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
                placeholder={isFacility ? 'facility@example.com' : 'dispatcher@example.com'}
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
              <input
                id="remember"
                type="checkbox"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
              />
              <span>Remember me</span>
            </label>
            <a href="/" onClick={(e) => e.preventDefault()} className="auth-link">Forgot password?</a>
          </div>

          <button type="submit" className="auth-submit" disabled={loading}>
            {loading ? "Signing in..." : "Sign In"}
          </button>
        </form>

        {isFacility && (
          <p className="auth-facility-note">
            New hospital?{' '}
            <Link to="/register-facility" className="auth-link">Register</Link>
          </p>
        )}
      </div>
    </div>
  );
};

export default Login;