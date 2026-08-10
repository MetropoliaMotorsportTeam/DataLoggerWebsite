import React, { useState, useEffect, useRef } from 'react';
import { io } from 'socket.io-client';
import { getApiBase, getAuthHeaders, getSocketUrl } from '../../utils/api';

const API_BASE = getApiBase();
const MAX_TRACE = 300;

// ─── Bar ─────────────────────────────────────────────────────────────────────
function Bar({ value, color = '#3b82f6', label }) {
  const pct = Math.max(0, Math.min(100, value ?? 0));
  return (
    <div style={{ marginBottom: 20 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6, fontSize: 12, color: '#9ca3af' }}>
        <span>{label}</span>
        <span style={{ color: '#e5e7eb', fontWeight: 600 }}>{pct.toFixed(1)} %</span>
      </div>
      <div style={{ background: '#1a2540', borderRadius: 6, height: 14, overflow: 'hidden' }}>
        <div style={{ width: `${pct}%`, height: '100%', background: color, borderRadius: 6, transition: 'width 60ms linear' }} />
      </div>
    </div>
  );
}

// ─── Trace Graph ─────────────────────────────────────────────────────────────
function TraceGraph({ points }) {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    // Match canvas resolution to CSS size (handles hi-DPI)
    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    if (!rect.width || !rect.height) return;
    canvas.width  = rect.width  * dpr;
    canvas.height = rect.height * dpr;

    const ctx = canvas.getContext('2d');
    ctx.scale(dpr, dpr);

    const W = rect.width;
    const H = rect.height;
    const PL = 52, PR = 16, PT = 16, PB = 38; // padding: left, right, top, bottom
    const plotW = W - PL - PR;
    const plotH = H - PT - PB;

    // Data → canvas coords
    // X: 0–100 (pedal %)  |  Y: -100 to +100 (output %)
    const cx = (v) => PL + (Math.max(0, Math.min(100, v)) / 100) * plotW;
    const cy = (v) => PT + ((100 - Math.max(-100, Math.min(100, v))) / 200) * plotH;

    // ── Background ──
    ctx.fillStyle = '#0d1526';
    ctx.fillRect(PL, PT, plotW, plotH);

    // ── Grid ──
    ctx.lineWidth = 1;
    // Horizontal
    [-100, -75, -50, -25, 0, 25, 50, 75, 100].forEach((v) => {
      const y = cy(v);
      ctx.strokeStyle = v === 0 ? 'rgba(100,120,180,0.45)' : 'rgba(35,49,79,0.7)';
      ctx.lineWidth   = v === 0 ? 1.5 : 1;
      ctx.beginPath(); ctx.moveTo(PL, y); ctx.lineTo(PL + plotW, y); ctx.stroke();
      // Label
      ctx.fillStyle  = '#4b5563';
      ctx.font       = '10px monospace';
      ctx.textAlign  = 'right';
      ctx.fillText(v, PL - 6, y + 3.5);
    });
    // Vertical — grid every 5, label every 5
    for (let v = 0; v <= 100; v += 5) {
      const x = cx(v);
      const isMajor = v % 25 === 0;
      ctx.strokeStyle = isMajor ? 'rgba(55,65,100,0.8)' : 'rgba(35,49,79,0.45)';
      ctx.lineWidth   = isMajor ? 1 : 0.5;
      ctx.beginPath(); ctx.moveTo(x, PT); ctx.lineTo(x, PT + plotH); ctx.stroke();
      ctx.fillStyle  = isMajor ? '#4b5563' : '#2d3748';
      ctx.font       = '9px monospace';
      ctx.textAlign  = 'center';
      ctx.fillText(v, x, PT + plotH + 16);
    }

    // ── Axes ──
    ctx.strokeStyle = '#374151';
    ctx.lineWidth   = 1.5;
    // Y axis
    ctx.beginPath(); ctx.moveTo(PL, PT); ctx.lineTo(PL, PT + plotH); ctx.stroke();
    // X axis (at Y=0 if visible, else at bottom)
    const xAxisY = cy(0);
    ctx.beginPath(); ctx.moveTo(PL, xAxisY); ctx.lineTo(PL + plotW, xAxisY); ctx.stroke();

    // ── Axis labels ──
    ctx.fillStyle = '#6b7280';
    ctx.font      = '11px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('Pedal position %', PL + plotW / 2, H - 4);
    ctx.save();
    ctx.translate(11, PT + plotH / 2);
    ctx.rotate(-Math.PI / 2);
    ctx.fillText('Output %', 0, 0);
    ctx.restore();

    // ── Dots ──
    const n = points.length;
    points.forEach((pt, i) => {
      const alpha = 0.15 + 0.85 * ((i + 1) / n);
      ctx.fillStyle = `rgba(200,255,0,${alpha.toFixed(2)})`;
      ctx.beginPath();
      ctx.arc(cx(pt.x), cy(pt.y), 4.5, 0, Math.PI * 2);
      ctx.fill();
    });

    // ── Live dot highlight (last point) ──
    if (n > 0) {
      const last = points[n - 1];
      ctx.fillStyle   = '#ffffff';
      ctx.shadowColor = '#C8FF00';
      ctx.shadowBlur  = 8;
      ctx.beginPath();
      ctx.arc(cx(last.x), cy(last.y), 5.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;
    }
  }, [points]);

  return (
    <canvas
      ref={canvasRef}
      style={{ display: 'block', width: '100%', height: '100%' }}
    />
  );
}

