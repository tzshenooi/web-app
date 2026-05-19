import React, { useMemo, useState } from 'react';
import { supabase } from '../supabaseClient';
import {
  UNKNOWN_PATIENT_ID,
  destinationLabel,
  formatScheduledPickup,
  isScheduledBooking,
} from '../constants/missionClinical';
import { scopeBookingToClinic } from '../utils/scopeClinicBooking';

const ScheduledBookingsPanel = ({
  clinicId,
  bookings = [],
  drivers = [],
  onActivate,
  onCancel,
  onBookNew,
}) => {
  const [openId, setOpenId] = useState(null);
  const [busyId, setBusyId] = useState(null);
  const [assignDriverId, setAssignDriverId] = useState({});

  const driverIds = useMemo(() => drivers.map((d) => d.id), [drivers]);
  const driverNameById = useMemo(() => {
    const m = {};
    drivers.forEach((d) => {
      m[d.id] = d.name || d.email || 'Driver';
    });
    return m;
  }, [drivers]);

  const scheduled = useMemo(() => {
    if (!clinicId) return [];
    return bookings
      .filter((b) => isScheduledBooking(b) && scopeBookingToClinic(b, clinicId, driverIds))
      .sort((a, b) => {
        const ta = a.scheduled_at ? new Date(a.scheduled_at).getTime() : 0;
        const tb = b.scheduled_at ? new Date(b.scheduled_at).getTime() : 0;
        return ta - tb;
      });
  }, [bookings, clinicId, driverIds]);

  const handleCancel = async (booking) => {
    if (!window.confirm(`Cancel scheduled transport for ${booking.patient_name}?`)) return;
    setBusyId(booking.id);
    try {
      const { error } = await supabase.from('bookings').update({ status: 'Cancelled' }).eq('id', booking.id);
      if (error) throw error;
      if (onCancel) onCancel();
    } catch (err) {
      alert(err.message || 'Could not cancel booking.');
    } finally {
      setBusyId(null);
    }
  };

  const handleAssignDriver = async (booking) => {
    const chosen = assignDriverId[booking.id];
    if (!chosen) {
      alert('Select a driver to assign.');
      return;
    }
    setBusyId(booking.id);
    try {
      const { error } = await supabase
        .from('bookings')
        .update({
          driver_id: chosen,
          scheduled_driver_acknowledged_at: null,
        })
        .eq('id', booking.id);
      if (error) throw error;
      if (onActivate) onActivate(booking);
    } catch (err) {
      alert(err.message || 'Could not assign driver.');
    } finally {
      setBusyId(null);
    }
  };

  const handleStartMission = async (booking) => {
    if (!booking.driver_id) {
      alert('Assign a driver first.');
      return;
    }
    const pickup = booking.scheduled_at ? new Date(booking.scheduled_at) : null;
    if (pickup && pickup.getTime() > Date.now()) {
      const ok = window.confirm(
        `Pickup is planned for ${formatScheduledPickup(booking.scheduled_at)}. Start the mission now anyway?`
      );
      if (!ok) return;
    }

    let patientId = booking.patient_id?.trim() || '';
    if (!patientId) {
      const ok = window.confirm('Patient ID is missing. Dispatch with UNKNOWN and update later?');
      if (!ok) return;
      patientId = UNKNOWN_PATIENT_ID;
    }

    setBusyId(booking.id);
    try {
      const { error } = await supabase
        .from('bookings')
        .update({
          status: 'Pending',
          patient_id: patientId,
          booking_kind: 'emergency',
          requested_at: new Date().toISOString(),
          scheduled_driver_acknowledged_at: new Date().toISOString(),
        })
        .eq('id', booking.id);
      if (error) throw error;
      if (onActivate) onActivate(booking);
    } catch (err) {
      alert(err.message || 'Could not start mission.');
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="fleet-list-container">
      <div className="scheduled-panel__actions">
        <button type="button" className="confirm-btn scheduled-panel__book-btn" onClick={onBookNew}>
          + Book transport
        </button>
      </div>

      {scheduled.length === 0 ? (
        <p style={{ color: '#64748b', textAlign: 'center', marginTop: 24, fontSize: '0.9rem' }}>
          No scheduled bookings. Plan bedridden or follow-up transport here or from the patient app.
        </p>
      ) : (
        scheduled.map((b) => {
          const open = openId === b.id;
          const busy = busyId === b.id;
          const assignedName = b.driver_id ? driverNameById[b.driver_id] : null;
          return (
            <div key={b.id} className="unit-card-new incoming-mission-card" style={{ cursor: 'default', marginBottom: 10 }}>
              <button
                type="button"
                className="incoming-mission-name-row"
                onClick={() => setOpenId(open ? null : b.id)}
                aria-expanded={open}
              >
                <strong className="unit-name-text">{b.patient_name || 'Patient'}</strong>
                <span className="incoming-mission-chevron" aria-hidden="true">
                  {open ? '▾' : '▸'}
                </span>
              </button>

              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 8, padding: '0 4px' }}>
                <span className="facility-pill">{formatScheduledPickup(b.scheduled_at)}</span>
                {b.is_bedridden ? <span className="facility-pill">Bedridden</span> : null}
                {assignedName ? <span className="facility-pill">Driver: {assignedName}</span> : null}
                {b.reporter_user_id ? <span className="facility-pill">Patient request</span> : null}
              </div>

              {open && (
                <div className="incoming-mission-details">
                  <p className="facility-muted" style={{ fontSize: '0.85rem', margin: '8px 0' }}>
                    {b.location || '—'}
                  </p>
                  <p className="facility-muted" style={{ fontSize: '0.82rem', margin: '0 0 10px' }}>
                    ID: {b.patient_id || '—'} · Destination: {destinationLabel(b.destination_type)}
                    {b.hospital_name ? ` · ${b.hospital_name}` : ''}
                  </p>
                  {b.notes ? (
                    <p className="facility-muted" style={{ fontSize: '0.82rem', marginBottom: 10 }}>
                      {b.notes}
                    </p>
                  ) : null}

                  {!b.driver_id ? (
                    <div style={{ marginBottom: 10 }}>
                      <label className="field-label">Assign driver</label>
                      <select
                        className="modern-select"
                        value={assignDriverId[b.id] || ''}
                        onChange={(e) =>
                          setAssignDriverId((prev) => ({ ...prev, [b.id]: e.target.value }))
                        }
                      >
                        <option value="">Select…</option>
                        {drivers.map((d) => (
                          <option key={d.id} value={d.id}>
                            {d.name || d.email} ({d.status})
                          </option>
                        ))}
                      </select>
                      <button
                        type="button"
                        className="confirm-btn confirm-btn--no-margin"
                        style={{ marginTop: 8 }}
                        disabled={busy}
                        onClick={() => handleAssignDriver(b)}
                      >
                        {busy ? 'Saving…' : 'Save assignment'}
                      </button>
                    </div>
                  ) : null}

                  <div className="confirm-btn-row">
                    {b.driver_id ? (
                      <button
                        type="button"
                        className="confirm-btn"
                        disabled={busy}
                        onClick={() => handleStartMission(b)}
                      >
                        {busy ? 'Starting…' : 'Start mission now'}
                      </button>
                    ) : null}
                    <button
                      type="button"
                      className="confirm-btn confirm-btn--outline"
                      disabled={busy}
                      onClick={() => handleCancel(b)}
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}
            </div>
          );
        })
      )}
    </div>
  );
};

export default ScheduledBookingsPanel;
