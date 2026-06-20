/** Push alerts into the clinic notification bell from outside the hook (e.g. inbound broadcast). */
export function pushClinicAlert(item) {
  if (typeof window === 'undefined' || !item?.key) return;
  window.dispatchEvent(new CustomEvent('clinic-alert', { detail: item }));
}

export function onClinicAlert(handler) {
  if (typeof window === 'undefined') return () => {};
  const fn = (e) => handler(e.detail);
  window.addEventListener('clinic-alert', fn);
  return () => window.removeEventListener('clinic-alert', fn);
}
