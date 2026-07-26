import React, { useState, useEffect, useRef } from 'react';
import { io } from 'socket.io-client';

const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:3000/api';

function Bar({ value, color = '#3b82f6', label }) {
  const pct = Math.max(0, Math.min(100, value ?? 0));
  return (
    <div style={{ marginBottom: 20 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6, fontSize: 12, color: '#9ca3af' }}>
        <span>{label}</span>
        <span style={{ color: '#e5e7eb', fontWeight: 600 }}>{pct.toFixed(1)} %</span>
      </div>
      <div style={{ background: '#1a2540', borderRadius: 6, height: 14, overflow: 'hidden' }}>
        <div
          style={{
            width: `${pct}%`,
            height: '100%',
            background: color,
            borderRadius: 6,
            transition: 'width 60ms linear',
          }}
        />
      </div>
    </div>
  );
}

function PedalMapping() {
  // pending: what's in the dropdown (not yet applied)
  // applied: what was last confirmed with Apply
  const [pending, setPending]       = useState('');
  const [applied, setApplied]       = useState('');
  const [liveData, setLiveData]     = useState(null);
  const [connected, setConnected]   = useState(false);
  const [profiles, setProfiles]     = useState([]);  // loaded from DBC via API
  const [profilesLoading, setProfilesLoading] = useState(true);
  const socketRef = useRef(null);

  // Load profiles from DBC on mount
  useEffect(() => {
    fetch(`${API_BASE}/pedal/profiles`)
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data)) setProfiles(data);
      })
      .catch(() => {}) // fail silently; dropdown stays empty
      .finally(() => setProfilesLoading(false));
  }, []);

  useEffect(() => {
    const socket = io('http://localhost:3000');
    socketRef.current = socket;

    socket.on('connect', () => setConnected(true));
    socket.on('disconnect', () => setConnected(false));
    socket.on('pedal_mapping', (data) => {
      setLiveData(data);
      // Initialise both states on first message, then leave them user-controlled
      if (data?.profile) {
        setPending(prev => prev || data.profile);
        setApplied(prev => prev || data.profile);
      }
    });

    return () => socket.disconnect();
  }, []);

  const hasUnappliedChange = pending !== '' && pending !== applied;

  const handleApply = async () => {
    const profile = profiles.find(o => o.value === pending);
    try {
      await fetch(`${API_BASE}/pedal/apply`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ profile: pending, slot: profile?.slot ?? 0 }),
      });
    } catch (err) {
      console.error('Failed to publish profile:', err);
    }
    setApplied(pending);
  };

  const appliedLabel = profiles.find(o => o.value === applied)?.value ?? applied ?? '—';

  return (
    <div
      style={{
        fontFamily: "'Roboto Mono', monospace",
        color: '#e5e7eb',
        backgroundColor: '#0b1120',
        minHeight: '100vh',
        padding: '32px 24px',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
        <h1 style={{ fontSize: 28, fontWeight: 700, color: '#ffffff', margin: 0 }}>
          Pedal Mapping
        </h1>
        <span
          style={{
            fontSize: 11,
            fontWeight: 600,
            padding: '2px 8px',
            borderRadius: 99,
            background: connected ? '#14532d' : '#3b1616',
            color: connected ? '#4ade80' : '#f87171',
            letterSpacing: '0.05em',
          }}
        >
          {connected ? '● LIVE' : '○ OFFLINE'}
        </span>
      </div>
      <p style={{ color: '#9ca3af', fontSize: 13, marginBottom: 32 }}>
        Live pedal sensor data from the simulator.
      </p>

      <div style={{ display: 'flex', gap: 32, flexWrap: 'wrap' }}>
        {/* Dropdown + Apply */}
        <div style={{ minWidth: 260, maxWidth: 360, flex: '1 1 260px' }}>
          <label
            htmlFor="pedal-mapping-select"
            style={{ display: 'block', fontSize: 12, color: '#9ca3af', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.05em' }}
          >
            Mapping profile
          </label>
          <select
            id="pedal-mapping-select"
            value={pending}
            onChange={(e) => setPending(e.target.value)}
            disabled={profilesLoading || profiles.length === 0}
            style={{
              width: '100%',
              backgroundColor: '#101a2e',
              color: pending ? '#e5e7eb' : '#6b7280',
              border: `1px solid ${hasUnappliedChange ? '#f59e0b' : '#23314f'}`,
              borderRadius: 12,
              padding: '10px 14px',
              fontSize: 14,
              outline: 'none',
              cursor: profilesLoading ? 'wait' : 'pointer',
              appearance: 'none',
              backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 20 20' fill='%239ca3af'%3E%3Cpath fill-rule='evenodd' d='M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z' clip-rule='evenodd'/%3E%3C/svg%3E")`,
              backgroundRepeat: 'no-repeat',
              backgroundPosition: 'right 14px center',
            }}
          >
            <option value="" disabled>
              {profilesLoading ? 'Loading from DBC…' : 'Select a mapping...'}
            </option>
            {profiles.map((opt) => (
              <option key={opt.slot} value={opt.value}>
                {opt.value}
              </option>
            ))}
          </select>

          {hasUnappliedChange && (
            <p style={{ marginTop: 8, fontSize: 11, color: '#f59e0b' }}>
              Unsaved change — press Apply to confirm.
            </p>
          )}

          <button
            onClick={handleApply}
            disabled={!hasUnappliedChange}
            style={{
              marginTop: 14,
              width: '100%',
              padding: '10px 0',
              borderRadius: 12,
              border: 'none',
              fontSize: 14,
              fontWeight: 600,
              fontFamily: "'Roboto Mono', monospace",
              cursor: hasUnappliedChange ? 'pointer' : 'not-allowed',
              background: hasUnappliedChange ? '#2563eb' : '#1e2d4a',
              color: hasUnappliedChange ? '#ffffff' : '#4b5563',
              transition: 'background 0.15s',
            }}
          >
            Apply
          </button>
        </div>

        {/* Live data panel */}
        <div
          style={{
            flex: '2 1 320px',
            background: '#101a2e',
            border: '1px solid #1e2d4a',
            borderRadius: 16,
            padding: '24px 28px',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
            <span style={{ fontSize: 13, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Live readings
            </span>
            {liveData && (
              <span style={{ fontSize: 11, color: '#4b5563' }}>
                {new Date(liveData.timestamp).toLocaleTimeString()}
              </span>
            )}
          </div>

          {liveData ? (
            <>
              {/* Applied profile badge */}
              <div style={{ marginBottom: 24, display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={{ fontSize: 12, color: '#9ca3af' }}>Applied</span>
                <span
                  style={{
                    fontSize: 13,
                    fontWeight: 700,
                    color: '#60a5fa',
                    background: '#1a2e4a',
                    border: '1px solid #2563eb44',
                    borderRadius: 8,
                    padding: '3px 12px',
                    letterSpacing: '0.03em',
                  }}
                >
                  {appliedLabel}
                </span>
              </div>

              <Bar label="Raw pedal position" value={liveData.raw_pct} color="#6366f1" />
              <Bar label="Mapped output" value={liveData.mapped_pct} color="#22c55e" />

              {/* Numeric details */}
              <div
                style={{
                  marginTop: 20,
                  display: 'grid',
                  gridTemplateColumns: 'repeat(3, 1fr)',
                  gap: 12,
                }}
              >
                {[
                  { label: 'Raw ADC', value: liveData.raw },
                  { label: 'Min raw', value: liveData.calibration?.min_raw },
                  { label: 'Max raw', value: liveData.calibration?.max_raw },
                  { label: 'DZ low', value: `${liveData.calibration?.deadzone_low} %` },
                  { label: 'DZ high', value: `${liveData.calibration?.deadzone_high} %` },
                  { label: 'Device', value: liveData.deviceId },
                ].map(({ label, value }) => (
                  <div
                    key={label}
                    style={{
                      background: '#0d1526',
                      border: '1px solid #1e2d4a',
                      borderRadius: 10,
                      padding: '10px 12px',
                    }}
                  >
                    <div style={{ fontSize: 10, color: '#6b7280', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{label}</div>
                    <div style={{ fontSize: 14, fontWeight: 600, color: '#e5e7eb' }}>{value ?? '—'}</div>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div style={{ color: '#4b5563', fontSize: 13, paddingTop: 8 }}>
              {connected
                ? 'Waiting for pedal data… start simulate_pedal.py'
                : 'Not connected to server.'}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default PedalMapping;
