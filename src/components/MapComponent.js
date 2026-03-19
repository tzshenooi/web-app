import React, { useEffect, useState, useCallback } from 'react';
import { GoogleMap, Marker, TrafficLayer } from '@react-google-maps/api';
import { supabase } from '../supabaseClient';

const containerStyle = { width: '100%', height: '100%' };
const penangCenter = { lat: 5.5135, lng: 100.5400 }; 

// Professional Light Mode Style to match your reference
const lightMapStyle = [
  { elementType: "geometry", stylers: [{ color: "#f5f5f5" }] },
  { elementType: "labels.icon", stylers: [{ visibility: "off" }] },
  { elementType: "labels.text.fill", stylers: [{ color: "#616161" }] },
  { elementType: "labels.text.stroke", stylers: [{ color: "#f5f5f5" }] },
  { featureType: "poi", elementType: "geometry", stylers: [{ color: "#eeeeee" }] },
  { featureType: "road", elementType: "geometry", stylers: [{ color: "#ffffff" }] },
  { featureType: "road.highway", elementType: "geometry", stylers: [{ color: "#dadada" }] },
  { featureType: "water", elementType: "geometry", stylers: [{ color: "#c9c9c9" }] },
];

const MapComponent = () => {
  const [drivers, setDrivers] = useState([]);
  const [bookings, setBookings] = useState([]);

  const syncMapData = useCallback(async () => {
    const { data: drv } = await supabase.from('drivers').select('*');
    const { data: bkg } = await supabase.from('bookings').select('*').eq('status', 'Pending').limit(1);
    if (drv) setDrivers(drv);
    if (bkg) setBookings(bkg);
  }, []);

  useEffect(() => {
    syncMapData();
    const interval = setInterval(syncMapData, 5000);
    return () => clearInterval(interval);
  }, [syncMapData]);

  return (
    <GoogleMap 
      mapContainerStyle={containerStyle} 
      center={penangCenter} 
      zoom={14}
      options={{ styles: lightMapStyle, disableDefaultUI: true, zoomControl: true }}
    >
      <TrafficLayer />
      {drivers.map(d => d.current_lat && (
        <Marker 
          key={d.id} 
          position={{ lat: d.current_lat, lng: d.current_lng }} 
          icon={{ url: 'https://img.icons8.com/emoji/48/ambulance-emoji.png', scaledSize: new window.google.maps.Size(40, 40) }} 
        />
      ))}
      {bookings.map(b => b.latitude && (
        <Marker 
          key={b.id} 
          position={{ lat: b.latitude, lng: b.longitude }} 
          icon={{ url: 'https://img.icons8.com/color/96/sos.png', scaledSize: new window.google.maps.Size(50, 50) }} 
        />
      ))}
    </GoogleMap>
  );
};

export default MapComponent;