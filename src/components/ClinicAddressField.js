import React, { useCallback, useEffect, useId, useRef, useState } from 'react';
import { loadGoogleMapScript } from 'react-google-autocomplete/lib/utils';
import { GOOGLE_MAPS_API_KEY } from '../config/googleMaps';
import { fetchGooglePlaceDetails, resolveGooglePlaceAddress } from '../utils/resolvePlaceName';

const GOOGLE_SCRIPT_BASE = 'https://maps.googleapis.com/maps/api/js';
const MALAYSIA_BIAS = { lat: 4.2105, lng: 101.9758 };
const SEARCH_DEBOUNCE_MS = 250;
const SEARCH_TIMEOUT_MS = 10000;

function placeStatusMessage(status) {
  const g = window.google;
  if (!g?.maps?.places?.PlacesServiceStatus) return null;
  const S = g.maps.places.PlacesServiceStatus;
  if (status === S.REQUEST_DENIED) {
    return 'Places API access denied — enable Places API and check your browser key restrictions.';
  }
  if (status === S.OVER_QUERY_LIMIT) return 'Search limit reached — wait a moment and try again.';
  if (status === S.INVALID_REQUEST) return 'Could not run search — try a longer name or address.';
  if (status === S.UNKNOWN_ERROR) return 'Search failed — try again.';
  return null;
}

/**
 * Google Places search → formatted address + lat/lng for clinics.
 * Uses AutocompleteService (no type filter) so clinic names and street addresses both match.
 * @param {'full'|'pin-only'|'none'} previewMode — full: address + coords; pin-only: coords chip only; none: hidden
 */
