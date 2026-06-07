import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useJsApiLoader } from '@react-google-maps/api';
import { supabase, supabaseAdmin, isSupabaseAdminConfigured } from '../supabaseClient';
import { GOOGLE_MAPS_API_KEY } from '../config/googleMaps';
import MapComponent from './MapComponent';
import AddDriver from './AddDriver';
import CreateBooking from './CreateBooking';
import CreateScheduledBooking from './CreateScheduledBooking';
import ScheduledBookingsPanel from './ScheduledBookingsPanel';
import { canAccessClinicPortal, fetchClinicRow, resolveClinicId } from '../utils/resolveClinic';
import { useMapsAuthFailure } from '../hooks/useMapsAuthFailure';
import GoogleMapsSetupHelp from './GoogleMapsSetupHelp';
import DriverFleetDashboard from './DriverFleetDashboard';
import IncomingMissionCard from './IncomingMissionCard';
import ClinicRecordsArchive from './ClinicRecordsArchive';
import BedAvailabilityPanel from './BedAvailabilityPanel';
import SettingsFacilitySite from './SettingsFacilitySite';
import SettingsDriverRoster from './SettingsDriverRoster';
import SettingsHub from './SettingsHub';
import SettingsSubpage from './SettingsSubpage';
import ClinicNotificationBell from './ClinicNotificationBell';
import { scopeBookingToClinic } from '../utils/scopeClinicBooking';
import { syncPatientReportClinical } from '../utils/syncPatientReportClinical';
import {
  ACTIVE_CLINIC_MISSION_STATUSES,
  SCHEDULED_BOOKING_STATUS,
  UNKNOWN_PATIENT_ID,
  isActiveClinicMission,
  isScheduledBooking,
  patientReportMissionDisplay,
} from '../constants/missionClinical';
import './Dashboard1.css';
import '../App.css';

const libraries = ['places'];

/** Small clinic model: one ambulance, up to two driver app accounts (e.g. primary + relief). */
const MAX_CLINIC_DRIVER_ACCOUNTS = 2;

const SideIcon = ({ path, active = false, viewBox = '0 0 24 24' }) => (
  <svg width="18" height="18" viewBox={viewBox} fill="none" xmlns="http://www.w3.org/2000/svg" style={{ display: 'block' }} aria-hidden="true">
    <path d={path} stroke={active ? '#60A5FA' : '#F8FAFC'} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const HeaderLocationIcon = () => (
  <svg width="19" height="19" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
    <path d="M12 21s6-5.4 6-10a6 6 0 1 0-12 0c0 4.6 6 10 6 10z" stroke="#F8FAFC" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M12 13.5A2.5 2.5 0 1 0 12 8.5A2.5 2.5 0 1 0 12 13.5z" stroke="#F8FAFC" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

/** Side nav: settings (gear). */
const SettingsNavIcon = ({ active = false }) => {
  const c = active ? '#60A5FA' : '#F8FAFC';
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ display: 'block' }} aria-hidden="true">
      <circle cx="12" cy="12" r="3" stroke={c} strokeWidth="1.8" />
      <path
        d="M12 1v3M12 20v3M4.22 4.22l2.12 2.12M17.66 17.66l2.12 2.12M1 12h3M20 12h3M4.22 19.78l2.12-2.12M17.66 6.34l2.12-2.12"
        stroke={c}
        strokeWidth="1.8"
        strokeLinecap="round"
      />
    </svg>
  );
};

/** Side nav: scheduled / advance bookings. */
const ScheduledNavIcon = ({ active = false }) => {
  const c = active ? '#60A5FA' : '#F8FAFC';
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ display: 'block' }} aria-hidden="true">
      <path
        d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
        stroke={c}
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
};

/** Side nav: beds. */
const BedNavIcon = ({ active = false }) => {
  const c = active ? '#60A5FA' : '#F8FAFC';
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ display: 'block' }} aria-hidden="true">
      <path
        d="M3 14v6M21 14v6M3 18h18M4 10V8a1 1 0 011-1h3v3H4zM9 8h12a2 2 0 012 2v4H9V8z"
        stroke={c}
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
};

const toKm = (lat1, lng1, lat2, lng2) => {
  const toRad = (d) => (d * Math.PI) / 180;
  const R = 6371;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) * Math.sin(dLng / 2);
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
};

