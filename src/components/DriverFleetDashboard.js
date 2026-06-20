import React, { useMemo, useState } from 'react';
import { buildDriverFleetRows } from '../utils/driverFleet';

const priorityForBooking = (booking) => {
  if (!booking) return '';
  const t = String(booking.emergency_type || '').toLowerCase();
  if (t.includes('cardiac') || t.includes('trauma')) return 'priority-critical';
  if (t.includes('medical')) return 'priority-high';
  return 'priority-standard';
};

function sourceClinicNameForBooking(booking, driver, clinicList) {
  if (!booking) return 'another clinic';
  const senderId = booking.assigned_clinic_id;
  if (senderId) {
    const sender = clinicList.find((c) => String(c.id) === String(senderId));
    if (sender?.name) return sender.name;
  }
  const baseId = driver?.base_clinic_id;
  if (baseId) {
    const home = clinicList.find((c) => String(c.id) === String(baseId));
    if (home?.name) return home.name;
  }
  return 'another clinic';
}

function FleetDriverCard({ row, expanded, onToggle, onFocusDriver, inbound = false, sourceClinicName = null }) {
  const { driver, activeBooking, status, dotClass, etaLabel, destLabel, hasGps, mapPosition } = row;
  const priority = priorityForBooking(activeBooking);

  return (
    <div
      className={`unit-card-new ${priority} ${expanded ? 'expanded' : ''}${inbound ? ' unit-card-new--inbound' : ''}`}
      style={{ cursor: 'pointer' }}
      onClick={onToggle}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onToggle();
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
            {inbound && sourceClinicName ? (
              <>
                From {sourceClinicName}
                {activeBooking ? ` · ${activeBooking.patient_name || 'Patient'}` : ''}
              </>
            ) : (
              <>
                {status}
                {activeBooking ? ` · ${activeBooking.patient_name || 'Mission'}` : ' · No active mission'}
              </>
            )}
          </div>
        </div>
        <span className={`facility-pill eta ${activeBooking ? '' : 'neutral'}`} style={{ flexShrink: 0 }}>
          {activeBooking ? `ETA ${etaLabel}` : etaLabel}
        </span>
      </div>

      {expanded && (
        <div className="expanded-details" onClick={(e) => e.stopPropagation()}>
          {inbound && sourceClinicName ? (
            <div className="timeline-item">
              <div className="node busy" />
              <div className="timeline-info">
                <strong>Inbound transfer</strong>
                <span>Patient routed from {sourceClinicName}</span>
              </div>
            </div>
          ) : null}

          <div className="timeline-item">
            <div
              className={`node ${dotClass === 'available' ? 'green' : dotClass === 'busy' ? 'busy' : 'offline'}`}
            />
            <div className="timeline-info">
              <strong>{inbound ? 'Ambulance unit' : 'Driver'}</strong>
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
}

const DriverFleetDashboard = ({ drivers, rosterDrivers = null, bookings, clinic, clinics = null, onFocusDriver }) => {
  const [expandedId, setExpandedId] = useState(null);

  const clinicList = clinics?.length ? clinics : clinic ? [clinic] : [];

  const rosterIds = useMemo(
    () => new Set((rosterDrivers ?? drivers).map((d) => d.id)),
    [rosterDrivers, drivers]
  );

  const rows = useMemo(
    () => buildDriverFleetRows(drivers, bookings, clinic, clinics),
    [drivers, bookings, clinic, clinics]
  );

  const rosterRows = useMemo(
    () => buildDriverFleetRows(rosterDrivers ?? drivers, bookings, clinic, clinics),
    [rosterDrivers, drivers, bookings, clinic, clinics]
  );

  const clinicUnitRows = useMemo(
    () => rows.filter((row) => rosterIds.has(row.driver.id)),
    [rows, rosterIds]
  );

  const inboundUnitRows = useMemo(
    () =>
      rows
        .filter((row) => !rosterIds.has(row.driver.id))
        .map((row) => ({
          ...row,
          sourceClinicName: sourceClinicNameForBooking(row.activeBooking, row.driver, clinicList),
        })),
    [rows, rosterIds, clinicList]
  );

  const summary = useMemo(() => {
    const available = rosterRows.filter((r) => r.status.toLowerCase() === 'available').length;
    const busy = rosterRows.filter((r) => r.activeBooking).length;
    return { available, busy, total: rosterRows.length };
  }, [rosterRows]);

  if (clinicUnitRows.length === 0 && inboundUnitRows.length === 0) {
    return (
      <p style={{ color: '#64748b', textAlign: 'center', marginTop: '24px', fontSize: '0.9rem' }}>
        No drivers on this clinic yet. Use the Drivers tab to register ambulance logins.
      </p>
    );
  }

  const toggleRow = (driverId, mapPosition) => {
    setExpandedId((prev) => (prev === driverId ? null : driverId));
    if (mapPosition && onFocusDriver) onFocusDriver(mapPosition, driverId);
  };

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

      {clinicUnitRows.map((row) => (
        <FleetDriverCard
          key={row.driver.id}
          row={row}
          expanded={expandedId === row.driver.id}
          onToggle={() => toggleRow(row.driver.id, row.mapPosition)}
          onFocusDriver={onFocusDriver}
        />
      ))}

      {inboundUnitRows.length > 0 ? (
        <>
          <p className="fleet-inbound-heading">Inbound ambulance</p>
          {inboundUnitRows.map((row) => (
            <FleetDriverCard
              key={row.driver.id}
              row={row}
              expanded={expandedId === row.driver.id}
              onToggle={() => toggleRow(row.driver.id, row.mapPosition)}
              onFocusDriver={onFocusDriver}
              inbound
              sourceClinicName={row.sourceClinicName}
            />
          ))}
        </>
      ) : null}
    </div>
  );
};

export default DriverFleetDashboard;
