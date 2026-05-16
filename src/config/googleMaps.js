/** Browser key for Maps JavaScript API + Places. Set REACT_APP_GOOGLE_MAPS_API_KEY in web-app/.env */
const raw = process.env.REACT_APP_GOOGLE_MAPS_API_KEY || '';
export const GOOGLE_MAPS_API_KEY = raw.trim().replace(/\uFEFF/g, '');

/** Optional vector map ID (Google Cloud → Map Management). Richer tiles than legacy embed. */
export const GOOGLE_MAPS_MAP_ID = (process.env.REACT_APP_GOOGLE_MAP_ID || '').trim();

const looksValid = /^AIza[\w-]{30,40}$/.test(GOOGLE_MAPS_API_KEY);

if (process.env.NODE_ENV === 'development' && GOOGLE_MAPS_API_KEY) {
  const tail = GOOGLE_MAPS_API_KEY.slice(-6);
  if (!looksValid) {
    console.warn(
      `[Maps] API key format looks wrong (loaded …${tail}, length ${GOOGLE_MAPS_API_KEY.length}). ` +
        'Copy from Google Cloud → Show key into web-app/.env, then stop and restart npm start.'
    );
  } else {
    console.info(`[Maps] API key loaded (…${tail}). If the map still fails, restart npm start after editing .env.`);
  }
}

if (process.env.NODE_ENV === 'development' && !GOOGLE_MAPS_API_KEY) {
  console.error(
    '[Maps] REACT_APP_GOOGLE_MAPS_API_KEY is empty. Create web-app/.env and restart npm start from the web-app folder.'
  );
}
