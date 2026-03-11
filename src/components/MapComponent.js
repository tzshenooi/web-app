import React, { useEffect, useState } from 'react';
import { GoogleMap, Marker, TrafficLayer } from '@react-google-maps/api';
import { supabase } from '../supabaseClient';

const containerStyle = { width: '100%', height: '100%' };
const center = { lat: 5.3544, lng: 100.3012 }; 

const MapComponent = ({ onMapLoad }) => {
  const [drivers, setDrivers] = useState([]);
  const [bookings, setBookings] = useState([]);

  useEffect(() => {
    const fetchData = async () => {
      const { data: drv } = await supabase.from('drivers').select('*');
      const { data: bkg } = await supabase.from('bookings').select('*').eq('status', 'Pending');
      if (drv) setDrivers(drv);
      if (bkg) setBookings(bkg);
    };
    fetchData();

    const driverSub = supabase.channel('drivers').on('postgres_changes', 
      { event: 'UPDATE', schema: 'public', table: 'drivers' }, (p) => {
        setDrivers(prev => prev.map(d => d.id === p.new.id ? p.new : d));
      }).subscribe();

    const bookingSub = supabase.channel('bookings').on('postgres_changes', 
      { event: 'INSERT', schema: 'public', table: 'bookings' }, (p) => {
        setBookings(prev => [...prev, p.new]);
      }).subscribe();

    return () => {
      supabase.removeChannel(driverSub);
      supabase.removeChannel(bookingSub);
    };
  }, []);

  return (
    <GoogleMap 
      mapContainerStyle={containerStyle} 
      center={center} 
      zoom={13}
      onLoad={onMapLoad} // 👈 Sends the map object back to Dashboard
    >
      <TrafficLayer /> 
      
      {drivers.map(d => d.current_lat && (
        <Marker key={d.id} position={{ lat: d.current_lat, lng: d.current_lng }} label="🚑" />
      ))}

      {bookings.map(b => b.latitude && (
        <Marker 
          key={b.id} 
          position={{ lat: b.latitude, lng: b.longitude }} 
          icon="http://maps.google.com/mapfiles/ms/icons/red-dot.png" 
        />
      ))}
    </GoogleMap>
  );
};

export default MapComponent;