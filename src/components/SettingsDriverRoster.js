import React from 'react';
import { formatDriverStatus, statusDotClass } from '../utils/driverFleet';

function driverInitial(name) {
  const parts = String(name || 'D')
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
  return (parts[0]?.[0] ?? 'D').toUpperCase();
}

/**
 * Driver list + remove — Settings › Driver Accounts.
 */
export default function SettingsDriverRoster({
  drivers,
  removingDriverId,
  onRemoveDriver,
  maxDrivers,
}) {
  const count = drivers.length;

  return (
    <section className="settings-card settings-card--flat settings-drivers-panel">
      <div className="settings-card__body">
        <p className="settings-drivers-count">
          <strong>{count}</strong> of {maxDrivers} registered
        </p>

        {count === 0 ? (
          <div className="settings-empty">
            <p className="settings-empty__title">No drivers yet</p>
            <p className="settings-empty__text">Add drivers from the roster icon in the sidebar.</p>
          </div>
        ) : (
          <ul className="settings-driver-list">
            {drivers.map((d) => {
              const badge = statusDotClass(d.status);
              return (
                <li key={d.id} className="settings-driver-card">
                  <div className="settings-driver-card__top">
                    <span className="settings-driver-card__avatar" aria-hidden="true">
                      {driverInitial(d.name)}
                    </span>
                    <div className="settings-driver-card__info">
                      <p className="settings-driver-card__name">{d.name || 'Driver'}</p>
                      <p className="settings-driver-card__email">{d.email || 'No email on file'}</p>
                    </div>
                    <span className={`settings-driver-badge settings-driver-badge--${badge}`}>
                      {formatDriverStatus(d.status)}
                    </span>
                  </div>
                  <button
                    type="button"
                    className="confirm-btn confirm-btn--outline confirm-btn--danger"
                    disabled={removingDriverId === d.id}
                    onClick={() => onRemoveDriver(d)}
                  >
                    {removingDriverId === d.id ? 'Removing…' : 'Remove from clinic'}
                  </button>
                </li>
              );
            })}
          </ul>
        )}

        <p className="settings-hint settings-hint--muted settings-hint--footer">
          Removal deletes their app login. They must have no open mission.
        </p>
      </div>
    </section>
  );
}