const FacilityPortal = () => {
  const navigate = useNavigate();
  const [view, setView] = useState('incoming');
  const [clinic, setClinic] = useState(null);
  const [drivers, setDrivers] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [allClinics, setAllClinics] = useState([]);
  const [removingDriverId, setRemovingDriverId] = useState(null);
  const [selectedFacilityId, setSelectedFacilityId] = useState('');
  const [clinicLocationEdit, setClinicLocationEdit] = useState(null);
  const [clinicPhoneEdit, setClinicPhoneEdit] = useState('');
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState(null);
  const [booting, setBooting] = useState(true);
  const [mapScopeId, setMapScopeId] = useState(null);
  const [mapFocus, setMapFocus] = useState(null);
  /** When set, Live fleet map follows this driver's GPS (not the clinic pin). */
  const [trackedDriverId, setTrackedDriverId] = useState(null);
  const [trafficEnabled, setTrafficEnabled] = useState(false);
  const [showDispatchModal, setShowDispatchModal] = useState(false);
  const [showScheduledModal, setShowScheduledModal] = useState(false);
  const [dispatchPreviewLocation, setDispatchPreviewLocation] = useState(null);
  const [scheduledPreviewLocation, setScheduledPreviewLocation] = useState(null);
  /** Settings sub-page: null (hub), 'location', or 'drivers'. */
  const [settingsSection, setSettingsSection] = useState(null);
  const initialPassRef = useRef(true);
  const toastTimerRef = useRef(null);

  const mapsAuthFailed = useMapsAuthFailure();
  const { isLoaded, loadError } = useJsApiLoader({
    googleMapsApiKey: GOOGLE_MAPS_API_KEY,
    libraries,
  });

  const fetchAll = useCallback(async () => {
    await supabase.auth.refreshSession();
    const { data: authData } = await supabase.auth.getUser();
    const user = authData?.user;
    if (!user) {
      if (initialPassRef.current) setBooting(false);
      initialPassRef.current = false;
      navigate('/', { replace: true });
      return;
    }

    if (!(await canAccessClinicPortal(user))) {
      if (initialPassRef.current) setBooting(false);
      initialPassRef.current = false;
      const pending =
        user?.app_metadata?.clinic_access === 'pending' ||
        user?.app_metadata?.facility_access === 'pending';
      await supabase.auth.signOut();
      navigate('/', {
        replace: true,
        state: { loginNotice: pending ? 'clinic_pending' : 'clinic_unauthorized' },
      });
      return;
    }

    let clinicRow;
    try {
      clinicRow = await fetchClinicRow(user);
    } catch (clinicErr) {
      console.error(clinicErr);
      if (initialPassRef.current) {
        setBooting(false);
        initialPassRef.current = false;
      }
      return;
    }

    const clinicId = clinicRow?.id ? String(clinicRow.id) : await resolveClinicId(user);

    if (!clinicId || !clinicRow) {
      if (initialPassRef.current) setBooting(false);
      initialPassRef.current = false;
      await supabase.auth.signOut();
      navigate('/', {
        replace: true,
        state: {
          loginNotice: 'clinic_unauthorized',
        },
      });
      return;
    }

    setMapScopeId(clinicId);
    setClinic(clinicRow);
    setSelectedFacilityId(clinicId);
    const la = clinicRow.latitude ?? clinicRow.lat;
    const lo = clinicRow.longitude ?? clinicRow.lng;
    const hasCoords = la != null && lo != null && Number.isFinite(Number(la)) && Number.isFinite(Number(lo));
    setClinicLocationEdit(
      hasCoords || clinicRow.address
        ? {
            address: clinicRow.address || '',
            latitude: hasCoords ? Number(la) : undefined,
            longitude: hasCoords ? Number(lo) : undefined,
          }
        : null
    );
    setClinicPhoneEdit((clinicRow.phone || '').trim());

    // Service role bypasses RLS — clinic JWT often has no clinic_id even when resolveClinicId works.
    const driverDb = isSupabaseAdminConfigured ? supabaseAdmin : supabase;
    const { data: drv, error: drvErr } = await driverDb
      .from('drivers')
      .select('*')
      .eq('base_clinic_id', clinicId);
    if (drvErr) {
      console.error('drivers fetch:', drvErr);
      showToast('error', `Could not load drivers: ${drvErr.message}`);
    }
    const bookingDb = isSupabaseAdminConfigured ? supabaseAdmin : supabase;
    const [{ data: activeBookings }, { data: completedBookings }, { data: scheduledBookings }, { data: clinicRows }] =
      await Promise.all([
        supabase.from('bookings').select('*').in('status', ACTIVE_CLINIC_MISSION_STATUSES),
        supabase
          .from('bookings')
          .select('*')
          .eq('status', 'Completed')
          .order('created_at', { ascending: false })
          .limit(150),
        bookingDb
          .from('bookings')
          .select('*')
          .eq('status', SCHEDULED_BOOKING_STATUS)
          .or(`assigned_clinic_id.eq.${clinicId},assigned_clinic_id.is.null`),
        supabase.from('clinics').select('id, name, latitude, longitude, address, specialty').order('name'),
      ]);

    const bookingById = new Map();
    [...(activeBookings || []), ...(completedBookings || []), ...(scheduledBookings || [])].forEach(
      (b) => bookingById.set(b.id, b)
    );

    if (drv) setDrivers(drv);
    setBookings([...bookingById.values()]);
    setAllClinics(clinicRows || []);

    if (initialPassRef.current) {
      setBooting(false);
      initialPassRef.current = false;
    }
  }, [navigate]);

  useEffect(() => {
    fetchAll();
    const channel = supabase
      .channel('facility-live')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'clinics' }, fetchAll)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'bookings' }, fetchAll)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'drivers' }, fetchAll)
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchAll]);

  const selectedFacility = useMemo(() => {
    if (!clinic || String(clinic.id) !== String(selectedFacilityId)) return clinic;
    return clinic;
  }, [clinic, selectedFacilityId]);

  const focusMap = useCallback((lat, lng, { setZoom = false } = {}) => {
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return;
    setMapFocus({ lat, lng, timestamp: Date.now(), setZoom });
  }, []);

  // Map pin when editing facility site in Settings.
  useEffect(() => {
    if (view !== 'settings' || !selectedFacility) return;
    const lat = Number(selectedFacility.latitude ?? selectedFacility.lat);
    const lng = Number(selectedFacility.longitude ?? selectedFacility.lng);
    focusMap(lat, lng, { setZoom: true });
  }, [view, selectedFacility?.id, focusMap]);

  const activeMissionStatuses = useMemo(() => ACTIVE_CLINIC_MISSION_STATUSES, []);

  // Live fleet: follow ambulance GPS as it moves (refreshes with driver poll).
  useEffect(() => {
    if (view !== 'fleet') return;

    const pickDriver = () => {
      if (trackedDriverId) {
        return drivers.find((d) => d.id === trackedDriverId) ?? null;
      }
      return (
        drivers.find((d) => {
          const onMission = bookings.some(
            (b) => b.driver_id === d.id && activeMissionStatuses.includes(b.status)
          );
          return onMission && d.current_lat != null && d.current_lng != null;
        }) ?? null
      );
    };

    const d = pickDriver();
    if (!d) return;

    const lat = Number(d.current_lat);
    const lng = Number(d.current_lng);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return;

    focusMap(lat, lng, { setZoom: false });
  }, [view, drivers, bookings, trackedDriverId, activeMissionStatuses, focusMap]);

  useEffect(() => {
    if (view === 'fleet' && !trackedDriverId && drivers.length > 0) {
      const firstOnMission = drivers.find((d) =>
        bookings.some((b) => b.driver_id === d.id && activeMissionStatuses.includes(b.status))
      );
      if (firstOnMission) setTrackedDriverId(firstOnMission.id);
    }
    if (view === 'settings' || view === 'beds' || view === 'scheduled') setTrackedDriverId(null);
    if (view !== 'settings') setSettingsSection(null);
  }, [view, drivers, bookings, trackedDriverId, activeMissionStatuses]);

  const showToast = (type, text) => {
    setToast({ type, text });
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    toastTimerRef.current = setTimeout(() => setToast(null), 4000);
  };

  const ambulanceDriver = useMemo(
    () => drivers.find((d) => d.status === 'Available') ?? null,
    [drivers]
  );

  const driverIdsAtClinic = useMemo(() => drivers.map((d) => d.id), [drivers]);

  const scheduledBookingCount = useMemo(() => {
    if (!selectedFacility) return 0;
    const clinicId = String(selectedFacility.id);
    return bookings.filter((b) => isScheduledBooking(b) && scopeBookingToClinic(b, clinicId, driverIdsAtClinic)).length;
  }, [bookings, selectedFacility, driverIdsAtClinic]);

  const inboundMissions = useMemo(() => {
    if (!selectedFacility) return [];
    const clinicId = String(selectedFacility.id);
    const fLat = selectedFacility.latitude ?? selectedFacility.lat;
    const fLng = selectedFacility.longitude ?? selectedFacility.lng;
    const useFacilityDest =
      fLat != null && fLng != null && Number.isFinite(Number(fLat)) && Number.isFinite(Number(fLng));

    const scopedToClinic = (b) => {
      if (!b.assigned_clinic_id) return true;
      return String(b.assigned_clinic_id) === clinicId;
    };

    const patientActive = bookings
      .filter(
        (b) => b.patient_report_id && scopedToClinic(b) && isActiveClinicMission(b.status)
      )
      .map((b) => {
        const { statusLabel, etaLabel } = patientReportMissionDisplay(b);
        const driver = drivers.find((d) => d.id === b.driver_id);
        return {
          id: b.id,
          kind: 'patient_report',
          patientName: b.patient_name || 'Patient report',
          status: statusLabel,
          eta: etaLabel,
          driverName: driver?.name || null,
          booking: b,
        };
      });

    const transfersInbound = bookings
      .filter(
        (b) =>
          String(b.destination_clinic_id) === clinicId &&
          ['Assigned', 'Accepted', 'En Route', 'Picked Up'].includes(b.status)
      )
      .map((b) => {
        const driver = drivers.find((d) => d.id === b.driver_id);
        const destLat = useFacilityDest ? Number(fLat) : Number(b.latitude);
        const destLng = useFacilityDest ? Number(fLng) : Number(b.longitude);
        let eta = 'unavailable';
        if (
          driver?.current_lat != null &&
          driver?.current_lng != null &&
          Number.isFinite(destLat) &&
          Number.isFinite(destLng)
        ) {
          const km = toKm(Number(driver.current_lat), Number(driver.current_lng), destLat, destLng);
          eta = `${Math.max(1, Math.round((km / 45) * 60))} min`;
        }
        return {
          id: b.id,
          kind: 'transfer',
          patientName: b.patient_name || 'Unknown patient',
          status: b.status || 'Unknown',
          eta,
          driverName: driver?.name || 'Ambulance unit',
          booking: b,
        };
      });

    return [...patientActive, ...transfersInbound];
  }, [bookings, drivers, selectedFacility]);

  const archivedRecordCount = useMemo(() => {
    if (!selectedFacility) return 0;
    const clinicId = String(selectedFacility.id);
    const driverIds = drivers.map((d) => d.id);
    return bookings.filter(
      (b) => b.status === 'Completed' && scopeBookingToClinic(b, clinicId, driverIds)
    ).length;
  }, [bookings, drivers, selectedFacility]);

  const dispatchPatientMission = async (mission) => {
    if (!ambulanceDriver) {
      return showToast('error', 'Put a driver on Available in the mobile app first.');
    }
    const missionId = mission.id ?? mission.booking?.id;
    const { data: fresh } = await supabase.from('bookings').select('*').eq('id', missionId).maybeSingle();
    const b = fresh ?? mission.booking ?? mission;

    let patientId = b.patient_id?.trim() || '';
    if (!patientId) {
      const ok = window.confirm(
        'Patient ID is not known yet (caller has not met the patient). Send ambulance anyway and mark ID as UNKNOWN? You can update it later.'
      );
      if (!ok) return;
      patientId = UNKNOWN_PATIENT_ID;
    }

    try {
      const { error } = await supabase
        .from('bookings')
        .update({
          driver_id: ambulanceDriver.id,
          status: 'Pending',
          patient_id: patientId,
        })
        .eq('id', missionId);
      if (error) throw error;

      const { error: syncError } = await syncPatientReportClinical(b, { patient_id: patientId });
      if (syncError) {
        console.warn('patient_reports sync:', syncError.message);
      }

      showToast('success', `Dispatch sent to ${ambulanceDriver.name || 'driver'}.`);
      await fetchAll();
    } catch (err) {
      showToast('error', err.message || 'Could not dispatch.');
    }
  };

  const removeDriverFromClinic = async (driver) => {
    if (!mapScopeId || String(driver.base_clinic_id) !== String(mapScopeId)) {
      return showToast('error', 'Cannot remove this driver.');
    }
    if (
      !window.confirm(
        `Remove ${driver.name || 'this driver'} from the clinic? Their mobile login will be deleted. This cannot be undone.`
      )
    ) {
      return;
    }

    const { data: openMissions, error: qErr } = await supabase
      .from('bookings')
      .select('id')
      .eq('driver_id', driver.id)
      .not('status', 'eq', 'Completed')
      .limit(1);
    if (qErr) {
      return showToast('error', qErr.message);
    }
    if (openMissions?.length) {
      return showToast('error', 'This driver has an open mission. Complete it or reassign before removing them.');
    }

    setRemovingDriverId(driver.id);
    try {
      const { error: authError } = await supabaseAdmin.auth.admin.deleteUser(driver.id);
      if (authError && authError.message !== 'User not found') {
        throw authError;
      }
      const { error: dbError } = await supabaseAdmin.from('drivers').delete().eq('id', driver.id);
      if (dbError) {
        throw dbError;
      }
      showToast('success', 'Driver removed. You can register a replacement if needed.');
      await fetchAll();
    } catch (err) {
      console.error(err);
      showToast('error', err.message || String(err));
    } finally {
      setRemovingDriverId(null);
    }
  };

  const saveClinicLocation = async (e) => {
    e.preventDefault();

    if (
      !clinicLocationEdit?.address ||
      !Number.isFinite(clinicLocationEdit.latitude) ||
      !Number.isFinite(clinicLocationEdit.longitude)
    ) {
      return showToast('error', 'Search and pick your clinic address from the suggestions.');
    }

    const { latitude, longitude, address } = clinicLocationEdit;
    if (latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180) {
      return showToast('error', 'Address coordinates are out of range.');
    }

    const phone = clinicPhoneEdit.trim();
    const phoneDigits = phone.replace(/\D/g, '');
    if (phone && phoneDigits.length < 8) {
      return showToast('error', 'Enter a valid clinic phone number (at least 8 digits).');
    }

    setSaving(true);
    const { error } = await supabase
      .from('clinics')
      .update({ latitude, longitude, address, phone: phone || null })
      .eq('id', selectedFacilityId);
    setSaving(false);
    if (error) return showToast('error', error.message);
    await fetchAll();
    showToast('success', 'Saved.');
  };

  const logout = async () => {
    await supabase.auth.signOut();
    navigate('/');
  };

  const closeDispatchModal = () => {
    setShowDispatchModal(false);
    setDispatchPreviewLocation(null);
  };

  const closeScheduledModal = () => {
    setShowScheduledModal(false);
    setScheduledPreviewLocation(null);
  };

  const hudTitle =
    view === 'settings'
      ? settingsSection === 'location'
        ? 'Facility location'
        : settingsSection === 'drivers'
          ? 'Driver accounts'
          : 'Settings'
      : view === 'beds'
        ? 'Beds'
        : view === 'scheduled'
          ? 'Scheduled'
          : view === 'incoming'
            ? 'Mission queue'
            : view === 'records'
              ? 'Mission archive'
              : view === 'fleet'
                ? 'Live fleet'
                : 'Driver roster';

  if (!GOOGLE_MAPS_API_KEY) {
    return (
      <div className="loading-screen map-setup-error">
        <h2>Google Maps API key missing</h2>
        <p className="facility-muted">
          Add <code>REACT_APP_GOOGLE_MAPS_API_KEY</code> to <code>web-app/.env</code>, then stop and run{' '}
          <code>npm start</code> again.
        </p>
      </div>
    );
  }

  if (loadError || mapsAuthFailed) {
    return (
      <GoogleMapsSetupHelp
        title={mapsAuthFailed ? 'Google Maps API key was rejected' : 'Google Maps could not load'}
        detail={loadError?.message}
      />
    );
  }

  if (booting || !isLoaded) {
    return (
      <div className="loading-screen">
        <h2>Loading…</h2>
      </div>
    );
  }

  return (
    <div className="app-shell facility-portal-map-shell">
      <div className="map-background">
        <MapComponent
          previewLocation={dispatchPreviewLocation || scheduledPreviewLocation}
          mapFocus={mapFocus}
          showHospitals
          showTraffic={trafficEnabled}
          facilityClinicId={mapScopeId}
        />
        <button
          type="button"
          className={`map-overlay-control ${trafficEnabled ? 'active' : ''}`}
          onClick={() => setTrafficEnabled(!trafficEnabled)}
          aria-pressed={trafficEnabled}
        >
          🚦
        </button>
      </div>

      <div className="ui-container">
        {toast && (
          <div
            className={`facility-toast facility-toast-${toast.type}`}
            style={{
              position: 'fixed',
              top: 88,
              left: '50%',
              transform: 'translateX(-50%)',
              zIndex: 500,
              margin: 0,
              boxShadow: '0 8px 24px rgba(0,0,0,0.12)',
            }}
            role="status"
          >
            {toast.text}
          </div>
        )}

        <div className="banner-anchor">
          <header className="main-banner">
            <div className="banner-left">
              <span className="brand-mark">
                <HeaderLocationIcon />
              </span>
              <div className="banner-title-stack">
                <h2 className="banner-title">Operations</h2>
                {selectedFacility?.name ? (
                  <p className="banner-facility-name" title={selectedFacility.name}>
                    {selectedFacility.name}
                  </p>
                ) : null}
              </div>
            </div>
            <div className="banner-right">
              {selectedFacility?.id ? (
                <ClinicNotificationBell
                  clinicId={String(selectedFacility.id)}
                  driverIds={driverIdsAtClinic}
                  onNavigate={(meta) => {
                    if (meta?.view) setView(meta.view);
                  }}
                />
              ) : null}
              <button type="button" className="status-pill status-pill--subtle">
                Live
              </button>
              <div className="profile-group">
                <div className="avatar-circle">FP</div>
              </div>
            </div>
          </header>
        </div>

        <div className="workspace-content">
          <nav className="side-nav">
            <div className="nav-top-group">
              <div
                className={`nav-link ${view === 'incoming' ? 'active' : ''}`}
                onClick={() => setView('incoming')}
                title="Mission queue"
                role="button"
              >
                <SideIcon
                  active={view === 'incoming'}
                  path="M3 11.5h18M6.5 15.5h11M8 19h8M7 11.5V7a2 2 0 0 1 2-2h6a2 2 0 0 1 2 2v4.5"
                />
              </div>
              <div
                className={`nav-link ${view === 'fleet' ? 'active' : ''}`}
                onClick={() => {
                  setView('fleet');
                  const onMission = drivers.find((d) =>
                    bookings.some(
                      (b) =>
                        b.driver_id === d.id &&
                        ['Pending', 'Assigned', 'Accepted', 'En Route', 'Picked Up'].includes(b.status)
                    )
                  );
                  if (onMission) setTrackedDriverId(onMission.id);
                }}
                title="Live fleet"
                role="button"
              >
                <SideIcon
                  active={view === 'fleet'}
                  path="M3 13h2v-2H3v2zm0 4h2v-2H3v2zm0-8h2V7H3v2zm4 8h14v-2H7v2zm0 4h14v-2H7v2zM7 7v2h14V7H7z"
                />
              </div>
              <div
                className={`nav-link ${view === 'records' ? 'active' : ''}`}
                onClick={() => setView('records')}
                title="Mission archive"
                role="button"
              >
                <SideIcon
                  active={view === 'records'}
                  path="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"
                />
              </div>
              <div
                className="nav-link nav-dispatch"
                onClick={() => setShowDispatchModal(true)}
                title="New dispatch"
                role="button"
              >
                <SideIcon active={false} path="M12 5v14M5 12h14" />
              </div>
              <div
                className={`nav-link ${view === 'scheduled' ? 'active' : ''}`}
                onClick={() => setView('scheduled')}
                title="Scheduled transport"
                role="button"
              >
                <ScheduledNavIcon active={view === 'scheduled'} />
              </div>
              <div
                className={`nav-link ${view === 'beds' ? 'active' : ''}`}
                onClick={() => setView('beds')}
                title="Beds"
                role="button"
              >
                <BedNavIcon active={view === 'beds'} />
              </div>
              <div
                className={`nav-link ${view === 'drivers' ? 'active' : ''}`}
                onClick={() => setView('drivers')}
                title="Driver roster"
                role="button"
              >
                <SideIcon
                  active={view === 'drivers'}
                  path="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2M9 11a4 4 0 100-8 4 4 0 000 8zM23 21v-2a4 4 0 00-3-3.87m-3.5-5.13a4 4 0 010 7.75"
                  viewBox="0 0 24 24"
                />
              </div>
            </div>
            <div className="nav-bottom-group">
              <div
                className={`nav-link ${view === 'settings' ? 'active' : ''}`}
                onClick={() => {
                  setView('settings');
                  setSettingsSection(null);
                }}
                title="Settings"
                role="button"
              >
                <SettingsNavIcon active={view === 'settings'} />
              </div>
              <div className="nav-link" title="Sign out" onClick={logout} role="button">
                <SideIcon path="M9 7l-5 5 5 5M4 12h12M15 5h5v14h-5" />
              </div>
            </div>
          </nav>

          <main className={`hud-panel${view === 'settings' ? ' hud-panel--settings' : ''}`}>
            {view !== 'settings' && (
            <header className="hud-header">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px', flexWrap: 'wrap' }}>
                  <h1 className="hud-title">{hudTitle}</h1>
                  {view === 'incoming' && (
                    <span style={{ fontSize: '0.85rem', fontWeight: '700', color: '#64748b' }}>
                      (
                      <span style={{ color: '#10b981' }}>{inboundMissions.length}</span>
                      <span style={{ color: '#64748b' }}> open</span>)
                    </span>
                  )}
                  {view === 'fleet' && (
                    <span style={{ fontSize: '0.85rem', fontWeight: '700', color: '#64748b' }}>
                      (<span style={{ color: '#10b981' }}>{drivers.filter((d) => d.status === 'Available').length}</span>
                      <span style={{ color: '#64748b' }}> available</span>)
                    </span>
                  )}
                  {view === 'records' && (
                    <span style={{ fontSize: '0.85rem', fontWeight: '700', color: '#64748b' }}>
                      (<span style={{ color: '#64748b' }}>{archivedRecordCount}</span>
                      <span style={{ color: '#64748b' }}> saved</span>)
                    </span>
                  )}
                  {view === 'drivers' && (
                    <span style={{ fontSize: '0.85rem', fontWeight: '700', color: '#64748b' }}>
                      (<span style={{ color: '#64748b' }}>{drivers.length}</span>
                      <span style={{ color: '#64748b' }}> / {MAX_CLINIC_DRIVER_ACCOUNTS}</span>)
                    </span>
                  )}
                  {view === 'scheduled' && (
                    <span style={{ fontSize: '0.85rem', fontWeight: '700', color: '#64748b' }}>
                      (
                      <span style={{ color: scheduledBookingCount > 0 ? '#10b981' : '#64748b' }}>
                        {scheduledBookingCount}
                      </span>
                      <span style={{ color: '#64748b' }}> planned</span>)
                    </span>
                  )}
                  {view === 'beds' && selectedFacility && (
                    <span style={{ fontSize: '0.85rem', fontWeight: '700', color: '#64748b' }}>
                      (
                      {Number(selectedFacility.bed_capacity) > 0 ? (
                        <>
                          <span style={{ color: '#10b981' }}>
                            {Math.max(
                              0,
                              Number(selectedFacility.bed_capacity) -
                                Math.min(
                                  Number(selectedFacility.beds_occupied) || 0,
                                  Number(selectedFacility.bed_capacity)
                                )
                            )}
                          </span>
                          <span style={{ color: '#64748b' }}> free</span>
                        </>
                      ) : (
                        <span style={{ color: '#64748b' }}>not set</span>
                      )}
                      )
                    </span>
                  )}
                </div>
              </div>
            </header>
            )}

            <div className="hud-scroll-hide">
              {view === 'records' && (
                <ClinicRecordsArchive
                  bookings={bookings}
                  drivers={drivers}
                  clinicId={selectedFacility?.id}
                />
              )}

              {view === 'fleet' && (
                <DriverFleetDashboard
                  drivers={drivers}
                  bookings={bookings}
                  clinic={selectedFacility}
                  clinics={allClinics}
                  onFocusDriver={(pos, driverId) => {
                    if (driverId) setTrackedDriverId(driverId);
                    focusMap(pos.lat, pos.lng, { setZoom: true });
                  }}
                />
              )}

              {view === 'drivers' && (
                <div className="fleet-list-container">
                  <p className="facility-section-subtitle" style={{ marginTop: 0 }}>
                    Register who can log into the ambulance app for this clinic. To remove a driver, open Settings.
                  </p>

                  {drivers.length < MAX_CLINIC_DRIVER_ACCOUNTS ? (
                    <div className="unit-card-new" style={{ cursor: 'default', marginTop: '14px' }}>
                      <p className="facility-section-subtitle" style={{ marginTop: 0 }}>
                        Register another driver ({drivers.length}/{MAX_CLINIC_DRIVER_ACCOUNTS}). Dispatch uses whoever is{' '}
                        <strong>Available</strong>.
                      </p>
                      <AddDriver
                        baseClinicId={mapScopeId}
                        defaultLat={selectedFacility?.latitude ?? selectedFacility?.lat}
                        defaultLng={selectedFacility?.longitude ?? selectedFacility?.lng}
                        onComplete={async () => {
                          await fetchAll();
                          showToast('success', 'Driver registered. They can sign in with the email and password you set.');
                        }}
                      />
                    </div>
                  ) : (
                    <p style={{ color: '#64748b', fontSize: '0.85rem', marginTop: '14px' }}>
                      Roster full ({MAX_CLINIC_DRIVER_ACCOUNTS} drivers). Remove someone in Settings to add another.
                    </p>
                  )}
                </div>
              )}

              {view === 'scheduled' && (
                <ScheduledBookingsPanel
                  clinicId={selectedFacilityId}
                  bookings={bookings}
                  drivers={drivers}
                  onBookNew={() => setShowScheduledModal(true)}
                  onActivate={() => {
                    fetchAll();
                    showToast('success', 'Scheduled booking updated.');
                  }}
                  onCancel={() => {
                    fetchAll();
                    showToast('success', 'Scheduled booking cancelled.');
                  }}
                />
              )}

              {view === 'beds' && (
                <div className="fleet-list-container">
                  {selectedFacilityId ? (
                    <section className="settings-panel-card settings-beds-panel">
                      <header className="settings-panel-card__header">
                        <h2 className="settings-panel-card__title">Beds</h2>
                      </header>
                      <div className="settings-panel-card__body">
                    <BedAvailabilityPanel
                      clinicId={selectedFacilityId}
                      bedCapacity={selectedFacility?.bed_capacity ?? 0}
                      bedsOccupied={selectedFacility?.beds_occupied ?? 0}
                      disabled={false}
                      showToast={showToast}
                      onSaved={fetchAll}
                    />
                      </div>
                    </section>
                  ) : null}
                </div>
              )}

              {view === 'settings' && (
                <div className="settings-page">
                  {!settingsSection ? (
                    <SettingsHub
                      onSelectLocation={() => setSettingsSection('location')}
                      onSelectDrivers={() => setSettingsSection('drivers')}
                    />
                  ) : (
                    <SettingsSubpage
                      title={settingsSection === 'location' ? 'Facility Location' : 'Driver Accounts'}
                      description={
                        settingsSection === 'location'
                          ? 'Update your facility site and map coordinates'
                          : 'Remove drivers who no longer work at your clinic'
                      }
                      onBack={() => setSettingsSection(null)}
                    >
                      {settingsSection === 'location' ? (
                        <SettingsFacilitySite
                          compact
                          facilityName={selectedFacility?.name}
                          clinicLocationEdit={clinicLocationEdit}
                          clinicPhone={clinicPhoneEdit}
                          onPhoneChange={setClinicPhoneEdit}
                          onPlaceSelected={setClinicLocationEdit}
                          onSubmit={saveClinicLocation}
                          saving={saving}
                          inputKey={selectedFacilityId}
                        />
                      ) : (
                        <SettingsDriverRoster
                          drivers={drivers}
                          removingDriverId={removingDriverId}
                          onRemoveDriver={removeDriverFromClinic}
                          maxDrivers={MAX_CLINIC_DRIVER_ACCOUNTS}
                        />
                      )}
                    </SettingsSubpage>
                  )}
                </div>
              )}

              {view === 'incoming' && (
                <div className="fleet-list-container">
                  {clinic && (
                    <div className="unit-card-new" style={{ cursor: 'default', marginBottom: '12px' }}>
                      <div className="input-group">
                        <label className="field-label">Your clinic</label>
                        <div className="nearest-unit-box" aria-readonly="true">
                          {selectedFacility?.name ?? '—'}
                        </div>
                      </div>
                    </div>
                  )}
                  {inboundMissions.length === 0 ? (
                    <p style={{ color: '#64748b', textAlign: 'center', marginTop: '12px', fontSize: '0.9rem' }}>
                      No inbound missions for this clinic.
                    </p>
                  ) : (
                    inboundMissions.map((m) => (
                      <IncomingMissionCard
                        key={m.id}
                        mission={m}
                        onDispatch={dispatchPatientMission}
                        onSaved={() => {
                          fetchAll();
                          showToast('success', 'Clinical record saved.');
                        }}
                      />
                    ))
                  )}
                </div>
              )}
            </div>
          </main>
        </div>
      </div>

      {showDispatchModal && (
        <div className="modal-overlay" role="presentation" onClick={closeDispatchModal}>
          <div className="modal-card modal-card--dispatch" role="dialog" aria-labelledby="dispatch-modal-title" onClick={(e) => e.stopPropagation()}>
            <header className="modal-header">
              <h3 className="modal-header-title" id="dispatch-modal-title">
                New dispatch
              </h3>
              <button type="button" className="close-btn-modern" onClick={closeDispatchModal} aria-label="Close">
                &times;
              </button>
            </header>
            <div className="modal-body modal-scroll-hide">
              <CreateBooking
                clinicId={selectedFacilityId || null}
                drivers={drivers}
                onLocationSelected={setDispatchPreviewLocation}
                onBookingCreated={() => {
                  closeDispatchModal();
                  fetchAll();
                  showToast('success', 'Dispatch sent to ambulance unit.');
                }}
              />
            </div>
          </div>
        </div>
      )}

      {showScheduledModal && (
        <div className="modal-overlay" role="presentation" onClick={closeScheduledModal}>
          <div className="modal-card modal-card--dispatch" role="dialog" aria-labelledby="scheduled-modal-title" onClick={(e) => e.stopPropagation()}>
            <header className="modal-header">
              <h3 className="modal-header-title" id="scheduled-modal-title">
                Scheduled transport
              </h3>
              <button type="button" className="close-btn-modern" onClick={closeScheduledModal} aria-label="Close">
                &times;
              </button>
            </header>
            <div className="modal-body modal-scroll-hide">
              <CreateScheduledBooking
                clinicId={selectedFacilityId}
                drivers={drivers}
                onLocationSelected={setScheduledPreviewLocation}
                onBookingCreated={() => {
                  closeScheduledModal();
                  fetchAll();
                  setView('scheduled');
                  showToast('success', 'Scheduled booking saved.');
                }}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default FacilityPortal;
