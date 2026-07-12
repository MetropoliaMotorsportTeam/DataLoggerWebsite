import React, { useState } from 'react';

const MAPPING_OPTIONS = [
  { value: 'linear', label: 'Linear' },
  { value: 'exponential', label: 'Exponential' },
  { value: 'logarithmic', label: 'Logarithmic' },
  { value: 'custom', label: 'Custom' },
];

function PedalMapping() {
  const [selected, setSelected] = useState('');

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
      <h1 style={{ fontSize: 28, fontWeight: 700, color: '#ffffff', marginBottom: 8 }}>
        Pedal Mapping
      </h1>
      <p style={{ color: '#9ca3af', fontSize: 13, marginBottom: 32 }}>
        Select a pedal mapping profile to apply.
      </p>

      <div style={{ maxWidth: 360 }}>
        <label
          htmlFor="pedal-mapping-select"
          style={{ display: 'block', fontSize: 12, color: '#9ca3af', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.05em' }}
        >
          Mapping profile
        </label>
        <select
          id="pedal-mapping-select"
          value={selected}
          onChange={(e) => setSelected(e.target.value)}
          style={{
            width: '100%',
            backgroundColor: '#101a2e',
            color: selected ? '#e5e7eb' : '#6b7280',
            border: '1px solid #23314f',
            borderRadius: 12,
            padding: '10px 14px',
            fontSize: 14,
            outline: 'none',
            cursor: 'pointer',
            appearance: 'none',
            backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 20 20' fill='%239ca3af'%3E%3Cpath fill-rule='evenodd' d='M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z' clip-rule='evenodd'/%3E%3C/svg%3E")`,
            backgroundRepeat: 'no-repeat',
            backgroundPosition: 'right 14px center',
          }}
        >
          <option value="" disabled>Select a mapping...</option>
          {MAPPING_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>

        {selected && (
          <p style={{ marginTop: 16, fontSize: 13, color: '#60a5fa' }}>
            Selected: <strong>{MAPPING_OPTIONS.find(o => o.value === selected)?.label}</strong>
          </p>
        )}
      </div>
    </div>
  );
}

export default PedalMapping;
