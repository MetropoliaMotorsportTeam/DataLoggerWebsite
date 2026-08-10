import React, { useEffect, useState, useRef, useCallback} from 'react';
import { io } from 'socket.io-client';
import './DataMonitoring.css';

const MAX_DATA_POINTS = 2000;

import { TIMEFRAME_OPTIONS } from '../../config/timeframeOptions';
import { getSignalConfig } from '../../config/signalConfig';
import { calculateStats } from '../../utils/calculateStats';

import {
  getSignalNames,
  getHistoricalSignals,
} from '../../services/signalService';
import { getSocketUrl } from '../../utils/api';

// --- UI Components ---
import { SignalSelector } from './SignalSelector';
import { StatCard } from './StatCard';

// Custom chart 
import { CanvasLinePlot } from './CanvasLinePlot';


//NEW ONE, using Plotly for better performance and interactivity
import { PlotlyLinePlot } from "./PlotlyLinePlot";

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


  // LOAD SIGNAL NAMES (DB)
  useEffect(() => {
    if (isLiveMode) return;
    let cancelled = false;
    const loadSignalNamesFromDb = async () => {
      try {
        const data = await getSignalNames();
        if (cancelled) return;
        const signalNames = Array.isArray(data?.names)
          ? data.names.map(String).filter(Boolean)
          : [];
        const merged = Array.from(
          new Set([...signalNames, ...selectedSignalsRef.current])
        ).sort();
        setAvailableSignals(merged);
        setHistoricalStatus(
          merged.length
            ? `Loaded ${merged.length} signal name${merged.length > 1 ? 's' : ''} from DB.`
            : 'No signal names found in DB.'
        );
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

  // SOCKET SETUP

  useEffect(() => {
    const socket = io(getSocketUrl(), {
      path: '/socket.io',
      transports: ['websocket', 'polling'],
    });
    socketRef.current = socket;
    const handler = (data) => {
      const frames = data?.decodedFrames || [];
      if (!frames.length) return;
      const currentSignals = selectedSignalsRef.current;
      const newAvailableSignals = new Set();
      for (const frame of frames) {
        if (!frame.decoded) continue;
        for (const [signalName, value] of Object.entries(frame.decoded)) {
          newAvailableSignals.add(signalName);
          if (
            liveModeRef.current &&
            currentSignals.includes(signalName) &&
            typeof value === 'number'
          ) {
            plotRef.current?.push(
              signalName,
              value,
              Number(frame.timestamp) || Date.now()
            );
          }
        }
      }

      if (newAvailableSignals.size > 0) {
        setAvailableSignals((prev) => {
          const merged = new Set([...prev, ...newAvailableSignals]);
          return Array.from(merged).sort();
        });
      }
    };
    socket.on('connect', () => setSocketStatus('Connected'));
    socket.on('telemetry', handler);
    socket.on('persisted_signals', ({ signals = [] } = {}) => {
      const normalized = Array.isArray(signals)
        ? signals.map(String).sort()
        : [];
      setPersistedSignals(normalized);
      setSaveMessage(
        normalized.length
          ? `Backend will save ${normalized.length} selected signal${
              normalized.length > 1 ? 's' : ''
            } on change only.`
          : 'No saved signal filter active'
      );
    });
    socket.on('disconnect', () => setSocketStatus('Disconnected'));
    return () => {
      socket.off('connect');

      socket.off('telemetry', handler);

      socket.off('persisted_signals');

      socket.off('disconnect');

      socket.disconnect();

    };

  }, []);


  // HISTORICAL DATA LOADER

  useEffect(() => {
    if (isLiveMode) {
      setHistoricalStatus('Live mode enabled. Historical plotting paused.');
      return;
    }

    const signals = selectedSignalsRef.current;

    if (signals.length === 0) {
      plotRef.current?.clear();
      setHistoricalStatus('Select signals and timeframe to load history');
      return;
    }
    let cancelled = false;
    const selectedWindow =
      TIMEFRAME_OPTIONS.find((o) => o.value === timeframe) ||
      TIMEFRAME_OPTIONS[0];
    const to = Date.now();
    const from = to - selectedWindow.ms;
    const loadHistoricalData = async () => {

      try {
        setHistoricalStatus(
          `Loading ${signals.length} signal${
            signals.length > 1 ? 's' : ''
          } for ${selectedWindow.label}...`
        );
        const data = await getHistoricalSignals(signals, from, to);
        if (cancelled) return;
        const series = data?.series ?? {};
        plotRef.current?.setSeries(series);
        setHistoricalStatus(
          `Loaded ${signals.length} signal${
            signals.length > 1 ? 's' : ''
          } for ${selectedWindow.label}`

        );

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


  // STATS LOOP

  // -----------------------------

  useEffect(() => {

    if (selectedSignals.length === 0) return;

    const interval = setInterval(() => {

      const series = plotRef.current?.getSeries();

      if (!series) return;

      const newStats = {};

      for (const [signal, data] of series.entries()) {

        newStats[signal] = calculateStats(data);

      }

      setStats(newStats);

    }, 500);

    return () => clearInterval(interval);

  }, [selectedSignals]);

  // HANDLERS

  const handleLiveModeToggle = useCallback(() => {

    setIsLiveMode((prev) => {

      const next = !prev;

      if (next) {

        plotRef.current?.clear();

        setStats({});

        setHistoricalStatus('Live mode enabled. Historical plotting paused.');

      } else {

        setHistoricalStatus(

          'Historical mode enabled. Loading selected timeframe...'

        );

      }

      return next;

    });

  }, []);


  

  const handleSignalChange = useCallback((signal) => {

    setSelectedSignals((prev) => {

      const set = new Set(prev);

      set.has(signal) ? set.delete(signal) : set.add(signal);

      const sorted = Array.from(set).sort();

      if (sorted.length === 0) {

        plotRef.current?.clear();

        setStats({});

      }

      return sorted;

    });

  }, []);

  return (
    <div className="data-monitoring-shell">
      <div className="max-w-7xl mx-auto space-y-6">
        <header className="monitoring-header">
          <div className="flex flex-col gap-3">
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="monitoring-title">Telemetry Dashboard</h1>
              <span className={`monitoring-status-pill ${socketStatus === 'Connected' ? 'connected' : 'warning'}`}>
                <span className="monitoring-dot" />
                {socketStatus}
              </span>
            </div>
            <p className="monitoring-subtitle">
              Monitor vehicle telemetry in real-time or review historical data. Use the controls below to select signals and timeframes.
            </p>
          </div>
<div className="mt-4 md:mt-0 flex flex-col items-stretch md:items-end gap-3 w-full md:w-auto monitoring-toolbar">
            <div className="monitoring-control-card">
              <button
                type="button"
                onClick={handleLiveModeToggle}
                className={`monitoring-toggle ${isLiveMode ? 'live' : 'history'} rounded-md px-4 py-2 text-sm font-semibold transition-colors ${isLiveMode ? 'border border-blue-500/40 bg-blue-500/10 text-blue-100 hover:bg-blue-500/20' : 'border border-amber-500/40 bg-amber-500/10 text-amber-100 hover:bg-amber-500/20'}`}>
                {isLiveMode ? 'Live mode: ON' : 'Live mode: OFF'}
              </button>
            </div>
              >
                {isLiveMode ? 'Live mode: ON' : 'Live mode: OFF'}
              </button>

              <div className="monitoring-control-row">
                <label htmlFor="timeframe" className="monitoring-control-label">Timeframe</label>
                <select
                  id="timeframe"
                  value={timeframe}
                  onChange={(event) => setTimeframe(event.target.value)}
                  disabled={isLiveMode}
                  className="monitoring-select"
                >
                  {TIMEFRAME_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>

              <SignalSelector signals={availableSignals} selectedSignals={selectedSignals} toggleSignal={handleSignalChange} />
            </div>
            <SignalSelector signals={availableSignals} selectedSignals={selectedSignals} toggleSignal={handleSignalChange} />
            <div className="monitoring-meta-card">
              <p className="text-xs text-gray-400">
                {saveMessage}
                {persistedSignals.length > 0 ? ` Current backend filter: ${persistedSignals.join(', ')}.` : ''}
              </p>
              <p className="text-xs text-gray-500">
                {isLiveMode ? 'Live streaming chart is active.' : historicalStatus}
              </p>
            </div>
          </div>
        </header>

        <main className="monitoring-main">
          <section className="monitoring-section-card">
            <div className="monitoring-section-heading">
              <div>
                <h2 className="monitoring-section-title">Signal overview</h2>
                <p className="monitoring-section-copy">Key statistics.</p>
              </div>
              <span className="monitoring-badge">{selectedSignals.length} active</span>
            </div>

            {selectedSignals.length > 0 ? (
              <div className="monitoring-stat-grid">
                {selectedSignals.map((signal) => {
                  const config = getSignalConfig(signal);
                  return (
                    <StatCard
                      key={signal}
                      label={signal}
                      stats={stats[signal] || {}}
                      unit={config.unit}
                      color={config.color}
                    />
                  );
                })}
              </div>
            ) : (
              <div className="monitoring-empty-state">
                <p>Select one or more signals.</p>
              </div>
            )}
          </section>

          <section className="monitoring-section-card">
            <div className="monitoring-section-heading">
              <div>
                <h2 className="monitoring-section-title">Trace view</h2>
                <p className="monitoring-section-copy">{isLiveMode ? 'Streaming data from the backend.' : 'Historical values loaded from the selected timeframe.'}</p>
              </div>
              <span className={`monitoring-badge ${isLiveMode ? 'live' : 'history'}`}>{isLiveMode ? 'LIVE' : 'HISTORY'}</span>
            </div>

            <PlotlyLinePlot ref={plotRef} signalNames={selectedSignals} />
          </section>
        </main>
      </div>
    </div>
  );
}

export default DataMonitoring;
