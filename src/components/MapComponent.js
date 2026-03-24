import React, { useEffect, useState, useCallback } from 'react';
import { GoogleMap, Marker, DirectionsRenderer, TrafficLayer, InfoWindow } from '@react-google-maps/api';
import { supabase } from '../supabaseClient';

const containerStyle = { width: '100%', height: '100%' };
const initialCenter = { lat: 5.5135, lng: 100.5400 }; 

// ADDED: showTraffic prop here
const MapComponent = ({ previewLocation, mapFocus, showHospitals, showTraffic }) => {
  const [map, setMap] = useState(null);
  const [drivers, setDrivers] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [hospitals, setHospitals] = useState([]); 
  const [allDirections, setAllDirections] = useState([]);
  const [selectedHospital, setSelectedHospital] = useState(null); 

  const syncMapData = useCallback(async () => {
    const { data: drv } = await supabase.from('drivers').select('*');
    const { data: bkg } = await supabase.from('bookings').select('*').eq('status', 'Pending');
    const { data: hosp } = await supabase.from('hospitals').select('*');
    
    if (drv) setDrivers(drv);
    if (bkg) setBookings(bkg);
    if (hosp) setHospitals(hosp);
  }, []);

  useEffect(() => {
    syncMapData();
    const interval = setInterval(syncMapData, 3000);
    return () => clearInterval(interval);
  }, [syncMapData]);

  useEffect(() => {
    if (map && mapFocus) {
      map.panTo({ lat: mapFocus.lat, lng: mapFocus.lng });
      map.setZoom(17); 
    }
  }, [mapFocus, map]);

  useEffect(() => {
    if (!window.google || drivers.length === 0) return;
    const ds = new window.google.maps.DirectionsService();
    const requests = [];

    if (previewLocation) {
      const nearest = drivers.reduce((prev, curr) => {
        const dist = (d) => Math.sqrt(Math.pow(d.current_lat - previewLocation.lat, 2) + Math.pow(d.current_lng - previewLocation.lng, 2));
        return dist(curr) < dist(prev) ? curr : prev;
      });
      requests.push({ id: 'preview', origin: { lat: nearest.current_lat, lng: nearest.current_lng }, destination: { lat: previewLocation.lat, lng: previewLocation.lng } });
    }

    bookings.forEach(b => {
      let assigned = drivers.find(d => d.id === b.driver_id);
      if (assigned) {
        requests.push({ id: b.id, origin: { lat: assigned.current_lat, lng: assigned.current_lng }, destination: { lat: b.latitude, lng: b.longitude } });
      }
    });

    const fetchRoutes = async () => {
      const results = await Promise.all(requests.map(req => 
        new Promise(res => ds.route({ origin: req.origin, destination: req.destination, travelMode: 'DRIVING' }, (r, s) => res(s === 'OK' ? { id: req.id, data: r } : null)))
      ));
      setAllDirections(results.filter(r => r !== null));
    };
    fetchRoutes();
  }, [previewLocation, bookings, drivers]);

  return (
    <GoogleMap 
      mapContainerStyle={containerStyle} 
      center={initialCenter} 
      zoom={14} 
      onLoad={setMap}
      options={{ styles: [], disableDefaultUI: true, zoomControl: true, preserveViewport: true, gestureHandling: 'greedy' }}
    >
      {/* FIXED: Conditional rendering with a unique key to force a refresh */}
      {showTraffic ? <TrafficLayer key="traffic-active" /> : null}

      {allDirections.map(route => (
        <DirectionsRenderer 
          key={route.id} 
          directions={route.data} 
          options={{ suppressMarkers: true, preserveViewport: true, polylineOptions: { strokeColor: "#4285F4", strokeWeight: 6, strokeOpacity: 0.7 } }} 
        />
      ))}

      {drivers.map(d => (
        <Marker 
          key={`d-${d.id}`} 
          position={{ lat: d.current_lat, lng: d.current_lng }} 
          icon={{ url: 'https://img.icons8.com/emoji/48/ambulance-emoji.png', scaledSize: new window.google.maps.Size(40, 40) }} 
        />
      ))}

      {bookings.map(b => (
        <Marker 
          key={`b-${b.id}`} 
          position={{ lat: b.latitude, lng: b.longitude }} 
          icon={{ url: 'https://img.icons8.com/color/96/sos.png', scaledSize: new window.google.maps.Size(55, 55) }} 
        />
      ))}

      {showHospitals && hospitals.map(h => (
        <Marker 
          key={`h-${h.id}`} 
          position={{ lat: h.latitude, lng: h.longitude }} 
          onClick={() => setSelectedHospital(h)} 
          icon={{ url: 'https://img.icons8.com/color/48/hospital-sign.png', scaledSize: new window.google.maps.Size(40, 40) }} 
        />
      ))}

      {selectedHospital && (
        <InfoWindow
          position={{ lat: selectedHospital.latitude, lng: selectedHospital.longitude }}
          onCloseClick={() => setSelectedHospital(null)}
        >
          <div style={{ padding: '5px', color: '#1e293b' }}>
            <h4 style={{ margin: '0 0 5px 0' }}>{selectedHospital.name}</h4>
            <p style={{ margin: 0, fontSize: '12px' }}>Beds Available: {selectedHospital.beds}</p>
          </div>
        </InfoWindow>
      )}

      {previewLocation && (
        <Marker position={{ lat: previewLocation.lat, lng: previewLocation.lng }} icon={{ url: "https://maps.google.com/mapfiles/ms/icons/red-dot.png", scaledSize: new window.google.maps.Size(40, 40) }} />
      )}
    </GoogleMap>
  );
};

export default MapComponent;