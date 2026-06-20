import { useCallback, useEffect, useRef, useState } from 'react';
import { supabase } from '../supabaseClient';
import { scopeBookingToClinic } from '../utils/scopeClinicBooking';
import { onClinicAlert } from '../utils/clinicNotificationBus';
import { showClinicToast } from '../utils/clinicToast';

const MAX_NOTIFICATIONS = 40;

function formatNotiTime(iso) {
  try {
    return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  } catch {
    return '';
  }
}

function prependNotification(list, item) {
  const filtered = list.filter((n) => n.key !== item.key);
  return [item, ...filtered].slice(0, MAX_NOTIFICATIONS);
}

function maybeBrowserNotify(item) {
  if (typeof document === 'undefined' || !document.hidden) return;
  if (typeof Notification === 'undefined') return;
  if (Notification.permission !== 'granted') return;
  try {
    new Notification(item.title, { body: item.body, tag: item.key });
  } catch {
    /* ignore */
  }
}

/**
 * Realtime clinic notifications: patient reports, bookings, status changes.
 */
export function useClinicNotifications(clinicId, driverIds = []) {
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const seenKeysRef = useRef(new Set());

  const driverKey = (driverIds || []).map(String).join(',');

  const addNotification = useCallback((item) => {
    const key = item.key;
    if (!key || seenKeysRef.current.has(key)) return;
    seenKeysRef.current.add(key);
    const entry = {
      ...item,
      at: item.at || new Date().toISOString(),
      timeLabel: formatNotiTime(item.at || new Date().toISOString()),
    };
    setNotifications((prev) => prependNotification(prev, entry));
    setUnreadCount((c) => c + 1);
    showClinicToast(entry);
    maybeBrowserNotify(entry);
  }, []);

  useEffect(() => onClinicAlert(addNotification), [addNotification]);

  useEffect(() => {
    if (!clinicId) return undefined;
    const ids = (driverIds || []).map(String);
    const scoped = (booking) => scopeBookingToClinic(booking, clinicId, ids);

    const channel = supabase
      .channel(`clinic-notify-${clinicId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'patient_reports' },
        (payload) => {
          const row = payload.new || {};
          addNotification({
            key: `report-${row.id}`,
            type: 'emergency',
            title: 'New patient report',
            body: row.reporter_name
              ? `${row.reporter_name} reported an incident`
              : 'Inbound emergency report',
            meta: { view: 'incoming', reportId: row.id },
          });
        }
      )
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'bookings' },
        (payload) => {
          const b = payload.new || {};
          if (!scoped(b)) return;
          const isReport = Boolean(b.patient_report_id);
          addNotification({
            key: `booking-insert-${b.id}`,
            type: 'emergency',
            title: isReport ? 'Patient mission created' : 'Inbound transfer',
            body: b.patient_name || b.location || 'Open mission queue',
            meta: { view: 'incoming', bookingId: b.id },
          });
        }
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'bookings' },
        (payload) => {
          const b = payload.new || {};
          const old = payload.old || {};
          const destClinicId = b.destination_clinic_id ? String(b.destination_clinic_id) : null;
          const oldDestClinicId = old.destination_clinic_id ? String(old.destination_clinic_id) : null;

          if (
            destClinicId === String(clinicId) &&
            destClinicId !== oldDestClinicId &&
            b.patient_report_id
          ) {
            addNotification({
              key: `transfer-inbound-${b.id}-${destClinicId}`,
              type: 'emergency',
              title: 'Inbound patient transfer',
              body: `${b.patient_name || 'Patient'} is being routed to your clinic${b.hospital_name ? ` (${b.hospital_name})` : ''}`,
              meta: { view: 'incoming', bookingId: b.id, focusMap: true },
            });
          }

          if (!scoped(b)) return;
          if (old.status === b.status) return;
          addNotification({
            key: `booking-status-${b.id}-${b.status}`,
            type: 'status',
            title: 'Mission status updated',
            body: `${b.patient_name || 'Mission'}: ${b.status}`,
            meta: { view: 'incoming', bookingId: b.id },
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [clinicId, driverKey, addNotification, driverIds]);

  const markAllRead = useCallback(() => setUnreadCount(0), []);

  const toggleDropdown = useCallback(() => {
    setDropdownOpen((open) => {
      if (!open) setUnreadCount(0);
      return !open;
    });
  }, []);

  const requestBrowserPermission = useCallback(async () => {
    if (typeof Notification === 'undefined') return 'unsupported';
    if (Notification.permission === 'granted') return 'granted';
    if (Notification.permission === 'denied') return 'denied';
    return Notification.requestPermission();
  }, []);

  return {
    notifications,
    unreadCount,
    dropdownOpen,
    setDropdownOpen,
    markAllRead,
    toggleDropdown,
    requestBrowserPermission,
  };
}
