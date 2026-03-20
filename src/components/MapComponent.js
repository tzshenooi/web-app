import React, { useEffect, useState, useCallback } from 'react';
import { GoogleMap, Marker, DirectionsRenderer, TrafficLayer } from '@react-google-maps/api';
import { supabase } from '../supabaseClient';

const containerStyle = { width: '100%', height: '100%' };
const initialCenter = { lat: 5.5135, lng: 100.5400 }; 

const MapComponent = ({ previewLocation, mapFocus }) => {
  const [map, setMap] = useState(null);
  const [drivers, setDrivers] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [allDirections, setAllDirections] = useState([]);

  const syncMapData = useCallback(async () => {
    const { data: drv } = await supabase.from('drivers').select('*');
    const { data: bkg } = await supabase.from('bookings').select('*').eq('status', 'Pending');
    if (drv) setDrivers(drv);
    if (bkg) setBookings(bkg);
  }, []);

  useEffect(() => {
    syncMapData();
    const interval = setInterval(syncMapData, 3000);
    return () => clearInterval(interval);
  }, [syncMapData]);

  // EFFECT: Auto-Zoom to Vehicle when clicked in Sidebar
  useEffect(() => {
    if (map && mapFocus) {
      map.panTo({ lat: mapFocus.lat, lng: mapFocus.lng });
      map.setZoom(17); // Zoom in close to see the street
    }
  }, [mapFocus, map]);

  // DIRECTIONS LOGIC: Multi-Line support
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
      if (!assigned) {
        assigned = drivers.reduce((prev, curr) => {
          const dist = (d) => Math.sqrt(Math.pow(d.current_lat - b.latitude, 2) + Math.pow(d.current_lng - b.longitude, 2));
          return dist(curr) < dist(prev) ? curr : prev;
        });
      }
      requests.push({ id: b.id, origin: { lat: assigned.current_lat, lng: assigned.current_lng }, destination: { lat: b.latitude, lng: b.longitude } });
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
      defaultCenter={initialCenter} 
      zoom={14} 
      onLoad={setMap}
      options={{ styles: [], disableDefaultUI: true, zoomControl: true, preserveViewport: true, gestureHandling: 'greedy' }}
    >
      <TrafficLayer />

      {allDirections.map(route => (
        <DirectionsRenderer 
          key={route.id} 
          directions={route.data} 
          options={{ suppressMarkers: true, preserveViewport: true, polylineOptions: { strokeColor: "#4285F4", strokeWeight: 6, strokeOpacity: 0.7 } }} 
        />
      ))}

      {drivers.map(d => (
        <Marker key={`d-${d.id}`} position={{ lat: d.current_lat, lng: d.current_lng }} icon={{ url: 'https://img.icons8.com/emoji/48/ambulance-emoji.png', scaledSize: new window.google.maps.Size(40, 40) }} />
      ))}

      {bookings.map(b => (
        <Marker key={`b-${b.id}`} position={{ lat: b.latitude, lng: b.longitude }} icon={{ url: 'https://img.icons8.com/color/96/sos.png', scaledSize: new window.google.maps.Size(55, 55) }} />
      ))}

      {previewLocation && (
        <Marker position={{ lat: previewLocation.lat, lng: previewLocation.lng }} icon={{ url: "https://maps.google.com/mapfiles/ms/icons/red-dot.png", scaledSize: new window.google.maps.Size(40, 40) }} />
      )}
    </GoogleMap>
  );
};

export default MapComponent;