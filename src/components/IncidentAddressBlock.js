import React from 'react';

const PinIcon = () => (
  <svg className="clinical-incident-address__pin" viewBox="0 0 24 24" fill="none" aria-hidden="true">
    <path
      d="M12 21s7-4.35 7-11a7 7 0 1 0-14 0c0 6.65 7 11 7 11z"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinejoin="round"
    />
    <circle cx="12" cy="10" r="2.25" stroke="currentColor" strokeWidth="1.75" />
  </svg>
);

/** Read-only pickup address — styled like other clinical fields. */
const IncidentAddressBlock = ({ address }) => {
  if (!address) return null;

  return (
    <div className="clinical-incident-address">
      <label className="field-label clinical-incident-address__label">Pickup location</label>
      <div className="clinical-incident-address__field" role="text">
        <PinIcon />
        <span className="clinical-incident-address__text">{address}</span>
      </div>
    </div>
  );
};

export default IncidentAddressBlock;
