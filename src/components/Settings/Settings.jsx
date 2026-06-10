import React, { useEffect, useMemo, useState } from 'react'

function getApiBase() {
  const explicit = import.meta.env.VITE_API_BASE;
  if (explicit) return explicit.replace(/\/+$/, '');

  const firmwareApi = import.meta.env.VITE_FIRMWARE_API;
  if (firmwareApi) {
    return firmwareApi.replace(/\/+$/, '').replace(/\/firmware$/, '');
  }

  return 'http://localhost:3000/api';
}

function formatFrameId(frameId) {
  const n = Number(frameId);
  if (!Number.isFinite(n)) return String(frameId ?? '-');
  return `${n} (0x${n.toString(16).toUpperCase()})`;
}

function inferDataType(signal) {
  const hasChoices = signal?.choices && Object.keys(signal.choices).length > 0;
  if (hasChoices) return 'enum';
  const bitLen = Number(signal?.length);
  const signed = Boolean(signal?.isSigned);
  if (!Number.isFinite(bitLen)) return signed ? 'int' : 'uint';
  return `${signed ? 'int' : 'uint'}${bitLen}`;
}

function formatRange(signal) {
  const min = signal?.minimum;
  const max = signal?.maximum;
  if (min === null || min === undefined || max === null || max === undefined) return '-';
  return `${min} … ${max}`;
}

async function fetchJson(url) {
  const res = await fetch(url);
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`Request failed (${res.status}): ${text || res.statusText}`);
  }
  return res.json();
}

async function postJson(url, body) {
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body ?? {}),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`Request failed (${res.status}): ${text || res.statusText}`);
  }

  return res.json();
}

function parseMaybeNumber(value) {
  if (value === '' || value === null || value === undefined) return undefined;
  if (typeof value === 'number') return value;
  const trimmed = String(value).trim();
  if (!trimmed) return undefined;
  const n = Number(trimmed);
  return Number.isFinite(n) ? n : trimmed;
}

function hexToBytes(hex) {
  const cleaned = String(hex || '').replace(/^0x/i, '').replace(/\s+/g, '');
  if (!cleaned) return [];
  if (cleaned.length % 2 !== 0) return null;
  if (!/^[0-9a-fA-F]+$/.test(cleaned)) return null;
  const bytes = [];
  for (let i = 0; i < cleaned.length; i += 2) {
    bytes.push(parseInt(cleaned.slice(i, i + 2), 16));
  }
  return bytes;
}

function formatHexByte(b) {
  const n = Number(b);
  if (!Number.isFinite(n)) return '--';
  return n.toString(16).toUpperCase().padStart(2, '0');
}

function formatHexU16(n) {
  const v = Number(n);
  if (!Number.isFinite(v)) return '-';
  return `0x${v.toString(16).toUpperCase().padStart(4, '0')}`;
}

function decodeCarSettingsPayload(binaryPayloadHex) {
  const bytes = hexToBytes(binaryPayloadHex);
  if (bytes === null) return { ok: false, error: 'Invalid hex string' };
  if (bytes.length !== 11) {
    return { ok: false, error: `Expected 11 bytes, got ${bytes.length}`, bytes };
  }
  const canNbr = bytes[0];
  const idLE = (bytes[1] | (bytes[2] << 8)) >>> 0;
  const idBE = ((bytes[1] << 8) | bytes[2]) >>> 0;
  const msg = bytes.slice(3, 11);
  return { ok: true, bytes, canNbr, idLE, idBE, msg };
}

