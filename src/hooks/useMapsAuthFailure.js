import { useEffect, useState } from 'react';

/**
 * Google calls window.gm_authFailure when the Maps JS API key is rejected
 * (invalid key, referrer mismatch, billing, or API not enabled).
 */
export function useMapsAuthFailure() {
  const [authFailed, setAuthFailed] = useState(false);

  useEffect(() => {
    const previous = window.gm_authFailure;
    window.gm_authFailure = () => setAuthFailed(true);
    return () => {
      if (window.gm_authFailure) window.gm_authFailure = previous;
    };
  }, []);

  return authFailed;
}
