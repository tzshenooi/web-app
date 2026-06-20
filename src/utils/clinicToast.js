import React from 'react';
import toast from 'react-hot-toast';

const DURATION_MS = { emergency: 10000, status: 7000, alert: 8000 };

let navigateHandler = null;

export function setClinicToastNavigate(fn) {
  navigateHandler = fn ?? null;
}

export function showClinicToast(item) {
  if (!item?.key) return;

  const duration = DURATION_MS[item.type] ?? DURATION_MS.alert;

  toast.custom(
    (t) => (
      <button
        type="button"
        className={`clinic-react-toast clinic-react-toast--${item.type || 'alert'} ${t.visible ? 'is-visible' : 'is-hidden'}`}
        onClick={() => {
          toast.dismiss(t.id);
          navigateHandler?.(item.meta);
        }}
      >
        <span
          className={`clinic-react-toast__dot clinic-react-toast__dot--${item.type || 'alert'}`}
          aria-hidden="true"
        />
        <span className="clinic-react-toast__content">
          <strong>{item.title}</strong>
          <span>{item.body}</span>
        </span>
      </button>
    ),
    { id: item.key, duration }
  );
}
