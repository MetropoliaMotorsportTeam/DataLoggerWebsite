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

function formatEnumValues(choices) {
  if (!choices || typeof choices !== 'object') return '-';
  const entries = Object.entries(choices);
  if (entries.length === 0) return '-';
  entries.sort((a, b) => Number(a[0]) - Number(b[0]));
  return entries.map(([k, v]) => `${k}: ${v}`).join(', ');
}

async function fetchJson(url) {
  const res = await fetch(url);
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`Request failed (${res.status}): ${text || res.statusText}`);
  }
  return res.json();
}

function Settings() {
  const apiBase = useMemo(() => getApiBase(), []);

  const [dbcFiles, setDbcFiles] = useState([]);
  const [dbcDir, setDbcDir] = useState('');
  const [selectedDbc, setSelectedDbc] = useState('');

  const [messages, setMessages] = useState([]);
  const [selectedMessageKey, setSelectedMessageKey] = useState('');

  const [messageQuery, setMessageQuery] = useState('');
  const [signalQuery, setSignalQuery] = useState('');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const selectedMessage = useMemo(() => {
    if (!selectedMessageKey) return null;
    return messages.find((m) => `${m?.name || ''}-${m?.frameId ?? ''}` === selectedMessageKey) || null;
  }, [messages, selectedMessageKey]);

  const filteredMessages = useMemo(() => {
    const q = messageQuery.trim().toLowerCase();
    if (!q) return messages;
    return messages.filter((m) => {
      const name = String(m?.name || '').toLowerCase();
      const fid = String(m?.frameId ?? '').toLowerCase();
      return name.includes(q) || fid.includes(q);
    });
  }, [messages, messageQuery]);

  const signalEntries = useMemo(() => {
    const sigs = Array.isArray(selectedMessage?.signals) ? selectedMessage.signals : [];
    const rows = sigs.map((s) => ({
      signalName: s?.name || '-',
      dataType: inferDataType(s),
      range: formatRange(s),
      unit: s?.unit || '-',
      enumValues: s?.choices && Object.keys(s.choices).length ? formatEnumValues(s.choices) : '-',
    }));

    const q = signalQuery.trim().toLowerCase();
    if (!q) return rows;

    return rows.filter((r) => {
      return (
        String(r.signalName).toLowerCase().includes(q) ||
        String(r.unit).toLowerCase().includes(q) ||
        String(r.enumValues).toLowerCase().includes(q)
      );
    });
  }, [selectedMessage, signalQuery]);

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
    setSignalQuery('');

    if (!dbcName) return;

    setError('');
    setLoading(true);
    try {
      const data = await fetchJson(`${apiBase}/dbc/${encodeURIComponent(dbcName)}`);
      const msgs = Array.isArray(data?.messages) ? data.messages : [];
      setMessages(msgs);
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
    loadDbc(selectedDbc);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedDbc]);

  return (
    <div className="p-6 text-white">
      <div className="flex items-center justify-between gap-4">
        <h1 className="text-2xl font-semibold">Car Settings</h1>
        <button
          type="button"
          onClick={loadDbcList}
          className="rounded bg-zinc-800 px-3 py-2 text-sm hover:bg-zinc-700 disabled:opacity-60"
          disabled={loading}
        >
          Refresh
        </button>
      </div>

      <div className="mt-4 rounded border border-zinc-800 bg-zinc-900 p-4">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <div>
            <div className="text-xs uppercase tracking-wide text-zinc-400">DBC dir (server)</div>
            <div className="mt-1 break-all text-sm text-zinc-200">{dbcDir || '-'}</div>
          </div>
          <div>
            <div className="text-xs uppercase tracking-wide text-zinc-400">DBC file</div>
            <select
              className="mt-1 w-full rounded bg-zinc-800 px-3 py-2 text-sm text-zinc-100"
              value={selectedDbc}
              onChange={(e) => setSelectedDbc(e.target.value)}
              disabled={dbcFiles.length === 0 || loading}
            >
              {dbcFiles.length === 0 ? (
                <option value="">No DBC files found</option>
              ) : (
                dbcFiles.map((f) => (
                  <option key={f} value={f}>
                    {f}
                  </option>
                ))
              )}
            </select>
          </div>
          <div>
            <div className="text-xs uppercase tracking-wide text-zinc-400">Message search</div>
            <input
              className="mt-1 w-full rounded bg-zinc-800 px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-500"
              placeholder="Filter messages…"
              value={messageQuery}
              onChange={(e) => setMessageQuery(e.target.value)}
            />
          </div>
        </div>

        {error ? (
          <div className="mt-4 rounded border border-red-900 bg-red-950 p-3 text-sm text-red-200">
            {error}
          </div>
        ) : null}

        {loading ? (
          <div className="mt-3 text-sm text-zinc-400">Loading…</div>
        ) : (
          <div className="mt-3 text-sm text-zinc-400">
            Messages: {filteredMessages.length} / {messages.length}
          </div>
        )}
      </div>

      <div className="mt-6 overflow-x-auto rounded border border-zinc-800">
        <table className="min-w-full border-collapse bg-zinc-950 text-left text-sm">
          <thead className="bg-zinc-900 text-zinc-200">
            <tr>
              <th className="px-3 py-2 font-semibold">Message</th>
              <th className="px-3 py-2 font-semibold">Frame ID</th>
              <th className="px-3 py-2 font-semibold">DLC</th>
              <th className="px-3 py-2 font-semibold">Signals</th>
            </tr>
          </thead>
          <tbody>
            {filteredMessages.map((m) => {
              const key = `${m?.name || ''}-${m?.frameId ?? ''}`;
              const isSelected = key === selectedMessageKey;
              const sigCount = Array.isArray(m?.signals) ? m.signals.length : 0;
              return (
                <tr
                  key={key}
                  className={`border-t border-zinc-800 cursor-pointer ${isSelected ? 'bg-zinc-900' : 'hover:bg-zinc-900/60'}`}
                  onClick={() => setSelectedMessageKey(key)}
                >
                  <td className="px-3 py-2 font-medium text-zinc-100">{m?.name || '-'}</td>
                  <td className="px-3 py-2 text-zinc-200">{formatFrameId(m?.frameId)}</td>
                  <td className="px-3 py-2 text-zinc-200">{m?.length ?? '-'}</td>
                  <td className="px-3 py-2 text-zinc-200">{sigCount}</td>
                </tr>
              );
            })}

            {!loading && filteredMessages.length === 0 ? (
              <tr>
                <td className="px-3 py-6 text-center text-zinc-400" colSpan={4}>
                  No messages found.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>

      {selectedMessage ? (
        <div className="mt-6">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <div className="text-xs uppercase tracking-wide text-zinc-400">Selected message</div>
              <div className="mt-1 text-lg font-semibold">
                {selectedMessage.name} <span className="text-sm text-zinc-400">({formatFrameId(selectedMessage.frameId)})</span>
              </div>
            </div>

            <div className="min-w-[240px]">
              <div className="text-xs uppercase tracking-wide text-zinc-400">Signal search</div>
              <input
                className="mt-1 w-full rounded bg-zinc-800 px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-500"
                placeholder="Filter signals…"
                value={signalQuery}
                onChange={(e) => setSignalQuery(e.target.value)}
              />
            </div>
          </div>

          <div className="mt-3 overflow-x-auto rounded border border-zinc-800">
            <table className="min-w-full border-collapse bg-zinc-950 text-left text-sm">
              <thead className="bg-zinc-900 text-zinc-200">
                <tr>
                  <th className="px-3 py-2 font-semibold">Signal name</th>
                  <th className="px-3 py-2 font-semibold">Data type</th>
                  <th className="px-3 py-2 font-semibold">Value range</th>
                  <th className="px-3 py-2 font-semibold">Unit</th>
                  <th className="px-3 py-2 font-semibold">Enum values</th>
                </tr>
              </thead>
              <tbody>
                {signalEntries.map((s) => (
                  <tr key={s.signalName} className="border-t border-zinc-800">
                    <td className="px-3 py-2 font-medium text-zinc-100">{s.signalName}</td>
                    <td className="px-3 py-2 text-zinc-200">{s.dataType}</td>
                    <td className="px-3 py-2 text-zinc-200">{s.range}</td>
                    <td className="px-3 py-2 text-zinc-200">{s.unit}</td>
                    <td className="px-3 py-2 text-zinc-200">
                      {s.enumValues !== '-' ? (
                        <span className="block max-w-[520px] truncate" title={s.enumValues}>{s.enumValues}</span>
                      ) : (
                        '-'
                      )}
                    </td>
                  </tr>
                ))}

                {signalEntries.length === 0 ? (
                  <tr>
                    <td className="px-3 py-6 text-center text-zinc-400" colSpan={5}>
                      No signals found.
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="mt-6 text-sm text-zinc-400">
          Click a message to view its signals.
        </div>
      )}
    </div>
  )
}

export default Settings