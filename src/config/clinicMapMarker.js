/** Red pin (tip at lat/lng) — similar to Google Maps default marker. */
export function getClinicPinIcon(google) {
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="44" height="60" viewBox="0 0 44 60">
      <path fill="#EA4335" stroke="#C5221F" stroke-width="1.2"
        d="M22 0C10.4 0 1 9.4 1 21c0 15.2 21 39 21 39s21-23.8 21-39C43 9.4 33.6 0 22 0z"/>
      <circle fill="#FFFFFF" cx="22" cy="21" r="9"/>
      <path fill="#34A853" d="M22 14v14M15 21h14" stroke="#34A853" stroke-width="2.2" stroke-linecap="round"/>
    </svg>`;
  return {
    url: `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg.trim())}`,
    scaledSize: new google.maps.Size(44, 60),
    anchor: new google.maps.Point(22, 60),
  };
}
