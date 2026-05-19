import React from 'react';

function HubIcon({ children }) {
  return <span className="settings-hub__icon">{children}</span>;
}

const LocationIcon = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
    <path
      d="M12 21s6-5.4 6-10a6 6 0 1 0-12 0c0 4.6 6 10 6 10z"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path
      d="M12 13.5A2.5 2.5 0 1 0 12 8.5A2.5 2.5 0 1 0 12 13.5z"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

const DriversIcon = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
    <path
      d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

const ChevronIcon = () => (
  <svg className="settings-hub__chevron" width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
    <path d="M9 6l6 6-6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

function HubRow({ icon, title, description, onClick }) {
  return (
    <button type="button" className="settings-hub__item" onClick={onClick}>
      <HubIcon>{icon}</HubIcon>
      <span className="settings-hub__text">
        <span className="settings-hub__item-title">{title}</span>
        <span className="settings-hub__item-desc">{description}</span>
      </span>
      <ChevronIcon />
    </button>
  );
}

export default function SettingsHub({ onSelectLocation, onSelectDrivers }) {
  return (
    <div className="settings-hub">
      <header className="settings-hub__header">
        <h1 className="settings-hub__title">Settings</h1>
        <p className="settings-hub__subtitle">Manage your facility preferences</p>
      </header>

      <nav className="settings-hub__menu" aria-label="Settings sections">
        <HubRow
          icon={<LocationIcon />}
          title="Facility Location"
          description="Update your facility site and map coordinates"
          onClick={onSelectLocation}
        />
        <HubRow
          icon={<DriversIcon />}
          title="Driver Accounts"
          description="Manage driver access and permissions"
          onClick={onSelectDrivers}
        />
      </nav>
    </div>
  );
}
