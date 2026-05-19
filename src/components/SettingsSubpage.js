import React from 'react';

const BackIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
    <path
      d="M15 6l-6 6 6 6"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

/**
 * Settings detail screen — back control, title, and content card.
 */
export default function SettingsSubpage({ title, description, onBack, children }) {
  return (
    <div className="settings-subpage">
      <button type="button" className="settings-subpage__back" onClick={onBack}>
        <BackIcon />
        <span>Settings</span>
      </button>
      <header className="settings-subpage__head">
        <h1 className="settings-subpage__title">{title}</h1>
        {description ? <p className="settings-subpage__desc">{description}</p> : null}
      </header>
      <div className="settings-subpage__body">{children}</div>
    </div>
  );
}
