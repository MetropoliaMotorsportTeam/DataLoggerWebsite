import React, { useEffect, useState, useRef, useCallback} from 'react';
import { io } from 'socket.io-client';
import * as d3 from 'd3';
import './DataMonitoring.css';

const MAX_DATA_POINTS = 2000;
const API_BASE_URL = 'http://localhost:3000';


import { TIMEFRAME_OPTIONS } from '../../config/timeframeOptions';
import { getSignalConfig } from '../../config/signalConfig';



const calculateStats = (data = []) => {
  if (data.length === 0) return { min: 0, max: 0, avg: 0, latest: 0 };
  const values = data.map(point => (typeof point === 'number' ? point : point.value));
  const latest = values[values.length - 1];
  const min = d3.min(values);
  const max = d3.max(values);
  const avg = d3.mean(values);
  return { min, max, avg, latest };
};

// --- UI Components ---

import { SignalSelector } from './SignalSelector';
import { StatCard } from './StatCard';
import { CanvasLinePlot } from './CanvasLinePlot';

// --- Main Component ---
function DataMonitoring() {
  const [stats, setStats] = useState({});
  const [selectedSignals, setSelectedSignals] = useState([]);
  const [availableSignals, setAvailableSignals] = useState([]);
  const [socketStatus, setSocketStatus] = useState('Connecting');
  const [isLiveMode, setIsLiveMode] = useState(true);
  const [persistedSignals, setPersistedSignals] = useState([]);
  const [saveMessage, setSaveMessage] = useState('No saved signal filter active');
  const [timeframe, setTimeframe] = useState('5m');
  const [historicalStatus, setHistoricalStatus] = useState('Select signals and a timeframe to load history');
  const plotRef = useRef(null);
  const socketRef = useRef(null);
  const selectedSignalsRef = useRef(selectedSignals);
  const liveModeRef = useRef(isLiveMode);

  useEffect(() => {
    selectedSignalsRef.current = selectedSignals;
  }, [selectedSignals]);

  useEffect(() => {
    liveModeRef.current = isLiveMode;
  }, [isLiveMode]);

  useEffect(() => {
        console.log("Historical effect", isLiveMode);
    if (isLiveMode) return;

    let cancelled = false;

    const loadSignalNamesFromDb = async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/signal/names`);
        if (!response.ok) {
          throw new Error(`Name request failed (${response.status})`);
        }

        const data = await response.json();
        console.log("Historical response:", data);
        if (cancelled) return;

        const signalNames = Array.isArray(data.names) ? data.names.map((name) => String(name)).filter(Boolean) : [];
        const merged = Array.from(new Set([...signalNames, ...selectedSignalsRef.current])).sort();
        setAvailableSignals(merged);

        if (merged.length > 0) {
          setHistoricalStatus(`Loaded ${merged.length} signal name${merged.length > 1 ? 's' : ''} from DynamoDB.`);
        } else {
          setHistoricalStatus('No signal names found in DynamoDB.');
        }
      } catch (error) {
        if (cancelled) return;
        setHistoricalStatus(`Failed to load signal names: ${error.message}`);
      }
    };

    loadSignalNamesFromDb();

    return () => {
      cancelled = true;
    };
  }, [isLiveMode]);

  useEffect(() => {
    const socket = io('http://localhost:3000');
    socketRef.current = socket;

    const handler = (data) => {
      const frames = data?.decodedFrames || [];
      if (!frames.length) return;

      const currentSignals = selectedSignalsRef.current;
      const newAvailableSignals = new Set();

      frames.forEach((frame) => {
        if (frame.decoded) {
          Object.entries(frame.decoded).forEach(([signalName, value]) => {
            newAvailableSignals.add(signalName);

            if (liveModeRef.current && currentSignals.includes(signalName) && typeof value === 'number') {
              plotRef.current?.push(signalName, value, Number(frame.timestamp) || Date.now());
            }
          });
        }
      });

      if (newAvailableSignals.size > 0) {
        setAvailableSignals((prev) => {
          const combined = new Set([...prev, ...newAvailableSignals]);
          return Array.from(combined).sort();
        });
      }
    };

    socket.on('connect', () => {
      setSocketStatus('Connected');
    });

    socket.on('telemetry', handler);

    socket.on('persisted_signals', ({ signals = [] } = {}) => {
      const normalized = Array.isArray(signals) ? signals.map((signal) => String(signal)).sort() : [];
      setPersistedSignals(normalized);
      setSaveMessage(
        normalized.length > 0
          ? `Backend will save ${normalized.length} selected signal${normalized.length > 1 ? 's' : ''} on change only.`
          : 'No saved signal filter active',
      );
    });

    socket.on('disconnect', () => {
      setSocketStatus('Disconnected');
    });

    return () => {
      socket.off('telemetry', handler);
      socket.disconnect();
    };
  }, []);

  useEffect(() => {
    if (isLiveMode) {
      setHistoricalStatus('Live mode enabled. Historical plotting is paused.');
      return;
    }

    if (selectedSignals.length === 0) {
      plotRef.current?.clear();
      setHistoricalStatus('Select signals and a timeframe to load history');
      return;
    }

    const selectedWindow = TIMEFRAME_OPTIONS.find(option => option.value === timeframe) || TIMEFRAME_OPTIONS[0];
    const to = Date.now();
    const from = to - selectedWindow.ms;
    console.log({
  now: Date.now(),
  from,
  to,
  selectedSignals,
});
    let cancelled = false;

    const loadHistoricalData = async () => {
      setHistoricalStatus(`Loading ${selectedSignals.length} signal${selectedSignals.length > 1 ? 's' : ''} for ${selectedWindow.label}...`);
      try {
        const response = await fetch(`${API_BASE_URL}/signal/range`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            names: selectedSignals,
            from,
            to,
          }),
        });

        if (!response.ok) {
          throw new Error(`History request failed (${response.status})`);
        }

        const data = await response.json();
        console.log("Historical response:", data);
        if (cancelled) return;

        plotRef.current?.setSeries(data.series || {});
        setHistoricalStatus(`Loaded ${selectedSignals.length} signal${selectedSignals.length > 1 ? 's' : ''} for ${selectedWindow.label}`);
      } catch (error) {
        if (cancelled) return;
        setHistoricalStatus(`History load failed: ${error.message}`);
      }
    };

    loadHistoricalData();

    return () => {
      cancelled = true;
    };
  }, [selectedSignals, timeframe, isLiveMode]);

  // Update stats periodically from whichever series is visible.
  useEffect(() => {
    if (selectedSignals.length === 0) return;

    const interval = setInterval(() => {
      const series = plotRef.current?.getSeries();
      if (series) {
        const newStats = {};
        for (const [signal, data] of series.entries()) {
          newStats[signal] = calculateStats(data);
        }
        setStats(newStats);
      }
    }, 500);

    return () => clearInterval(interval);
  }, [selectedSignals, isLiveMode, timeframe]);

  const handleSaveSelectedSignals = useCallback(() => {
    const socket = socketRef.current;
    if (!socket || socketStatus !== 'Connected') {
      setSaveMessage('Connect to the backend first.');
      return;
    }

    socket.emit('save_selected_signals', selectedSignals);
    setSaveMessage(
      selectedSignals.length > 0
        ? `Saving ${selectedSignals.length} selected signal${selectedSignals.length > 1 ? 's' : ''}.`
        : 'Cleared saved signal filter.',
    );
  }, [selectedSignals, socketStatus]);

  const handleClearSavedSignals = useCallback(() => {
    const socket = socketRef.current;
    if (!socket || socketStatus !== 'Connected') {
      setSaveMessage('Connect to the backend first.');
      return;
    }

    socket.emit('clear_selected_signals');
    setSaveMessage('Cleared saved signal filter.');
  }, [socketStatus]);

  const handleLiveModeToggle = useCallback(() => {
    setIsLiveMode((previous) => {
      const next = !previous;
      if (next) {
        plotRef.current?.clear();
        setStats({});
        setHistoricalStatus('Live mode enabled. Historical plotting is paused.');
      } else {
        setHistoricalStatus('Historical mode enabled. Loading selected timeframe...');
      }
      return next;
    });
  }, []);

  const handleSignalChange = useCallback((signal) => {
    setSelectedSignals(prev => {
      const newSelected = new Set(prev);
      if (newSelected.has(signal)) {
        newSelected.delete(signal);
      } else {
        newSelected.add(signal);
      }
      const sorted = Array.from(newSelected).sort();
      
      if (sorted.length === 0) {
        plotRef.current?.clear();
        setStats({});
      }
      
      return sorted;
    });
  }, []);

  return (
    <div className="p-4 md:p-6 bg-black min-h-screen text-gray-200" style={{ fontFamily: "'Roboto Mono', monospace" }}>
      <div className="max-w-7xl mx-auto">
        <header className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6">
          <div>
            <h1 className="text-3xl font-bold text-white">Telemetry Dashboard</h1>
            <div className="flex items-center mt-1">
              <div className={`w-2 h-2 rounded-full mr-2 ${socketStatus === 'Connected' ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`}></div>
              <p className="text-xs text-gray-400">{socketStatus}</p>
            </div>
          </div>
          <div className="mt-4 md:mt-0 flex flex-col items-start md:items-end gap-3">
            <button
              type="button"
              onClick={handleLiveModeToggle}
              className={`rounded-md px-4 py-2 text-sm font-semibold transition-colors ${isLiveMode ? 'border border-blue-500/40 bg-blue-500/10 text-blue-100 hover:bg-blue-500/20' : 'border border-amber-500/40 bg-amber-500/10 text-amber-100 hover:bg-amber-500/20'}`}
            >
              {isLiveMode ? 'Live mode: ON' : 'Live mode: OFF'}
            </button>
            <div className="flex items-center gap-2">
              <label htmlFor="timeframe" className="text-xs uppercase tracking-wide text-gray-400">Timeframe</label>
              <select
                id="timeframe"
                value={timeframe}
                onChange={(event) => setTimeframe(event.target.value)}
                disabled={isLiveMode}
                className="rounded-md border border-gray-600 bg-gray-800/70 px-3 py-2 text-sm text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {TIMEFRAME_OPTIONS.map(option => (
                  <option key={option.value} value={option.value}>{option.label}</option>
                ))}
              </select>
            </div>
            <SignalSelector signals={availableSignals} selectedSignals={selectedSignals} toggleSignal={handleSignalChange} />
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={handleSaveSelectedSignals}
                className="rounded-md border border-emerald-500/40 bg-emerald-500/10 px-4 py-2 text-sm font-semibold text-emerald-100 hover:bg-emerald-500/20 transition-colors"
              >
                Save selected signals (change-only)
              </button>
              <button
                type="button"
                onClick={handleClearSavedSignals}
                className="rounded-md border border-gray-600 bg-gray-800/60 px-4 py-2 text-sm font-semibold text-gray-200 hover:bg-gray-700/60 transition-colors"
              >
                Clear saved filter
              </button>
            </div>
            <p className="max-w-sm text-right text-xs text-gray-400">
              {saveMessage}
              {persistedSignals.length > 0 ? ` Current backend filter: ${persistedSignals.join(', ')}.` : ''}
            </p>
            <p className="max-w-sm text-right text-xs text-gray-500">
              {isLiveMode ? 'Live streaming chart is active.' : historicalStatus}
            </p>
          </div>
        </header>

        <main className="grid grid-cols-1 gap-6">
          {selectedSignals.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {selectedSignals.map(signal => {
                const config = getSignalConfig(signal);
                return <StatCard key={signal} label={signal} stats={stats[signal] || {}} unit={config.unit} color={config.color} />;
              })}
            </div>
          )}
          
          <div>
            <CanvasLinePlot ref={plotRef} signalNames={selectedSignals} />
          </div>
        </main>
      </div>
    </div>
  );
}

export default DataMonitoring;
