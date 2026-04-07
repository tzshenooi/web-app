import React, { useEffect, useMemo, useState } from 'react';
import { GoogleMap, Marker, DirectionsRenderer, useJsApiLoader } from '@react-google-maps/api';

const libraries = [];
const defaultCenter = { lat: 5.4136, lng: 100.3293 };

const FacilityMapInner = ({ facilityPos, routes, facilityName }) => {
  const [map, setMap] = useState(null);
  const [directions, setDirections] = useState([]);

  const center = useMemo(() => {
    if (facilityPos) return facilityPos;
    const first = routes.find((r) => r.dest && Number.isFinite(r.dest.lat));
    return first ? first.dest : defaultCenter;
  }, [facilityPos, routes]);

  useEffect(() => {
    if (!window.google || !routes.length) {
      setDirections([]);
      return;
    }
    const ds = new window.google.maps.DirectionsService();
    const valid = routes.filter((r) => r.origin && r.dest);
    if (!valid.length) {
      setDirections([]);
      return;
    }

    let cancelled = false;
    Promise.all(
      valid.map(
        (r) =>
          new Promise((resolve) => {
            ds.route(
              {
                origin: r.origin,
                destination: r.dest,
                travelMode: window.google.maps.TravelMode.DRIVING,
              },
              (result, status) => {
                resolve(status === 'OK' ? { id: r.id, data: result } : null);
              }
            );
          })
      )
    ).then((results) => {
      if (!cancelled) setDirections(results.filter(Boolean));
    });

    return () => {
      cancelled = true;
    };
  }, [routes]);

  useEffect(() => {
    if (!map || !window.google) return;
    const pts = [];
    if (facilityPos) pts.push(facilityPos);
    routes.forEach((r) => {
      if (r.origin) pts.push(r.origin);
      if (r.dest) pts.push(r.dest);
    });
    if (pts.length === 0) return;
    if (pts.length === 1) {
      map.setCenter(pts[0]);
      map.setZoom(14);
      return;
    }
    const bounds = new window.google.maps.LatLngBounds();
    pts.forEach((p) => bounds.extend(p));
    map.fitBounds(bounds, { top: 40, right: 40, bottom: 40, left: 40 });
  }, [map, facilityPos, routes]);

  return (
    <GoogleMap
      mapContainerStyle={{ width: '100%', height: '100%' }}
      center={center}
      zoom={12}
      onLoad={setMap}
      options={{
        disableDefaultUI: true,
        zoomControl: true,
        gestureHandling: 'greedy',
      }}
    >
      {facilityPos && (
        <Marker
          position={facilityPos}
          title={facilityName || 'Facility'}
          icon={{ url: 'https://img.icons8.com/color/48/hospital-sign.png' }}
        />
      )}
      {routes.map((r) =>
        r.origin ? (
          <Marker
            key={`amb-${r.id}`}
            position={r.origin}
            title={r.title || 'Ambulance'}
            icon={{ url: 'https://img.icons8.com/emoji/48/ambulance-emoji.png' }}
          />
        ) : null
      )}
      {!facilityPos &&
        routes.map((r) => (
          <Marker
            key={`dest-${r.id}`}
            position={r.dest}
            title="Inbound destination"
            icon={{ url: 'https://img.icons8.com/color/96/sos.png' }}
          />
        ))}
      {directions.map((d) => (
        <DirectionsRenderer
          key={d.id}
          directions={d.data}
          options={{
            suppressMarkers: true,
            polylineOptions: { strokeColor: '#3b82f6', strokeWeight: 5, strokeOpacity: 0.85 },
          }}
        />
      ))}
    </GoogleMap>
  );
};

const FacilityMapView = (props) => {
  const { isLoaded, loadError } = useJsApiLoader({
    googleMapsApiKey: 'AIzaSyA4N7C2qiLgqaHsYWpxltHI4UvWyx1G-bo',
    libraries,
  });

  if (loadError) {
    return <p className="facility-muted">Map could not load. Check API key and network.</p>;
  }
  if (!isLoaded) {
    return <p className="facility-muted">Loading map…</p>;
  }
  return <FacilityMapInner {...props} />;
};

export default FacilityMapView;
