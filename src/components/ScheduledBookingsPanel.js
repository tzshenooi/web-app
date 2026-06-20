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
      if (booking.driver_id) {
        await supabase.from('drivers').update({ status: 'Busy' }).eq('id', booking.driver_id);
      }
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
            <div key={b.id} className="unit-card-new incoming-mission-card scheduled-booking-card">
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

              <div className="scheduled-booking-card__pills">
                <span className="facility-pill facility-pill--sm">{formatScheduledPickup(b.scheduled_at)}</span>
                {b.is_bedridden ? <span className="facility-pill facility-pill--sm">Bedridden</span> : null}
                {assignedName ? (
                  <span className="facility-pill facility-pill--sm">Driver: {assignedName}</span>
                ) : null}
                {b.reporter_user_id ? (
                  <span className="facility-pill facility-pill--sm">Patient request</span>
                ) : null}
              </div>

              {open && (
                <div className="incoming-mission-details scheduled-booking-card__details">
                  <dl className="scheduled-booking-card__meta">
                    <div className="mission-clinical-row mission-clinical-row--multiline">
                      <dt>Pickup</dt>
                      <dd>{b.location || '—'}</dd>
                    </div>
                    <div className="mission-clinical-row">
                      <dt>Patient ID</dt>
                      <dd>{b.patient_id || '—'}</dd>
                    </div>
                    <div className="mission-clinical-row">
                      <dt>Destination</dt>
                      <dd>
                        {destinationLabel(b.destination_type)}
                        {b.hospital_name ? (
                          <>
                            <br />
                            <span className="scheduled-booking-card__dest-name">{b.hospital_name}</span>
                          </>
                        ) : null}
                      </dd>
                    </div>
                    {b.notes ? (
                      <div className="mission-clinical-row mission-clinical-row--multiline">
                        <dt>Notes</dt>
                        <dd className="mission-clinical-row__muted">{b.notes}</dd>
                      </div>
                    ) : null}
                  </dl>

                  {!b.driver_id ? (
                    <div className="scheduled-booking-card__assign">
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
                        className="confirm-btn confirm-btn--no-margin scheduled-booking-card__assign-btn"
                        disabled={busy}
                        onClick={() => handleAssignDriver(b)}
                      >
                        {busy ? 'Saving…' : 'Save assignment'}
                      </button>
                    </div>
                  ) : null}

                  <div className="confirm-btn-row scheduled-booking-card__actions">
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
