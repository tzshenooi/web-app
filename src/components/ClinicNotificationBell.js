import React, { useEffect, useRef } from 'react';
import { useClinicNotifications } from '../hooks/useClinicNotifications';
import { setClinicToastNavigate } from '../utils/clinicToast';

const BellIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
    <path
      d="M18 8a6 6 0 10-12 0c0 7-3 7-3 7h18s-3 0-3-7M13.73 21a2 2 0 01-3.46 0"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

function alertIndicatorClass(type) {
  if (type === 'emergency') return 'emergency';
  if (type === 'status') return 'status';
  return 'alert';
}

export default function ClinicNotificationBell({ clinicId, driverIds = [], onNavigate }) {
  const containerRef = useRef(null);
  const {
    notifications,
    unreadCount,
    dropdownOpen,
    setDropdownOpen,
    toggleDropdown,
    markAllRead,
    requestBrowserPermission,
  } = useClinicNotifications(clinicId, driverIds);

  useEffect(() => {
    setClinicToastNavigate(onNavigate);
    return () => setClinicToastNavigate(null);
  }, [onNavigate]);

  useEffect(() => {
    requestBrowserPermission();
  }, [requestBrowserPermission]);

  useEffect(() => {
    const onPointerDown = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', onPointerDown);
    return () => document.removeEventListener('mousedown', onPointerDown);
  }, [setDropdownOpen]);

  if (!clinicId) return null;

  return (
    <div ref={containerRef} className="notification-container">
      <div
        className={`notification-wrapper ${dropdownOpen ? 'active' : ''}`}
        onClick={toggleDropdown}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            toggleDropdown();
          }
        }}
        role="button"
        tabIndex={0}
        aria-label="Notifications"
        aria-expanded={dropdownOpen}
      >
        <BellIcon />
        {unreadCount > 0 && <span className="notification-dot" aria-hidden="true" />}
      </div>

      {dropdownOpen && (
        <div className="notification-dropdown" role="region" aria-label="Notification list">
          <div className="noti-header">
            <span>Notifications</span>
            <button type="button" onClick={markAllRead}>
              Mark read
            </button>
          </div>
          <div className="noti-list">
            {notifications.length === 0 ? (
              <p className="noti-empty">No alerts yet. Live updates appear here.</p>
            ) : (
              notifications.map((n) => (
                <div
                  key={n.key}
                  className="noti-item"
                  role="button"
                  tabIndex={0}
                  onClick={() => {
                    setDropdownOpen(false);
                    onNavigate?.(n.meta);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      setDropdownOpen(false);
                      onNavigate?.(n.meta);
                    }
                  }}
                >
                  <span
                    className={`noti-indicator ${alertIndicatorClass(n.type)}`}
                    aria-hidden="true"
                  />
                  <div className="noti-content">
                    <p>{n.title}</p>
                    <span>
                      {n.body}
                      {n.timeLabel ? ` · ${n.timeLabel}` : ''}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
