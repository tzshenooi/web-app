import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { supabase } from '../supabaseClient';

function parseNonNegInt(v) {
  const n = Number.parseInt(String(v).replace(/\D/g, ''), 10);
  if (!Number.isFinite(n) || n < 0) return 0;
  return n;
}

/** Clinic bed counts; patient app shows when total is greater than zero. */
export default function BedAvailabilityPanel({ clinicId, bedCapacity, bedsOccupied, disabled, onSaved, showToast }) {
  const [capInput, setCapInput] = useState('0');
  const [occInput, setOccInput] = useState('0');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setCapInput(String(bedCapacity ?? 0));
    setOccInput(String(bedsOccupied ?? 0));
  }, [clinicId, bedCapacity, bedsOccupied]);

  const cap = useMemo(() => parseNonNegInt(capInput), [capInput]);
  const occ = useMemo(() => parseNonNegInt(occInput), [occInput]);
  const available = cap > 0 ? Math.max(0, cap - Math.min(occ, cap)) : null;

  const setOccClamped = useCallback(
    (next) => {
      const c = parseNonNegInt(capInput);
      const o = Math.max(0, parseNonNegInt(next));
      setOccInput(String(c > 0 ? Math.min(o, c) : o));
    },
    [capInput]
  );

  const bumpOccupied = (delta) => {
    const o = parseNonNegInt(occInput);
    setOccClamped(String(o + delta));
  };

  const save = async (e) => {
    e?.preventDefault();
    if (!clinicId) return;
    const c = parseNonNegInt(capInput);
    let o = parseNonNegInt(occInput);
    if (c > 0 && o > c) {
      showToast('error', 'In use cannot exceed total.');
      return;
    }
    if (c === 0) o = 0;

    setSaving(true);
    const { error } = await supabase
      .from('clinics')
      .update({ bed_capacity: c, beds_occupied: o })
      .eq('id', clinicId);
    setSaving(false);
    if (error) {
      showToast('error', error.message);
      return;
    }
    showToast('success', 'Saved.');
    if (typeof onSaved === 'function') await onSaved();
  };

  return (
    <form onSubmit={save}>
        <div className="settings-field">
          <label className="settings-field__label" htmlFor="bed-capacity" title="0 hides counts in patient app">
            Total
          </label>
          <input
            id="bed-capacity"
            className="settings-input"
            type="number"
            min={0}
            inputMode="numeric"
            value={capInput}
            disabled={disabled || saving}
            onChange={(ev) => {
              setCapInput(ev.target.value);
              const nextCap = parseNonNegInt(ev.target.value);
              const o = parseNonNegInt(occInput);
              if (nextCap > 0 && o > nextCap) setOccInput(String(nextCap));
            }}
          />
        </div>
        <div className="settings-field">
          <label className="settings-field__label" htmlFor="beds-occupied">
            In use
          </label>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
            <button
              type="button"
              className="status-pill"
              style={{ cursor: 'pointer', minWidth: '40px' }}
              disabled={disabled || saving}
              onClick={() => bumpOccupied(-1)}
              aria-label="Decrease"
            >
              −
            </button>
            <input
              id="beds-occupied"
              className="settings-input"
              style={{ flex: '1 1 120px', minWidth: '100px' }}
              type="number"
              min={0}
              inputMode="numeric"
              value={occInput}
              disabled={disabled || saving}
              onChange={(ev) => setOccClamped(ev.target.value)}
            />
            <button
              type="button"
              className="status-pill"
              style={{ cursor: 'pointer', minWidth: '40px' }}
              disabled={disabled || saving}
              onClick={() => bumpOccupied(1)}
              aria-label="Increase"
            >
              +
            </button>
          </div>
        </div>
        {available != null && (
          <p style={{ margin: '8px 0 0', fontSize: '0.9rem', color: '#0f766e', fontWeight: 700 }}>
            {available} free
          </p>
        )}
        <button type="submit" className="confirm-btn" disabled={disabled || saving}>
          {saving ? 'Saving…' : 'Save'}
        </button>
      </form>
  );
}
