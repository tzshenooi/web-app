import React, { useMemo } from 'react';
import ArchiveMissionCard from './ArchiveMissionCard';
import { scopeBookingToClinic } from '../utils/scopeClinicBooking';

const ClinicRecordsArchive = ({ bookings, drivers, clinicId }) => {
  const driverIds = useMemo(() => drivers.map((d) => d.id), [drivers]);
  const driverById = useMemo(() => Object.fromEntries(drivers.map((d) => [d.id, d])), [drivers]);

  const records = useMemo(() => {
    return bookings
      .filter((b) => b.status === 'Completed' && scopeBookingToClinic(b, clinicId, driverIds))
      .sort((a, b) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime());
  }, [bookings, clinicId, driverIds]);

  return (
    <div className="fleet-list-container clinic-records-archive">
      <p className="facility-section-subtitle" style={{ marginTop: 0 }}>
        Finished dispatches stay here for your records. Active jobs remain on Incoming until the driver completes
        discharge.
      </p>
      {records.length === 0 ? (
        <p style={{ color: '#64748b', textAlign: 'center', marginTop: '12px', fontSize: '0.9rem' }}>
          No completed missions yet.
        </p>
      ) : (
        records.map((b) => (
          <ArchiveMissionCard
            key={b.id}
            booking={b}
            driverName={b.driver_id ? driverById[b.driver_id]?.name || 'Driver' : null}
          />
        ))
      )}
    </div>
  );
};

export default ClinicRecordsArchive;
