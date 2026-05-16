import React from 'react';

/**
 * Shown when Maps JS fails to load or gm_authFailure fires (gray "Oops!" tile).
 */
const GoogleMapsSetupHelp = ({ title = 'Google Maps could not load', detail = null }) => (
  <div className="loading-screen map-setup-error">
    <h2>{title}</h2>
    {detail ? <p className="facility-muted">{detail}</p> : null}
    <p className="facility-muted">
      Open the browser <strong>Console</strong> (F12) for the exact error, e.g.{' '}
      <code>InvalidKeyMapError</code> or <code>RefererNotAllowedMapError</code>.
    </p>
    <ul className="map-setup-checklist">
      <li>
        <a href="https://console.cloud.google.com/billing" target="_blank" rel="noreferrer">
          Billing
        </a>{' '}
        is enabled on the project (free trial is enough).
      </li>
      <li>
        Enable in{' '}
        <a href="https://console.cloud.google.com/apis/library" target="_blank" rel="noreferrer">
          APIs &amp; Services → Library
        </a>
        : <strong>Maps JavaScript API</strong>, <strong>Places API</strong>, and{' '}
        <strong>Directions API</strong>.
      </li>
      <li>
        In{' '}
        <a href="https://console.cloud.google.com/google/maps-apis/credentials" target="_blank" rel="noreferrer">
          Credentials
        </a>
        , edit your browser key → <strong>Application restrictions</strong> → HTTP referrers. Add the{' '}
        <strong>exact port</strong> from the console error (e.g. if it says port 3001, add):
        <code>http://localhost:3001/*</code>, <code>http://127.0.0.1:3001/*</code> — plus{' '}
        <code>http://localhost:3000/*</code> if you use that port too.
      </li>
      <li>
        Same key → <strong>API restrictions</strong> → restrict key → select at least Maps JavaScript API, Places API,
        Directions API (or “Don’t restrict” while testing).
      </li>
      <li>
        Put the key in <code>web-app/.env</code> as <code>REACT_APP_GOOGLE_MAPS_API_KEY=...</code>, then stop and run{' '}
        <code>npm start</code> again from the <code>web-app</code> folder.
      </li>
    </ul>
  </div>
);

export default GoogleMapsSetupHelp;