function Settings() {
  const apiBase = useMemo(() => getApiBase(), []);

  const [dbcFiles, setDbcFiles] = useState([]);
  const [dbcDir, setDbcDir] = useState('');
  const [selectedDbc, setSelectedDbc] = useState('');

  const [messages, setMessages] = useState([]);
  const [selectedMessageKey, setSelectedMessageKey] = useState('');

  const [messageQuery, setMessageQuery] = useState('');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const encodeStrict = true;
  const [encodeValues, setEncodeValues] = useState({});
  const [encodeResult, setEncodeResult] = useState(null);
  const [encodeError, setEncodeError] = useState('');
  const [encoding, setEncoding] = useState(false);

  const [mqttTopic, setMqttTopic] = useState('');
  const [mqttDeviceId, setMqttDeviceId] = useState('');
  const [mqttCanNbr, setMqttCanNbr] = useState('');
  const [mqttCanNbrOverride, setMqttCanNbrOverride] = useState(false);
  const [mqttQos, setMqttQos] = useState('0');
  const [showMqttAdvanced, setShowMqttAdvanced] = useState(false);
  const [knownDevices, setKnownDevices] = useState([]);
  const [sendResult, setSendResult] = useState(null);
  const [sendError, setSendError] = useState('');
  const [sending, setSending] = useState(false);

  const selectedMessage = useMemo(() => {
    if (!selectedMessageKey) return null;
    return messages.find((m) => `${m?.name || ''}-${m?.frameId ?? ''}` === selectedMessageKey) || null;
  }, [messages, selectedMessageKey]);

  useEffect(() => {
    setEncodeResult(null);
    setEncodeError('');
    setSendResult(null);
    setSendError('');
    if (!selectedMessage) {
      setEncodeValues({});
      return;
    }

    const next = {};
    const sigs = Array.isArray(selectedMessage?.signals) ? selectedMessage.signals : [];
    for (const s of sigs) {
      const name = s?.name;
      if (!name) continue;

      // Keep existing value if already entered.
      if (encodeValues && Object.prototype.hasOwnProperty.call(encodeValues, name)) {
        next[name] = encodeValues[name];
        continue;
      }
      // Default enum to first numeric choice; default numeric to empty.
      const choices = s?.choices && typeof s.choices === 'object' ? Object.keys(s.choices) : [];
      next[name] = choices.length ? choices.sort((a, b) => Number(a) - Number(b))[0] : '';
    }
    setEncodeValues(next);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedMessageKey]);

  const missingSignalNames = useMemo(() => {
    const sigs = Array.isArray(selectedMessage?.signals) ? selectedMessage.signals : [];
    const missing = [];

    for (const s of sigs) {
      const name = s?.name;
      if (!name) continue;
      const rawValue = encodeValues?.[name];
      const parsed = parseMaybeNumber(rawValue);
      if (parsed === undefined) missing.push(name);
    }

    return missing;
  }, [selectedMessage, encodeValues]);

  const buildSignalsOrSetError = (setErr) => {
    const sigs = Array.isArray(selectedMessage?.signals) ? selectedMessage.signals : [];
    const signals = {};
    const missing = [];

    for (const s of sigs) {
      const name = s?.name;
      if (!name) continue;
      const rawValue = encodeValues?.[name];
      const parsed = parseMaybeNumber(rawValue);
      if (parsed === undefined) {
        missing.push(name);
      } else {
        signals[name] = parsed;
      }
    }

    if (missing.length > 0) {
      setErr(`Missing values for: ${missing.slice(0, 12).join(', ')}${missing.length > 12 ? ` (+${missing.length - 12} more)` : ''}`);
      return null;
    }

    return signals;
  };

  const encodeFrame = async () => {
    if (!selectedDbc || !selectedMessage?.name) return;
    setEncodeError('');
    setEncodeResult(null);
    setEncoding(true);
    try {
      const signals = buildSignalsOrSetError(setEncodeError);
      if (!signals) return;

      const result = await postJson(`${apiBase}/dbc/${encodeURIComponent(selectedDbc)}/encode`, {
        message: selectedMessage.name,
        signals,
        strict: encodeStrict,
      });

      setEncodeResult(result);
    } catch (e) {
      setEncodeError(e?.message || String(e));
    } finally {
      setEncoding(false);
    }
  };

  const sendFrame = async () => {
    if (!selectedDbc || !selectedMessage?.name) return;
    setSendError('');
    setSendResult(null);
    setSending(true);
    try {
      const signals = buildSignalsOrSetError(setSendError);
      if (!signals) return;

      const topic = mqttTopic.trim();
      const deviceId = mqttDeviceId.trim();

      const result = await postJson(`${apiBase}/dbc/${encodeURIComponent(selectedDbc)}/send`, {
        message: selectedMessage.name,
        signals,
        strict: encodeStrict,
        topic: topic || undefined,
        deviceId: deviceId || undefined,
        canNbr: mqttCanNbrOverride && mqttCanNbr !== '' ? Number(mqttCanNbr) : undefined,
        payloadFormat: 'json',
        qos: mqttQos,
      });

      setSendResult(result);
    } catch (e) {
      setSendError(e?.message || String(e));
    } finally {
      setSending(false);
    }
  };

  const copyEncoded = async () => {
    const id = encodeResult?.frame?.id;
    const data = encodeResult?.frame?.data;
    if (id === undefined || !data) return;
    const payload = `${id} ${data}`;
    try {
      await navigator.clipboard.writeText(payload);
    } catch {
      // ignore
    }
  };

  const filteredMessages = useMemo(() => {
    const q = messageQuery.trim().toLowerCase();
    if (!q) return messages;
    return messages.filter((m) => {
      const name = String(m?.name || '').toLowerCase();
      const fid = String(m?.frameId ?? '').toLowerCase();
      return name.includes(q) || fid.includes(q);
    });
  }, [messages, messageQuery]);

  const loadDbcList = async () => {
    setError('');
    setLoading(true);
    try {
      const list = await fetchJson(`${apiBase}/dbc`);
      const files = Array.isArray(list?.files) ? list.files : [];
      setDbcFiles(files);
      setDbcDir(list?.dbcDir || '');
      if (!selectedDbc && files.length > 0) setSelectedDbc(files[0]);
    } catch (e) {
      setError(e?.message || String(e));
    } finally {
      setLoading(false);
    }
  };

  const loadDbc = async (dbcName) => {
    setSelectedMessageKey('');
    setMessages([]);
    setMessageQuery('');

    if (!dbcName) return;

    setError('');
    setLoading(true);
    try {
      const data = await fetchJson(`${apiBase}/dbc/${encodeURIComponent(dbcName)}`);
      const msgs = Array.isArray(data?.messages) ? data.messages : [];
      setMessages(msgs);

      // Auto-select first message for a smoother flow.
      if (msgs.length > 0) {
        const first = msgs[0];
        setSelectedMessageKey(`${first?.name || ''}-${first?.frameId ?? ''}`);
      }
    } catch (e) {
      setError(e?.message || String(e));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDbcList();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [apiBase]);

  useEffect(() => {
    let cancelled = false;

    async function loadDevices() {
      try {
        const data = await fetchJson(`${apiBase}/mqtt/devices`);
        const devices = Array.isArray(data?.devices) ? data.devices : [];
        if (!cancelled) {
          setKnownDevices(devices);
          if (!mqttDeviceId && devices.length > 0) {
            setMqttDeviceId(String(devices[0]?.deviceId || ''));
          }
        }
      } catch {
        // ignore: device discovery is best-effort
      }
    }

    loadDevices();
    const id = setInterval(loadDevices, 5000);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [apiBase]);

  useEffect(() => {
    loadDbc(selectedDbc);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedDbc]);



  return (
    <div className="p-6" style={{ color: 'var(--text-primary)' }}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Car Settings</h1>
          <div className="mt-1 text-sm" style={{ color: 'var(--text-secondary)' }}>Pick a message, fill all signals, then encode or send.</div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div>
            <div className="text-xs uppercase tracking-wide" style={{ color: 'var(--text-secondary)' }}>DBC</div>
            <select
              className="mt-1 w-64 rounded px-3 py-2 text-sm"
              style={{ backgroundColor: 'var(--surface-layer)', color: 'var(--text-primary)', border: '1px solid var(--primary-accent)' }}
              value={selectedDbc}
              onChange={(e) => setSelectedDbc(e.target.value)}
              disabled={loading}
            >
              {dbcFiles.length === 0 ? <option value="">No DBC files</option> : null}
              {dbcFiles.map((f) => (
                <option key={f} value={f}>
                  {f}
                </option>
              ))}
            </select>
            {dbcDir ? <div className="mt-1 text-xs" style={{ color: 'var(--text-secondary)' }}>{dbcDir}</div> : null}
          </div>

          <button
            type="button"
            onClick={loadDbcList}
            disabled={loading}
            className="mt-5 rounded px-3 py-2 text-sm disabled:opacity-60"
            style={{ backgroundColor: 'var(--surface-layer)', border: '1px solid var(--primary-accent)' }}
          >
            Refresh
          </button>
        </div>
      </div>

      {error ? (
        <div className="mt-4 rounded border p-3 text-sm" style={{ borderColor: 'var(--warning-attention)', backgroundColor: 'rgba(255, 193, 7, 0.1)', color: 'var(--warning-attention)' }}>{error}</div>
      ) : null}

    
      <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-12">
        <div className="md:col-span-4">
          <div className="rounded" style={{ backgroundColor: 'var(--surface-layer)', border: '1px solid var(--primary-accent)' }}>
            <div className="p-3" style={{ borderBottom: '1px solid var(--primary-accent)' }}>
              <div className="text-xs uppercase tracking-wide" style={{ color: 'var(--text-secondary)' }}>Messages</div>
              <input
                className="mt-2 w-full rounded px-3 py-2 text-sm placeholder:text-zinc-500"
                style={{ backgroundColor: 'var(--background-base)', color: 'var(--text-primary)', border: '1px solid var(--primary-accent)' }}
                placeholder="Search messages…"
                value={messageQuery}
                onChange={(e) => setMessageQuery(e.target.value)}
              />
            </div>

            <div className="max-h-[70vh] overflow-auto p-2">
              {filteredMessages.map((m) => {
                const key = `${m?.name || ''}-${m?.frameId ?? ''}`;
                const isSelected = key === selectedMessageKey;
                const sigCount = Array.isArray(m?.signals) ? m.signals.length : 0;
                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setSelectedMessageKey(key)}
                    className={`w-full rounded px-3 py-2 text-left text-sm border ${isSelected ? '' : 'border-transparent'}`}
                    style={{
                      backgroundColor: isSelected ? 'var(--background-base)' : 'transparent',
                      borderColor: isSelected ? 'var(--primary-accent)' : 'transparent'
                    }}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="font-medium truncate" style={{ color: 'var(--text-primary)' }}>{m?.name || '-'}</div>
                      <div className="text-xs shrink-0" style={{ color: 'var(--text-secondary)' }}>{m?.length ?? '-'}B</div>
                    </div>
                    <div className="mt-0.5 flex items-center justify-between gap-2 text-xs" style={{ color: 'var(--text-secondary)' }}>
                      <div className="truncate">{formatFrameId(m?.frameId)}</div>
                      <div className="shrink-0">{sigCount} sig</div>
                    </div>
                  </button>
                );
              })}

              {!loading && filteredMessages.length === 0 ? (
                <div className="px-3 py-6 text-center text-sm" style={{ color: 'var(--text-secondary)' }}>No messages found.</div>
              ) : null}
            </div>
          </div>
        </div>

        <div className="md:col-span-8">
          {!selectedMessage ? (
            <div className="rounded p-6 text-sm" style={{ backgroundColor: 'var(--surface-layer)', border: '1px solid var(--primary-accent)', color: 'var(--text-secondary)' }}>
              Select a message to view signals.
            </div>
          ) : (
            <div className="space-y-4">
              <div className="rounded p-4" style={{ backgroundColor: 'var(--surface-layer)', border: '1px solid var(--primary-accent)' }}>
                <div className="text-xs uppercase tracking-wide" style={{ color: 'var(--text-secondary)' }}>Selected message</div>
                <div className="mt-1 text-lg font-semibold">
                  {selectedMessage.name}{' '}
                  <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>({formatFrameId(selectedMessage.frameId)})</span>
                </div>
                <div className="mt-1 text-sm" style={{ color: 'var(--text-secondary)' }}>
                  DLC: {selectedMessage.length ?? '-'} bytes · Signals: {Array.isArray(selectedMessage?.signals) ? selectedMessage.signals.length : 0}
                </div>
              </div>

              <div className="rounded p-4" style={{ backgroundColor: 'var(--surface-layer)', border: '1px solid var(--primary-accent)' }}>
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <div className="text-xs uppercase tracking-wide" style={{ color: 'var(--text-secondary)' }}>Send</div>
                    <div className="mt-1 text-sm" style={{ color: 'var(--text-primary)' }}>Fill every signal value before sending.</div>
                  </div>

                  <div className="flex flex-wrap items-center gap-3">
                    <button
                      type="button"
                      onClick={encodeFrame}
                      disabled={encoding || sending || loading || missingSignalNames.length > 0}
                      className="rounded px-3 py-2 text-sm disabled:opacity-60"
                      style={{ backgroundColor: 'var(--background-base)', border: '1px solid var(--primary-accent)' }}
                    >
                      {encoding ? 'Encoding…' : 'Encode'}
                    </button>
                    <button
                      type="button"
                      onClick={sendFrame}
                      disabled={sending || loading || missingSignalNames.length > 0}
                      className="rounded px-3 py-2 text-sm font-medium disabled:opacity-60"
                      style={{ backgroundColor: 'var(--accent-highlight)', color: 'var(--background-base)' }}
                    >
                      {sending ? 'Sending…' : 'Send via MQTT'}
                    </button>
                  </div>
                </div>

                {missingSignalNames.length > 0 ? (
                  <div className="mt-3 rounded border p-3 text-sm" style={{ borderColor: 'var(--warning-attention)', backgroundColor: 'rgba(255, 193, 7, 0.1)', color: 'var(--warning-attention)' }}>
                    Missing {missingSignalNames.length} signal value{missingSignalNames.length === 1 ? '' : 's'}.
                    <div className="mt-1 text-xs" style={{ color: 'rgba(255, 193, 7, 0.8)' }}>
                      {missingSignalNames.slice(0, 10).join(', ')}
                      {missingSignalNames.length > 10 ? ` (+${missingSignalNames.length - 10} more)` : ''}
                    </div>
                  </div>
                ) : null}

                {encodeError ? (
                  <div className="mt-3 rounded border p-3 text-sm" style={{ borderColor: 'var(--warning-attention)', backgroundColor: 'rgba(255, 193, 7, 0.1)', color: 'var(--warning-attention)' }}>
                    {encodeError}
                  </div>
                ) : null}

                {sendError ? (
                  <div className="mt-3 rounded border p-3 text-sm" style={{ borderColor: 'var(--warning-attention)', backgroundColor: 'rgba(255, 193, 7, 0.1)', color: 'var(--warning-attention)' }}>
                    {sendError}
                  </div>
                ) : null}

              
                <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-2">
                  <div>
                 
                    <div className="mt-1 flex gap-2">
                    
                     
                    </div>
                    
                  </div>

                </div>

                {showMqttAdvanced ? (
                  <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-3">
                    <div>
                      <div className="text-xs uppercase tracking-wide" style={{ color: 'var(--text-secondary)' }}>MQTT topic (optional)</div>
                      <input
                        className="mt-1 w-full rounded px-3 py-2 text-sm placeholder:text-zinc-500"
                        style={{ backgroundColor: 'var(--background-base)', color: 'var(--text-primary)', border: '1px solid var(--primary-accent)' }}
                        placeholder="Leave empty to use server MQTT_TX_TOPIC"
                        value={mqttTopic}
                        onChange={(e) => setMqttTopic(e.target.value)}
                      />
                    </div>
                    <div>
                      <div className="text-xs uppercase tracking-wide" style={{ color: 'var(--text-secondary)' }}>CAN bus (canNbr)</div>
                      <div className="mt-1 flex items-center gap-2">
                        <input
                          id="canNbrOverride"
                          type="checkbox"
                          checked={mqttCanNbrOverride}
                          onChange={(e) => setMqttCanNbrOverride(e.target.checked)}
                        />
                        <label htmlFor="canNbrOverride" className="text-sm" style={{ color: 'var(--text-primary)' }}>
                          Override
                        </label>
                      </div>
                      <select
                        className="mt-2 w-full rounded px-3 py-2 text-sm disabled:opacity-60"
                        style={{ backgroundColor: 'var(--background-base)', color: 'var(--text-primary)', border: '1px solid var(--primary-accent)' }}
                        value={mqttCanNbr}
                        onChange={(e) => setMqttCanNbr(e.target.value)}
                        disabled={!mqttCanNbrOverride}
                      >
                        <option value="">Auto</option>
                        <option value="0">0</option>
                        <option value="1">1</option>
                        <option value="2">2</option>
                      </select>
                      <div className="mt-1 text-xs" style={{ color: 'var(--text-secondary)' }}>
                        Default is automatic: server prefers last-seen bus from telemetry for this frame ID.
                      </div>
                    </div>
                    <div>
                      <div className="text-xs uppercase tracking-wide" style={{ color: 'var(--text-secondary)' }}>QoS</div>
                      <select
                        className="mt-1 w-full rounded px-3 py-2 text-sm"
                        style={{ backgroundColor: 'var(--background-base)', color: 'var(--text-primary)', border: '1px solid var(--primary-accent)' }}
                        value={mqttQos}
                        onChange={(e) => setMqttQos(e.target.value)}
                      >
                        <option value="0">0</option>
                        <option value="1">1</option>
                        <option value="2">2</option>
                      </select>
                    </div>
                  </div>
                ) : null}

                <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2">
                  {(Array.isArray(selectedMessage?.signals) ? selectedMessage.signals : []).filter((sig) => sig?.name).map((sig) => {
                      const name = sig?.name;
                      const hasChoices = sig?.choices && Object.keys(sig.choices).length > 0;
                      const value = encodeValues?.[name] ?? '';

                      return (
                        <div key={name} className="rounded p-3" style={{ backgroundColor: 'var(--background-base)', border: '1px solid var(--primary-accent)' }}>
                          <div className="flex items-center justify-between gap-2">
                            <div className="text-sm font-medium truncate" style={{ color: 'var(--text-primary)' }}>{name}</div>
                            <div className="text-xs" style={{ color: 'var(--text-secondary)' }}>{sig?.unit || ''}</div>
                          </div>

                          <div className="mt-2">
                            {hasChoices ? (
                              <select
                                className="w-full rounded px-3 py-2 text-sm"
                                style={{ backgroundColor: 'var(--surface-layer)', color: 'var(--text-primary)', border: '1px solid var(--primary-accent)' }}
                                value={String(value)}
                                onChange={(e) => setEncodeValues((prev) => ({ ...prev, [name]: e.target.value }))}
                              >
                                {Object.entries(sig.choices)
                                  .sort((a, b) => Number(a[0]) - Number(b[0]))
                                  .map(([k, v]) => (
                                    <option key={k} value={k}>
                                      {k}: {String(v)}
                                    </option>
                                  ))}
                              </select>
                            ) : (
                              <input
                                className="w-full rounded px-3 py-2 text-sm placeholder:text-zinc-500"
                                style={{ backgroundColor: 'var(--surface-layer)', color: 'var(--text-primary)', border: '1px solid var(--primary-accent)' }}
                                placeholder="Enter value"
                                value={value}
                                onChange={(e) => setEncodeValues((prev) => ({ ...prev, [name]: e.target.value }))}
                              />
                            )}
                          </div>

                          <div className="mt-2 text-xs" style={{ color: 'var(--text-secondary)' }}>
                            {inferDataType(sig)} · Range: {formatRange(sig)}
                          </div>
                        </div>
                      );
                    })}
                </div>

                {encodeResult?.frame ? (
                  <div className="mt-4 rounded p-3" style={{ backgroundColor: 'var(--background-base)', border: '1px solid var(--primary-accent)' }}>
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div className="text-sm" style={{ color: 'var(--text-primary)' }}>
                        Encoded: <span className="font-semibold">{formatFrameId(encodeResult.frame.id)}</span>
                        <span className="ml-2 font-mono" style={{ color: 'var(--text-primary)' }}>{encodeResult.frame.data}</span>
                      </div>
                      <button
                        type="button"
                        onClick={copyEncoded}
                        className="rounded px-3 py-2 text-sm"
                        style={{ backgroundColor: 'var(--surface-layer)', border: '1px solid var(--primary-accent)' }}
                      >
                        Copy
                      </button>
                    </div>
                  </div>
                ) : null}

                {sendResult?.published ? (
                  <div className="mt-3 rounded border p-3 text-sm" style={{ borderColor: 'var(--success-positive)', backgroundColor: 'rgba(128, 255, 128, 0.1)', color: 'var(--success-positive)' }}>
                    Published to <span className="font-mono">{sendResult.topic}</span> (QoS {sendResult.qos}).
                    {sendResult.payloadFormat === 'binary' && sendResult.binaryPayloadHex ? (
                      <div className="mt-2 space-y-2 text-xs" style={{ color: 'rgba(128, 255, 128, 0.9)' }}>
                        <div>
                          Binary payload (hex):{' '}
                          <span className="font-mono break-all">{String(sendResult.binaryPayloadHex)}</span>
                        </div>

                        {(() => {
                          const decoded = decodeCarSettingsPayload(sendResult.binaryPayloadHex);
                          if (!decoded.ok) {
                            return (
                              <div className="rounded border p-2" style={{ borderColor: 'var(--warning-attention)', backgroundColor: 'rgba(255, 193, 7, 0.1)', color: 'var(--warning-attention)' }}>
                                Could not decode as{' '}
                                <span className="font-mono">{'{ uint8_t canNbr, uint16_t id, uint8_t msg[8] }'}</span>: {decoded.error}
                              </div>
                            );
                          }

                          const bytesPretty = decoded.bytes.map(formatHexByte).join(' ');
                          const msgPretty = decoded.msg.map(formatHexByte).join(' ');
                          return (
                            <div className="rounded border p-2" style={{ borderColor: 'rgba(128, 255, 128, 0.6)', backgroundColor: 'rgba(128, 255, 128, 0.05)' }}>
                              <div className="font-semibold" style={{ color: 'var(--success-positive)' }}>Decoded payload (for verification)</div>
                              <div className="mt-1 grid grid-cols-1 gap-1 md:grid-cols-2">
                                <div>
                                  canNbr: <span className="font-mono">{decoded.canNbr}</span>
                                </div>
                                <div>
                                  msg[8]: <span className="font-mono">{msgPretty}</span>
                                </div>
                                <div>
                                  id (LE): <span className="font-mono">{decoded.idLE} ({formatHexU16(decoded.idLE)})</span>
                                </div>
                                <div>
                                  id (BE): <span className="font-mono">{decoded.idBE} ({formatHexU16(decoded.idBE)})</span>
                                </div>
                              </div>
                              <div className="mt-2 flex flex-wrap gap-2">
                                <button
                                  type="button"
                                  onClick={async () => {
                                    try {
                                      await navigator.clipboard.writeText(String(sendResult.binaryPayloadHex));
                                    } catch {
                                      // ignore
                                    }
                                  }}
                                  className="rounded px-2 py-1 text-xs"
                                  style={{ backgroundColor: 'rgba(128, 255, 128, 0.2)' }}
                                >
                                  Copy hex
                                </button>
                                <button
                                  type="button"
                                  onClick={async () => {
                                    try {
                                      const asJson = JSON.stringify(
                                        {
                                          canNbr: decoded.canNbr,
                                          idLE: decoded.idLE,
                                          idBE: decoded.idBE,
                                          msg: decoded.msg,
                                          msgHex: decoded.msg.map(formatHexByte).join(''),
                                        },
                                        null,
                                        2
                                      );
                                      await navigator.clipboard.writeText(asJson);
                                    } catch {
                                      // ignore
                                    }
                                  }}
                                  className="rounded px-2 py-1 text-xs"
                                  style={{ backgroundColor: 'rgba(128, 255, 128, 0.2)' }}
                                >
                                  Copy decoded JSON
                                </button>
                              </div>
                              <div className="mt-2 text-[11px]" style={{ color: 'rgba(128, 255, 128, 0.8)' }}>
                                Note: only one of LE/BE matches firmware. Configure server with{' '}
                                <span className="font-mono">MQTT_TX_ID_ENDIAN</span>.
                              </div>
                            </div>
                          );
                        })()}
                      </div>
                    ) : null}
                  </div>
                ) : null}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default Settings