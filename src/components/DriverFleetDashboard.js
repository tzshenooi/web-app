import React, { useMemo, useState } from 'react';
import { buildDriverFleetRows } from '../utils/driverFleet';

const priorityForBooking = (booking) => {
  if (!booking) return '';
  const t = String(booking.emergency_type || '').toLowerCase();
  if (t.includes('cardiac') || t.includes('trauma')) return 'priority-critical';
  if (t.includes('medical')) return 'priority-high';
  return 'priority-standard';
};

const DriverFleetDashboard = ({ drivers, bookings, clinic, clinics = null, onFocusDriver }) => {
  const [expandedId, setExpandedId] = useState(null);

  const rows = useMemo(
    () => buildDriverFleetRows(drivers, bookings, clinic, clinics),
    [drivers, bookings, clinic, clinics]
  );

  const summary = useMemo(() => {
    const available = rows.filter((r) => r.status.toLowerCase() === 'available').length;
    const busy = rows.filter((r) => r.activeBooking).length;
    return { available, busy, total: rows.length };
  }, [rows]);

  if (rows.length === 0) {
    return (
      <p style={{ color: '#64748b', textAlign: 'center', marginTop: '24px', fontSize: '0.9rem' }}>
        No drivers on this clinic yet. Use the Drivers tab to register ambulance logins.
      </p>
    );
  }

  return (
    <div className="fleet-list-container">
      <p className="facility-section-subtitle" style={{ marginTop: 0 }}>
        Live roster — status and ETA refresh every few seconds. Tap a unit to expand or focus the map.
      </p>
      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '4px' }}>
        <span className="facility-pill neutral">{summary.total} driver{summary.total !== 1 ? 's' : ''}</span>
        <span className="facility-pill" style={{ background: 'rgba(16,185,129,0.12)', color: '#059669' }}>
          {summary.available} available
        </span>
        <span className="facility-pill" style={{ background: 'rgba(245,158,11,0.12)', color: '#d97706' }}>
          {summary.busy} on mission
        </span>
      </div>

      {rows.map((row) => {
        const { driver, activeBooking, status, dotClass, etaLabel, destLabel, hasGps, mapPosition } = row;
        const expanded = expandedId === driver.id;
        const priority = priorityForBooking(activeBooking);

        const toggle = () => {
          setExpandedId((prev) => (prev === driver.id ? null : driver.id));
          if (mapPosition && onFocusDriver) onFocusDriver(mapPosition, driver.id);
        };

        return (
          <div
            key={driver.id}
            className={`unit-card-new ${priority} ${expanded ? 'expanded' : ''}`}
            style={{ cursor: 'pointer' }}
            onClick={toggle}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                toggle();
              }
            }}
            role="button"
            tabIndex={0}
          >
            <div className="card-main-content">
              <span className={`status-dot ${dotClass}`} aria-hidden />
              <div className="unit-icon-bg" aria-hidden>
                🚑
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div className="unit-name-text">{driver.name || 'Driver'}</div>
                <div className="unit-sub-text">
                  {status}
                  {activeBooking ? ` · ${activeBooking.patient_name || 'Mission'}` : ' · No active mission'}
                </div>
              </div>
              <span className={`facility-pill eta ${activeBooking ? '' : 'neutral'}`} style={{ flexShrink: 0 }}>
                {activeBooking ? `ETA ${etaLabel}` : etaLabel}
              </span>
            </div>

            {expanded && (
              <div className="expanded-details" onClick={(e) => e.stopPropagation()}>
                <div className="timeline-item">
                  <div
                    className={`node ${dotClass === 'available' ? 'green' : dotClass === 'busy' ? 'busy' : 'offline'}`}
                  />
                  <div className="timeline-info">
                    <strong>Driver</strong>
                    <span>{driver.email || '—'}</span>
                    <span>{hasGps ? 'GPS live on map' : 'No GPS — open driver app while on duty'}</span>
                  </div>
                </div>

                {activeBooking ? (
                  <>
                    <div className="timeline-item">
                      <div className="node busy" />
                      <div className="timeline-info">
                        <strong>Active mission</strong>
                        <span>
                          {activeBooking.patient_name || 'Patient'} — {activeBooking.status}
                        </span>
                        <span>{activeBooking.location || destLabel || '—'}</span>
                      </div>
                    </div>
                    <div className="timeline-item" style={{ borderLeft: 'none', paddingBottom: 0 }}>
                      <div className="timeline-info">
                        <strong>Estimated arrival</strong>
                        <span className="live-eta">{etaLabel}</span>
                        {destLabel ? <span>To: {destLabel}</span> : null}
                      </div>
                    </div>
                    {mapPosition && onFocusDriver ? (
                      <button
                        type="button"
                        className="trip-btn-ref active-trip"
                        style={{ marginTop: '10px' }}
                        onClick={() => onFocusDriver(mapPosition, driver.id)}
                      >
                        Focus on map
                      </button>
                    ) : null}
                  </>
                ) : (
                  <div className="timeline-item" style={{ borderLeft: 'none', paddingBottom: 0 }}>
                    <div className="timeline-info">
                      <strong>Standby</strong>
                      <span>Ready for dispatch when status is Available in the mobile app.</span>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};

export default DriverFleetDashboard;
