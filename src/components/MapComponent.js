import React, { useEffect, useState, useCallback } from 'react';
import { GoogleMap, Marker, DirectionsRenderer, TrafficLayer, InfoWindow } from '@react-google-maps/api';
import { supabase } from '../supabaseClient';
import { buildGoogleMapOptions, MAP_FOCUS_ZOOM } from '../config/googleMapDisplayOptions';
import { getClinicPinIcon } from '../config/clinicMapMarker';
import { mergeClinicsForActiveMissions, resolveBookingMapDestination } from '../utils/clinicRouting';

const containerStyle = { width: '100%', height: '100%' };
const initialCenter = { lat: 5.5135, lng: 100.5400 };

/** Patient scene vs clinic: after pickup, route + marker use the destination clinic. */
function getBookingDestination(b, clinicsList) {
  const dest = resolveBookingMapDestination(b, clinicsList);
  if (!dest) return { lat: NaN, lng: NaN };
  return { lat: dest.lat, lng: dest.lng };
}

const MapComponent = ({
  previewLocation,
  mapFocus,
  showHospitals,
  showTraffic,
  facilityClinicId = null,
  dispatchClinicId = null,
}) => {
  const [map, setMap] = useState(null);
  const [drivers, setDrivers] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [clinics, setClinics] = useState([]); 
  const [allDirections, setAllDirections] = useState([]);
  const [selectedHospital, setSelectedHospital] = useState(null);
  const [clinicPinDropped, setClinicPinDropped] = useState(false);

  const primaryClinic =
    facilityClinicId && clinics.length === 1
      ? clinics[0]
      : facilityClinicId
        ? clinics.find((c) => String(c.id) === String(facilityClinicId))
        : null;

  const primaryClinicPos = (() => {
    if (!primaryClinic) return null;
    const lat = Number(primaryClinic.latitude ?? primaryClinic.lat);
    const lng = Number(primaryClinic.longitude ?? primaryClinic.lng);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
    return { lat, lng };
  })(); 

  const syncMapData = useCallback(async () => {
    const { data: drv } = await supabase.from('drivers').select('*');
    
    // Keep mission visible across acknowledge -> en route -> pickup phases.
    const { data: bkg } = await supabase
      .from('bookings')
      .select('*')
      .in('status', ['Pending', 'Accepted', 'Assigned', 'En Route', 'Picked Up']); 
      
    const { data: clinicRows } = await supabase.from('clinics').select('*');

    let nextDrv = drv || [];
    let nextBkg = bkg || [];
    let nextClinics = clinicRows || [];

    if (dispatchClinicId) {
      const cid = String(dispatchClinicId);
      nextClinics = nextClinics.filter((h) => String(h.id) === cid);
      nextDrv = (drv || []).filter(
        (d) => d.base_clinic_id != null && String(d.base_clinic_id) === cid
      );
      const clinicDriverIds = new Set(nextDrv.map((d) => d.id));
      nextBkg = nextBkg.filter((b) => b.driver_id && clinicDriverIds.has(b.driver_id));
      nextClinics = mergeClinicsForActiveMissions(nextClinics, clinicRows || [], nextBkg);
    } else if (facilityClinicId) {
      const cid = String(facilityClinicId);
      nextClinics = nextClinics.filter((h) => String(h.id) === cid);
      nextDrv = (drv || []).filter((d) => d.base_clinic_id != null && String(d.base_clinic_id) === cid);
      const clinicDriverIds = new Set(nextDrv.map((d) => d.id));
      const inbound = (bkg || []).filter((b) => String(b.destination_clinic_id) === cid);
      const outbound = (bkg || []).filter((b) => b.driver_id && clinicDriverIds.has(b.driver_id));
      const merged = [...inbound, ...outbound];
      nextBkg = merged.filter((b, i, arr) => arr.findIndex((x) => x.id === b.id) === i);
      nextClinics = mergeClinicsForActiveMissions(nextClinics, clinicRows || [], nextBkg);
    }

    setDrivers(nextDrv);
    setBookings(nextBkg);
    setClinics(nextClinics);
  }, [facilityClinicId, dispatchClinicId]);

  useEffect(() => {
    syncMapData();
    const interval = setInterval(syncMapData, 3000);
    return () => clearInterval(interval);
  }, [syncMapData]);

  // Pan to focus point; only change zoom when requested (clinic / first driver lock).
  useEffect(() => {
    if (!map || !mapFocus) return;
    map.panTo({ lat: mapFocus.lat, lng: mapFocus.lng });
    if (mapFocus.setZoom) map.setZoom(MAP_FOCUS_ZOOM);
  }, [mapFocus, map]);

  // Show clinic info when portal loads with a saved location
  useEffect(() => {
    if (primaryClinic && primaryClinicPos) {
      setSelectedHospital(primaryClinic);
    }
  }, [primaryClinic?.id, primaryClinicPos?.lat, primaryClinicPos?.lng]);

  // 🟢 FIXED: Single consolidated logic for drawing routes
  useEffect(() => {
    if (!window.google || (drivers.length === 0 && !previewLocation)) return;
    
    const ds = new window.google.maps.DirectionsService();
    const requests = [];

    // 1. Dispatch preview: one clinic ambulance — prefer Available driver’s GPS, else first with GPS
    if (previewLocation && drivers.length > 0) {
      const hasGps = (d) =>
        d.current_lat != null &&
        d.current_lng != null &&
        Number.isFinite(Number(d.current_lat)) &&
        Number.isFinite(Number(d.current_lng));
      const ambulance =
        drivers.find((d) => d.status === 'Available' && hasGps(d)) ?? drivers.find((d) => hasGps(d));
      if (ambulance) {
        requests.push({
          id: 'preview',
          origin: { lat: Number(ambulance.current_lat), lng: Number(ambulance.current_lng) },
          destination: { lat: previewLocation.lat, lng: previewLocation.lng },
        });
      }
    }

    // 2. Active missions: destination is patient location until Picked Up, then hospital from destination_facility
    bookings.forEach((b) => {
      const assigned = drivers.find((d) => d.id === b.driver_id);
      if (
        assigned &&
        (b.status === 'Pending' ||
          b.status === 'Accepted' ||
          b.status === 'Assigned' ||
          b.status === 'En Route' ||
          b.status === 'Picked Up')
      ) {
        const dest = getBookingDestination(b, clinics);
        if (!Number.isFinite(dest.lat) || !Number.isFinite(dest.lng)) return;
        requests.push({
          id: b.id,
          origin: { lat: assigned.current_lat, lng: assigned.current_lng },
          destination: dest,
        });
      }
    });

    const fetchRoutes = async () => {
      const results = await Promise.all(requests.map(req => 
        new Promise(res => ds.route(
          { origin: req.origin, destination: req.destination, travelMode: 'DRIVING' }, 
          (r, s) => res(s === 'OK' ? { id: req.id, data: r } : null)
        ))
      ));
      setAllDirections(results.filter(r => r !== null));
    };

    fetchRoutes();
  }, [previewLocation, bookings, drivers, clinics]);

  return (
    <GoogleMap 
      mapContainerStyle={containerStyle} 
      center={initialCenter} 
      zoom={14} 
      onLoad={setMap}
      options={buildGoogleMapOptions({ preserveViewport: true })}
    >
      {showTraffic && <TrafficLayer key="traffic-layer" />}

      {allDirections.map(route => (
        <DirectionsRenderer 
          key={route.id} 
          directions={route.data} 
          options={{ 
            suppressMarkers: true, 
            preserveViewport: true, 
            polylineOptions: { strokeColor: "#4285F4", strokeWeight: 6, strokeOpacity: 0.7 } 
          }} 
        />
      ))}

      {drivers
        .filter(
          (d) =>
            d.current_lat != null &&
            d.current_lng != null &&
            Number.isFinite(Number(d.current_lat)) &&
            Number.isFinite(Number(d.current_lng))
        )
        .map((d) => (
          <Marker
            key={`d-${d.id}`}
            position={{ lat: Number(d.current_lat), lng: Number(d.current_lng) }}
            icon={{
              url: 'https://img.icons8.com/emoji/48/ambulance-emoji.png',
              scaledSize: new window.google.maps.Size(40, 40),
            }}
          />
        ))}

      {bookings.map((b) => {
        const dest = getBookingDestination(b, clinics);
        if (!Number.isFinite(dest.lat) || !Number.isFinite(dest.lng)) return null;
        return (
          <Marker
            key={`b-${b.id}`}
            position={dest}
            icon={{
              url:
                b.status === 'Picked Up'
                  ? 'https://img.icons8.com/color/48/hospital-sign.png'
                  : 'https://img.icons8.com/color/96/sos.png',
              scaledSize:
                b.status === 'Picked Up' ? new window.google.maps.Size(40, 40) : new window.google.maps.Size(55, 55),
            }}
          />
        );
      })}

      {primaryClinicPos && window.google && (
        <Marker
          key={`clinic-pin-${primaryClinic.id}`}
          position={primaryClinicPos}
          zIndex={1000}
          title={primaryClinic.name || 'Your clinic'}
          onClick={() => setSelectedHospital(primaryClinic)}
          animation={!clinicPinDropped ? window.google.maps.Animation.DROP : undefined}
          onLoad={() => setClinicPinDropped(true)}
          icon={getClinicPinIcon(window.google)}
        />
      )}

      {showHospitals &&
        clinics.map((h) => {
          if (facilityClinicId && String(h.id) === String(facilityClinicId)) return null;
          const plat = Number(h.latitude ?? h.lat);
          const plng = Number(h.longitude ?? h.lng);
          if (!Number.isFinite(plat) || !Number.isFinite(plng)) return null;
          return (
            <Marker
              key={`h-${h.id}`}
              position={{ lat: plat, lng: plng }}
              onClick={() => setSelectedHospital(h)}
              icon={{
                url: 'https://img.icons8.com/color/48/hospital-sign.png',
                scaledSize: new window.google.maps.Size(40, 40),
              }}
            />
          );
        })}

      {selectedHospital && (() => {
        const slat = Number(selectedHospital.latitude ?? selectedHospital.lat);
        const slng = Number(selectedHospital.longitude ?? selectedHospital.lng);
        if (!Number.isFinite(slat) || !Number.isFinite(slng)) return null;
        return (
          <InfoWindow position={{ lat: slat, lng: slng }} onCloseClick={() => setSelectedHospital(null)}>
            <div style={{ padding: '5px', color: '#1e293b', maxWidth: 260 }}>
              <h4 style={{ margin: '0 0 5px 0' }}>{selectedHospital.name}</h4>
              {selectedHospital.address ? (
                <p style={{ margin: '0 0 6px 0', fontSize: '12px', lineHeight: 1.35 }}>{selectedHospital.address}</p>
              ) : null}
              <p style={{ margin: 0, fontSize: '12px' }}>
                {selectedHospital.specialty ? `Specialty: ${selectedHospital.specialty}` : 'Your clinic'}
              </p>
            </div>
          </InfoWindow>
        );
      })()}
    </GoogleMap>
  );
};

export default MapComponent;