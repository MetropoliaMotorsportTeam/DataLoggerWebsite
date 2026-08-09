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
    <div className="p-4 md:p-6 min-h-screen" style={{ fontFamily: "'Roboto Mono', monospace", backgroundColor: 'var(--background-base)', color: 'var(--text-primary)' }}>
      <div className="max-w-7xl mx-auto">
        <header
          className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 rounded-xl border p-4 md:p-5"
          style={{ backgroundColor: 'var(--surface-layer)', borderColor: 'var(--primary-accent)' }}
        >
          <div>
            <h1 className="text-3xl font-bold" style={{ color: 'var(--primary-accent)' }}>Telemetry Dashboard</h1>
            <div className="flex items-center mt-1">
              <div
                className="w-2 h-2 rounded-full mr-2 animate-pulse"
                style={{ backgroundColor: socketStatus === 'Connected' ? 'var(--primary-accent)' : 'var(--warning-attention)' }}
              ></div>
              <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>{socketStatus}</p>
            </div>
          </div>
          <div className="mt-4 md:mt-0 flex flex-col items-start md:items-end gap-3">
            <button
              type="button"
              onClick={handleLiveModeToggle}
              style={{
                border: `1px solid ${isLiveMode ? 'var(--primary-accent)' : 'var(--warning-attention)'}`,
                backgroundColor: isLiveMode ? 'rgba(200, 255, 0, 0.12)' : 'rgba(255, 193, 7, 0.12)',
                color: isLiveMode ? 'var(--text-primary)' : 'var(--warning-attention)',
              }}
              className="rounded-md px-4 py-2 text-sm font-semibold transition-colors"
            >
              {isLiveMode ? 'Live mode: ON' : 'Live mode: OFF'}
            </button>
            <div className="flex items-center gap-2">
              <label htmlFor="timeframe" className="text-xs uppercase tracking-wide" style={{ color: 'var(--text-secondary)' }}>Timeframe</label>
              <select
                id="timeframe"
                value={timeframe}
                onChange={(event) => setTimeframe(event.target.value)}
                disabled={isLiveMode}
                style={{
                  border: '1px solid var(--primary-accent)',
                  backgroundColor: 'var(--surface-layer)',
                  color: 'var(--text-primary)',
                }}
                className="rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2"
              >
                {TIMEFRAME_OPTIONS.map(option => (
                  <option key={option.value} value={option.value}>{option.label}</option>
                ))}
              </select>
            </div>
            <SignalSelector signals={availableSignals} selectedSignals={selectedSignals} toggleSignal={handleSignalChange} />
            <div className="flex flex-wrap gap-2">
              
              
            </div>
            <p className="max-w-sm text-right text-xs" style={{ color: 'var(--text-secondary)' }}>
              {saveMessage}
              {persistedSignals.length > 0 ? ` Current backend filter: ${persistedSignals.join(', ')}.` : ''}
            </p>
            <p className="max-w-sm text-right text-xs" style={{ color: 'var(--text-secondary)' }}>
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
            <PlotlyLinePlot
            ref={plotRef}
            signalNames={selectedSignals}
            />
          </div>
        </main>
      </div>
    </div>
  );
}

export default DataMonitoring;