const ClinicAddressField = ({
  value,
  onPlaceSelected,
  inputClassName = 'auth-input',
  placeholder = 'Search clinic address…',
  disabled = false,
  inputId,
  previewMode = 'full',
}) => {
  const listId = useId();
  const rootRef = useRef(null);
  const autocompleteServiceRef = useRef(null);
  const debounceTimerRef = useRef(null);
  const searchTimeoutRef = useRef(null);
  const requestIdRef = useRef(0);
  const pendingQueryRef = useRef('');

  const [inputValue, setInputValue] = useState(value?.address ?? '');
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const [selecting, setSelecting] = useState(false);
  const [mapsReady, setMapsReady] = useState(false);
  const [mapsError, setMapsError] = useState(null);
  const [predictions, setPredictions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [statusMessage, setStatusMessage] = useState('');

  useEffect(() => {
    if (!GOOGLE_MAPS_API_KEY) return undefined;

    let cancelled = false;
    const scriptUrl = `${GOOGLE_SCRIPT_BASE}?libraries=places&key=${encodeURIComponent(GOOGLE_MAPS_API_KEY)}`;
    const loadTimeout = setTimeout(() => {
      if (!cancelled && !autocompleteServiceRef.current) {
        setMapsError(
          'Google Maps took too long to load. Check REACT_APP_GOOGLE_MAPS_API_KEY and enable Places API.'
        );
      }
    }, 15000);

    loadGoogleMapScript(GOOGLE_SCRIPT_BASE, scriptUrl)
      .then(() => {
        if (cancelled) return;
        if (!window.google?.maps?.places?.AutocompleteService) {
          setMapsError('Google Places API did not load. Enable Places API on your Google Cloud key.');
          return;
        }
        autocompleteServiceRef.current = new window.google.maps.places.AutocompleteService();
        setMapsReady(true);
      })
      .catch(() => {
        if (!cancelled) {
          setMapsError('Could not load Google Maps. Check your API key and restart the dev server.');
        }
      })
      .finally(() => {
        clearTimeout(loadTimeout);
      });

    return () => {
      cancelled = true;
      clearTimeout(loadTimeout);
    };
  }, []);

  useEffect(() => {
    setInputValue(value?.address ?? '');
  }, [value?.address]);

  useEffect(() => {
    const onPointerDown = (event) => {
      if (!rootRef.current?.contains(event.target)) {
        setOpen(false);
        setActiveIndex(-1);
      }
    };
    document.addEventListener('pointerdown', onPointerDown);
    return () => document.removeEventListener('pointerdown', onPointerDown);
  }, []);

  const clearSearchTimers = useCallback(() => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
      debounceTimerRef.current = null;
    }
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
      searchTimeoutRef.current = null;
    }
  }, []);

  const runSearch = useCallback(
    (text) => {
      const trimmed = text.trim();
      pendingQueryRef.current = trimmed;
      clearSearchTimers();
      const requestId = ++requestIdRef.current;

      if (!trimmed) {
        setPredictions([]);
        setLoading(false);
        setStatusMessage('');
        return;
      }

      if (!mapsReady || !autocompleteServiceRef.current) {
        setLoading(true);
        setPredictions([]);
        setStatusMessage('Loading maps…');
        return;
      }

      setLoading(true);
      setStatusMessage('');

      debounceTimerRef.current = setTimeout(() => {
        const g = window.google;
        const location = new g.maps.LatLng(MALAYSIA_BIAS.lat, MALAYSIA_BIAS.lng);

        searchTimeoutRef.current = setTimeout(() => {
          if (requestId !== requestIdRef.current) return;
          setLoading(false);
          setStatusMessage('Search timed out — try again.');
        }, SEARCH_TIMEOUT_MS);

        autocompleteServiceRef.current.getPlacePredictions(
          {
            input: trimmed,
            componentRestrictions: { country: 'my' },
            location,
            radius: 600000,
          },
          (results, status) => {
            if (requestId !== requestIdRef.current) return;
            clearTimeout(searchTimeoutRef.current);
            searchTimeoutRef.current = null;
            setLoading(false);

            const S = g.maps.places.PlacesServiceStatus;
            if (status === S.OK && Array.isArray(results)) {
              setPredictions(results);
              setStatusMessage('');
              return;
            }

            setPredictions([]);
            if (status === S.ZERO_RESULTS) {
              setStatusMessage('No matches — try the full clinic name, street, or nearby landmark.');
              return;
            }

            setStatusMessage(placeStatusMessage(status) || 'Search failed — try again.');
          }
        );
      }, SEARCH_DEBOUNCE_MS);
    },
    [clearSearchTimers, mapsReady]
  );

  useEffect(() => {
    if (mapsReady && pendingQueryRef.current) {
      runSearch(pendingQueryRef.current);
    }
  }, [mapsReady, runSearch]);

  useEffect(() => () => clearSearchTimers(), [clearSearchTimers]);

  const selectPrediction = async (prediction) => {
    if (!prediction?.place_id || selecting) return;
    setSelecting(true);
    setOpen(false);
    setActiveIndex(-1);

    try {
      const details = await fetchGooglePlaceDetails(prediction.place_id);
      const location = details?.geometry?.location;
      if (!location) return;

      const latFn = location.lat;
      const lngFn = location.lng;
      const latitude = typeof latFn === 'function' ? latFn() : location.lat;
      const longitude = typeof lngFn === 'function' ? lngFn() : location.lng;
      if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return;

      const address =
        resolveGooglePlaceAddress(details, prediction.description) ||
        prediction.description ||
        '';

      setInputValue(address);
      pendingQueryRef.current = '';
      setPredictions([]);
      setStatusMessage('');
      onPlaceSelected({ address, latitude, longitude });
    } finally {
      setSelecting(false);
    }
  };

  const handleInputChange = (event) => {
    const next = event.target.value;
    setInputValue(next);
    setOpen(true);
    setActiveIndex(-1);
    runSearch(next);
  };

  const handleInputFocus = () => {
    if (inputValue.trim()) {
      setOpen(true);
      runSearch(inputValue);
    }
  };

  const handleKeyDown = (event) => {
    if (!open || predictions.length === 0) return;

    if (event.key === 'ArrowDown') {
      event.preventDefault();
      setActiveIndex((index) => Math.min(index + 1, predictions.length - 1));
      return;
    }
    if (event.key === 'ArrowUp') {
      event.preventDefault();
      setActiveIndex((index) => Math.max(index - 1, 0));
      return;
    }
    if (event.key === 'Enter' && activeIndex >= 0) {
      event.preventDefault();
      selectPrediction(predictions[activeIndex]);
      return;
    }
    if (event.key === 'Escape') {
      setOpen(false);
      setActiveIndex(-1);
    }
  };

  if (!GOOGLE_MAPS_API_KEY) {
    return (
      <p className="facility-muted" style={{ fontSize: '0.85rem' }}>
        Add <code>REACT_APP_GOOGLE_MAPS_API_KEY</code> to <code>web-app/.env</code> to search addresses.
      </p>
    );
  }

  if (mapsError) {
    return (
      <p className="facility-muted" style={{ fontSize: '0.85rem', color: '#b91c1c' }}>
        {mapsError}
      </p>
    );
  }

  const hasCoords =
    value?.address &&
    Number.isFinite(value.latitude) &&
    Number.isFinite(value.longitude);

  const inputStyle =
    inputClassName === 'modern-input' || inputClassName === 'settings-input'
      ? { width: '100%', marginBottom: 0 }
      : undefined;

  const showSuggestions = open && inputValue.trim().length > 0;
  const emptyMessage =
    statusMessage || 'No matches — try the full clinic name, street, or nearby landmark.';

  return (
    <div className="clinic-address-field" ref={rootRef}>
      <input
        id={inputId}
        className={inputClassName}
        type="text"
        role="combobox"
        aria-expanded={showSuggestions}
        aria-controls={listId}
        aria-autocomplete="list"
        autoComplete="off"
        value={inputValue}
        onChange={handleInputChange}
        onFocus={handleInputFocus}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        disabled={disabled || selecting}
        style={inputStyle}
      />
      {showSuggestions ? (
        <ul id={listId} className="clinic-address-suggestions" role="listbox">
          {loading ? (
            <li className="clinic-address-suggestions__status" role="presentation">
              {statusMessage || 'Searching…'}
            </li>
          ) : null}
          {!loading && predictions.length === 0 ? (
            <li className="clinic-address-suggestions__status" role="presentation">
              {emptyMessage}
            </li>
          ) : null}
          {!loading
            ? predictions.map((prediction, index) => (
                <li key={prediction.place_id} role="presentation">
                  <button
                    type="button"
                    role="option"
                    aria-selected={index === activeIndex}
                    className={`clinic-address-suggestions__item${
                      index === activeIndex ? ' clinic-address-suggestions__item--active' : ''
                    }`}
                    onMouseDown={(event) => event.preventDefault()}
                    onClick={() => selectPrediction(prediction)}
                  >
                    <span className="clinic-address-suggestions__main">
                      {prediction.structured_formatting?.main_text || prediction.description}
                    </span>
                    {prediction.structured_formatting?.secondary_text ? (
                      <span className="clinic-address-suggestions__secondary">
                        {prediction.structured_formatting.secondary_text}
                      </span>
                    ) : null}
                  </button>
                </li>
              ))
            : null}
        </ul>
      ) : null}
      {previewMode === 'full' && value?.address ? (
        <p className="facility-muted" style={{ marginTop: 8, fontSize: '0.85rem', lineHeight: 1.4 }}>
          {value.address}
          {hasCoords ? (
            <>
              <br />
              <span style={{ opacity: 0.85 }}>
                {Number(value.latitude).toFixed(5)}, {Number(value.longitude).toFixed(5)}
              </span>
            </>
          ) : null}
        </p>
      ) : null}
      {previewMode === 'pin-only' && hasCoords ? (
        <div className="settings-pin-chip" role="status">
          <span className="settings-pin-chip__dot" aria-hidden="true" />
          <span className="settings-pin-chip__coords">
            {Number(value.latitude).toFixed(5)}, {Number(value.longitude).toFixed(5)}
          </span>
        </div>
      ) : null}
    </div>
  );
};

export default ClinicAddressField;