// ─── Main component ───────────────────────────────────────────────────────────
function PedalMapping() {
  const [pending, setPending]           = useState('');
  const [applied, setApplied]           = useState('');
  const [liveData, setLiveData]         = useState(null);
  const [connected, setConnected]       = useState(false);
  const [profiles, setProfiles]         = useState([]);
  const [profilesLoading, setProfilesLoading] = useState(true);
  const [tracePoints, setTracePoints]   = useState([]);
  const socketRef = useRef(null);

  // Load profiles from DBC
  useEffect(() => {
    fetch(`${API_BASE}/pedal/profiles`, { headers: getAuthHeaders() })
      .then((r) => r.json())
      .then((data) => { if (Array.isArray(data)) setProfiles(data); })
      .catch(() => {})
      .finally(() => setProfilesLoading(false));
  }, []);

  // Socket.IO
  useEffect(() => {
    const socket = io(getSocketUrl(), { path: '/socket.io', transports: ['websocket', 'polling'] });
    socketRef.current = socket;

    socket.on('connect',    () => setConnected(true));
    socket.on('disconnect', () => setConnected(false));

    socket.on('pedal_mapping', (data) => {
      setLiveData(data);
      if (data?.profile) {
        setPending(prev => prev || data.profile);
        setApplied(prev => prev || data.profile);
      }
      // Accumulate trace points
      if (data?.raw_pct !== undefined && data?.mapped_pct !== undefined) {
        setTracePoints(prev => {
          const next = [...prev, { x: data.raw_pct, y: data.mapped_pct }];
          return next.length > MAX_TRACE ? next.slice(-MAX_TRACE) : next;
        });
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
        headers: {
          'Content-Type': 'application/json',
          ...(sessionStorage.getItem('token') ? { Authorization: `Bearer ${sessionStorage.getItem('token')}` } : {}),
        },
        body: JSON.stringify({ profile: pending, slot: profile?.slot ?? 0 }),
      });
    } catch (err) {
      console.error('Failed to publish profile:', err);
    }
    setApplied(pending);
  };

  const appliedLabel = profiles.find(o => o.value === applied)?.value ?? applied ?? '—';

  // Button style helpers
  const btnBase = {
    padding: '8px 20px',
    borderRadius: 10,
    fontSize: 13,
    fontWeight: 600,
    fontFamily: "'Roboto Mono', monospace",
    cursor: 'pointer',
    border: 'none',
    transition: 'opacity 0.15s',
  };

  return (
    <div style={{
      fontFamily: "'Roboto Mono', monospace",
      color: '#e5e7eb',
      backgroundColor: '#0b1120',
      minHeight: '100vh',
      padding: 'clamp(16px, 4vw, 32px) clamp(12px, 3vw, 24px)',
    }}>
      {/* ── Header ── */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
        <h1 style={{ fontSize: 28, fontWeight: 700, color: '#ffffff', margin: 0 }}>Pedal Mapping</h1>
        <span style={{
          fontSize: 11, fontWeight: 600, padding: '2px 8px', borderRadius: 99,
          background: connected ? '#14532d' : '#3b1616',
          color:      connected ? '#4ade80' : '#f87171',
          letterSpacing: '0.05em',
        }}>
          {connected ? '● LIVE' : '○ OFFLINE'}
        </span>
      </div>
      <p style={{ color: '#9ca3af', fontSize: 13, marginBottom: 32 }}>
        Live pedal sensor data from the simulator.
      </p>

      {/* ── Top row: dropdown + live readings ── */}
      <div style={{ display: 'flex', gap: 32, flexWrap: 'wrap' }}>

        {/* Dropdown + Apply */}
        <div style={{ minWidth: 260, maxWidth: 360, flex: '1 1 260px' }}>
          <label htmlFor="pedal-mapping-select" style={{
            display: 'block', fontSize: 12, color: '#9ca3af',
            marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.05em',
          }}>
            Mapping profile
          </label>
          <select
            id="pedal-mapping-select"
            value={pending}
            onChange={(e) => setPending(e.target.value)}
            disabled={profilesLoading || profiles.length === 0}
            style={{
              width: '100%', backgroundColor: '#101a2e',
              color: pending ? '#e5e7eb' : '#6b7280',
              border: `1px solid ${hasUnappliedChange ? '#f59e0b' : '#23314f'}`,
              borderRadius: 12, padding: '10px 14px', fontSize: 14,
              outline: 'none', cursor: profilesLoading ? 'wait' : 'pointer',
              appearance: 'none',
              backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 20 20' fill='%239ca3af'%3E%3Cpath fill-rule='evenodd' d='M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z' clip-rule='evenodd'/%3E%3C/svg%3E")`,
              backgroundRepeat: 'no-repeat', backgroundPosition: 'right 14px center',
            }}
          >
            <option value="" disabled>
              {profilesLoading ? 'Loading from DBC…' : 'Select a mapping...'}
            </option>
            {profiles.map((opt) => (
              <option key={opt.slot} value={opt.value}>{opt.value}</option>
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
              marginTop: 14, width: '100%', padding: '10px 0',
              borderRadius: 12, border: 'none', fontSize: 14, fontWeight: 600,
              fontFamily: "'Roboto Mono', monospace",
              cursor: hasUnappliedChange ? 'pointer' : 'not-allowed',
              background: hasUnappliedChange ? '#2563eb' : '#1e2d4a',
              color:      hasUnappliedChange ? '#ffffff'  : '#4b5563',
              transition: 'background 0.15s',
            }}
          >
            Apply
          </button>
        </div>

        {/* Live readings */}
        <div style={{
          flex: '2 1 320px', background: '#101a2e',
          border: '1px solid #1e2d4a', borderRadius: 16, padding: '24px 28px',
        }}>
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
              <div style={{ marginBottom: 24, display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={{ fontSize: 12, color: '#9ca3af' }}>Applied</span>
                <span style={{
                  fontSize: 13, fontWeight: 700, color: '#60a5fa',
                  background: '#1a2e4a', border: '1px solid #2563eb44',
                  borderRadius: 8, padding: '3px 12px', letterSpacing: '0.03em',
                }}>
                  {appliedLabel}
                </span>
              </div>

              <Bar label="Raw pedal position" value={liveData.raw_pct}    color="#6366f1" />
              <Bar label="Mapped output"       value={liveData.mapped_pct} color="#22c55e" />

              <div style={{ marginTop: 20, display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 10 }}>
                {[
                  { label: 'Raw ADC',  value: liveData.raw },
                  { label: 'Min raw',  value: liveData.calibration?.min_raw },
                  { label: 'Max raw',  value: liveData.calibration?.max_raw },
                  { label: 'DZ low',   value: `${liveData.calibration?.deadzone_low} %` },
                  { label: 'DZ high',  value: `${liveData.calibration?.deadzone_high} %` },
                  { label: 'Device',   value: liveData.deviceId },
                ].map(({ label, value }) => (
                  <div key={label} style={{ background: '#0d1526', border: '1px solid #1e2d4a', borderRadius: 10, padding: '10px 12px' }}>
                    <div style={{ fontSize: 10, color: '#6b7280', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{label}</div>
                    <div style={{ fontSize: 14, fontWeight: 600, color: '#e5e7eb' }}>{value ?? '—'}</div>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div style={{ color: '#4b5563', fontSize: 13, paddingTop: 8 }}>
              {connected ? 'Waiting for pedal data… start simulate_pedal.py' : 'Not connected to server.'}
            </div>
          )}
        </div>
      </div>

      {/* ── Mapping trace graph ── */}
      <div style={{ marginTop: 40 }}>
        {/* Section header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <div>
            <span style={{ fontSize: 13, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Mapping trace
            </span>
            <span style={{ marginLeft: 10, fontSize: 11, color: '#374151' }}>
              {tracePoints.length} / {MAX_TRACE} pts
            </span>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button
              onClick={() => setTracePoints([])}
              style={{ ...btnBase, background: '#1e2d4a', color: '#9ca3af' }}
            >
              Reset
            </button>
            <button
              disabled
              style={{ ...btnBase, background: '#1e3a1e', color: '#4b6b4b', cursor: 'not-allowed', opacity: 0.6 }}
              title="Not implemented yet"
            >
              Save
            </button>
          </div>
        </div>

        {/* Canvas container */}
        <div style={{
          height: 340,
          background: '#0d1526',
          border: '1px solid #1e2d4a',
          borderRadius: 16,
          overflow: 'hidden',
          position: 'relative',
        }}>
          <TraceGraph points={tracePoints} />
          {tracePoints.length === 0 && (
            <div style={{
              position: 'absolute', inset: 0,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: '#374151', fontSize: 13, pointerEvents: 'none',
            }}>
              Move the pedal to draw the trace
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default PedalMapping;
