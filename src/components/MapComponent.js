import React, { useEffect, useState, useCallback, useRef } from 'react';
import { GoogleMap, Marker, DirectionsRenderer, Polyline, TrafficLayer } from '@react-google-maps/api';
import { supabase } from '../supabaseClient';

const containerStyle = { width: '100%', height: '100%' };
const penangCenter = { lat: 5.5135, lng: 100.5400 }; 

const MapComponent = ({ refreshTrigger }) => {
  const [drivers, setDrivers] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [directions, setDirections] = useState(null);
  const [routeUpdateKey, setRouteUpdateKey] = useState(0); 
  const [travelInfo, setTravelInfo] = useState({ statusText: '', meters: Infinity, elapsed: '' });
  const [breadcrumbs, setBreadcrumbs] = useState([]);
  
  const mapRef = useRef(null);

  const calculateElapsed = (startTime) => {
    const start = new Date(startTime);
    const now = new Date();
    const diff = Math.floor((now - start) / 1000);
    const mins = Math.floor(diff / 60);
    const secs = diff % 60;
    return `${mins}m ${secs}s`;
  };

  const handleArrivalTimestamp = useCallback(async (booking) => {
    if (booking.arrived_at) return;
    await supabase
      .from('bookings')
      .update({ arrived_at: new Date().toISOString() })
      .eq('id', booking.id);
  }, []);

  const fetchDirections = useCallback((driverPos, patientPos, booking) => {
    if (!window.google || !driverPos || !patientPos) return;

    const directionsService = new window.google.maps.DirectionsService();
    directionsService.route(
      {
        origin: new window.google.maps.LatLng(driverPos.lat, driverPos.lng),
        destination: new window.google.maps.LatLng(patientPos.lat, patientPos.lng),
        travelMode: window.google.maps.TravelMode.DRIVING,
      },
      (result, status) => {
        if (status === 'OK') {
          const route = result.routes[0].legs[0];
          const dist = route.distance.value;

          if (dist < 25) {
            handleArrivalTimestamp(booking);
            // 🛑 Hide the blue line when at scene
            setDirections(null); 
          } else {
            setDirections(result);
          }

          setRouteUpdateKey(prev => prev + 1); 
          setTravelInfo({
            statusText: dist < 25 ? "🚨 AT SCENE" : `🚑 ${route.duration.text}`,
            meters: dist,
            elapsed: calculateElapsed(booking.created_at)
          });
        }
      }
    );
  }, [handleArrivalTimestamp]);

  const syncMapData = useCallback(async () => {
    const { data: drv } = await supabase.from('drivers').select('*');
    const { data: bkg } = await supabase
      .from('bookings').select('*').eq('status', 'Pending')
      .order('created_at', { ascending: false }).limit(1);

    if (drv) setDrivers(drv);
    if (bkg && bkg.length > 0) {
      setBookings(bkg);
      const assignedDriver = drv.find(d => d.name === bkg[0].suggested_driver);
      if (assignedDriver && assignedDriver.current_lat) {
        const pos = { lat: assignedDriver.current_lat, lng: assignedDriver.current_lng };
        // Add to breadcrumbs (past path)
        setBreadcrumbs(prev => [...prev, pos]);
        fetchDirections(pos, { lat: bkg[0].latitude, lng: bkg[0].longitude }, bkg[0]);
      }
    } else {
      setBookings([]);
      setDirections(null);
      setTravelInfo({ statusText: '', meters: Infinity, elapsed: '' });
      setBreadcrumbs([]);
    }
  }, [fetchDirections]);

  useEffect(() => {
    syncMapData();
    const interval = setInterval(() => syncMapData(), 2000);
    return () => clearInterval(interval);
  }, [syncMapData]);

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%' }}>
      {travelInfo.statusText && (
        <div style={{
          position: 'absolute', top: '20px', left: '50%', transform: 'translateX(-50%)',
          backgroundColor: '#ffffff', padding: '12px 24px', borderRadius: '50px',
          boxShadow: '0 8px 15px rgba(0,0,0,0.1)', zIndex: 1000, fontWeight: '800',
          border: '2px solid #4285F4', color: '#4285F4', textAlign: 'center'
        }}>
          <div>{travelInfo.statusText}</div>
          <div style={{ fontSize: '12px', color: '#666' }}>⏱️ Response Time: {travelInfo.elapsed}</div>
        </div>
      )}

      <GoogleMap mapContainerStyle={containerStyle} center={penangCenter} zoom={18}>
        <TrafficLayer />
        
        {/* 👣 Past Trail - Stays visible so you can see the route taken */}
        <Polyline 
            path={breadcrumbs} 
            options={{ strokeColor: "#95a5a6", strokeOpacity: 0.6, strokeWeight: 4 }} 
        />

        {drivers.map(d => d.current_lat && (
          <Marker key={d.id} position={{ lat: d.current_lat, lng: d.current_lng }} 
            icon={{ url: 'https://img.icons8.com/emoji/48/ambulance-emoji.png', scaledSize: new window.google.maps.Size(45, 45) }} />
        ))}

        {bookings.map(b => b.latitude && (
          <Marker key={b.id} position={{ lat: b.latitude, lng: b.longitude }} 
            icon={{ url: 'https://img.icons8.com/color/96/sos.png', scaledSize: new window.google.maps.Size(50, 50) }} />
        ))}

        {/* 🔵 Future Path - Only shows if NOT at scene */}
        {directions && travelInfo.meters >= 25 && (
          <DirectionsRenderer key={`route-${routeUpdateKey}`} directions={directions} 
            options={{ polylineOptions: { strokeColor: "#4285F4", strokeWeight: 8 }, suppressMarkers: true }} />
        )}
      </GoogleMap>
    </div>
  );
};

export default MapComponent;