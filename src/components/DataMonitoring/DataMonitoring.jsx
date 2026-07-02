import React, { useEffect, useState, useRef, useCallback, useImperativeHandle, forwardRef } from 'react';
import { io } from 'socket.io-client';
import * as d3 from 'd3';
import './DataMonitoring.css';

const MAX_DATA_POINTS = 2000;
const API_BASE_URL = 'http://localhost:3000';
const TIMEFRAME_OPTIONS = [
  { label: '5 min', value: '5m', ms: 5 * 60 * 1000 },
  { label: '15 min', value: '15m', ms: 15 * 60 * 1000 },
  { label: '1 hour', value: '1h', ms: 60 * 60 * 1000 },
  { label: '6 hours', value: '6h', ms: 6 * 60 * 60 * 1000 },
  { label: '24 hours', value: '24h', ms: 24 * 60 * 60 * 1000 },
  { label: '3 days', value: '3d', ms: 3 * 24 * 60 * 60 * 1000 },
  { label: '7 days', value: '7d', ms: 7 * 24 * 60 * 60 * 1000 },
  { label: '30 days', value: '30d', ms: 30 * 24 * 60 * 60 * 1000 },
  { label: '90 days', value: '90d', ms: 90 * 24 * 60 * 60 * 1000 },
  { label: '180 days', value: '180d', ms: 180 * 24 * 60 * 60 * 1000 },
  { label: '365 days', value: '365d', ms: 365 * 24 * 60 * 60 * 1000 },
];

// --- Configuration ---
const SIGNAL_CONFIG = {
  temp: { color: '#38BDF8', unit: '°C' },
  vol: { color: '#34D399', unit: 'V' },
  power: { color: '#FBBF24', unit: 'W' },
  default: { color: '#A78BFA', unit: '' },
};

const getSignalConfig = (signalName = '') => {
  const name = signalName.toLowerCase();
  if (name.includes('temp')) return SIGNAL_CONFIG.temp;
  if (name.includes('vol')) return SIGNAL_CONFIG.vol;
  if (name.includes('power')) return SIGNAL_CONFIG.power;
  return SIGNAL_CONFIG.default;
};

// --- Helper Hooks & Functions ---
const useResizeObserver = (ref, callback) => {
  useEffect(() => {
    const observer = new ResizeObserver(entries => {
      for (let entry of entries) {
        callback(entry.contentRect);
      }
    });
    const node = ref.current;
    if (node) {
      observer.observe(node);
    }
    return () => {
      if (node) {
        observer.unobserve(node);
      }
    };
  }, [ref, callback]);
};

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

function SignalSelector({ signals, selectedSignals, toggleSignal }) {
  const [isOpen, setIsOpen] = useState(false);
  const wrapperRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target)) setIsOpen(false);
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const selectedCount = selectedSignals.length;

  return (
    <div ref={wrapperRef} className="relative w-64 font-mono">
      <button onClick={() => setIsOpen(!isOpen)} className="flex items-center justify-between w-full px-4 py-2 text-sm text-gray-100 bg-gray-800/50 border border-gray-600 rounded-md shadow-sm hover:bg-gray-700/50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-900 focus:ring-blue-500 transition-all duration-150">
        <span className="truncate">{selectedCount > 0 ? `${selectedCount} signal${selectedCount > 1 ? 's' : ''} selected` : 'Select Signals'}</span>
        <svg className={`w-5 h-5 ml-2 -mr-1 text-gray-400 transform transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" /></svg>
      </button>
      {isOpen && (
        <div className="absolute z-10 w-full mt-1 bg-gray-800 border border-gray-600 rounded-md shadow-lg max-h-60 overflow-y-auto custom-scrollbar">
          <ul className="py-1">
            {signals.map((signal) => (
              <li key={signal} onClick={() => toggleSignal(signal)} className="flex items-center px-4 py-2 text-sm text-gray-200 hover:bg-blue-600 hover:text-white cursor-pointer">
                <input
                  type="checkbox"
                  checked={selectedSignals.includes(signal)}
                  readOnly
                  className="form-checkbox h-4 w-4 text-blue-600 bg-gray-700 border-gray-500 rounded focus:ring-blue-500"
                />
                <span className="ml-3">{signal}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

function StatCard({ label, stats, unit, color }) {
  const StatItem = ({ name, value }) => (
    <div className="text-center">
      <span className="text-xs text-gray-400 uppercase">{name}</span>
      <span className="block text-lg font-semibold">{typeof value === 'number' ? value.toFixed(2) : '--'}</span>
    </div>
  );

  return (
    <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-3 flex flex-col justify-between h-full">
      <div className="flex justify-between items-center mb-2">
        <span className="font-bold text-lg" style={{ color }}>{label}</span>
        <span className="text-sm text-gray-400">{unit}</span>
      </div>
      <div className="grid grid-cols-4 gap-1 text-gray-200">
        <StatItem name="Latest" value={stats.latest} />
        <StatItem name="Avg" value={stats.avg} />
        <StatItem name="Min" value={stats.min} />
        <StatItem name="Max" value={stats.max} />
      </div>
    </div>
  );
}

const CanvasLinePlot = forwardRef(({ signalNames }, ref) => {
  const canvasRef = useRef();
  const wrapperRef = useRef();
  const dataRef = useRef({ series: new Map() });

  // Direct draw function - no useCallback to avoid dependency issues
  const drawChart = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    const rect = canvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    const width = rect.width;
    const height = rect.height;
    
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    const margin = { top: 40, right: 20, bottom: 30, left: 50 };
    const innerWidth = width - margin.left - margin.right;
    const innerHeight = height - margin.top - margin.bottom;

    // Clear canvas
    ctx.clearRect(0, 0, width, height);

    const { series } = dataRef.current;
    const allData = Array.from(series.values()).flat();

    // Scales
    const xDomain = allData.length > 0 ? d3.extent(allData, d => d.timestamp) : [Date.now() - 60 * 1000, Date.now()];
    const xScale = d3.scaleTime()
      .domain(xDomain)
      .range([margin.left, width - margin.right]);

    const yDomain = allData.length > 0 ? d3.extent(allData, d => d.value) : [0, 100];
    const yPadding = (yDomain[1] - yDomain[0] || 1) * 0.1;
    const yScale = d3.scaleLinear()
      .domain([yDomain[0] - yPadding, yDomain[1] + yPadding])
      .range([height - margin.bottom, margin.top]);

    // Grid and Y-axis
    ctx.strokeStyle = '#4B5563';
    ctx.lineWidth = 0.5;
    const yTicks = yScale.ticks(5);
    yTicks.forEach(tick => {
      const y = yScale(tick);
      ctx.beginPath();
      ctx.moveTo(margin.left, y);
      ctx.lineTo(width - margin.right, y);
      ctx.stroke();
      
      ctx.fillStyle = '#D1D5DB';
      ctx.font = '11px "Roboto Mono"';
      ctx.textAlign = 'right';
      ctx.textBaseline = 'middle';
      ctx.fillText(tick.toFixed(1), margin.left - 5, y);
    });

    // Clip region for lines
    ctx.save();
    ctx.beginPath();
    ctx.rect(margin.left, margin.top, innerWidth, innerHeight);
    ctx.clip();

    // Draw lines
    ctx.lineWidth = 2;
    const lineGenerator = d3.line()
      .x(d => xScale(d.timestamp))
      .y(d => yScale(d.value))
      .curve(d3.curveMonotoneX)
      .context(ctx);

    for (const [signalName, data] of series.entries()) {
      if (data.length === 0) continue;
      ctx.strokeStyle = getSignalConfig(signalName).color;
      ctx.beginPath();
      lineGenerator(data);
      ctx.stroke();
    }
    ctx.restore();

    // Legend - positioned on the right side
    ctx.textAlign = 'left';
    ctx.font = '12px "Roboto Mono"';
    const legendX = width - margin.right + 10; // Position to the right of the chart
    Array.from(series.keys()).forEach((signalName, i) => {
      const color = getSignalConfig(signalName).color;
      const y = margin.top + i * 20;
      
      ctx.fillStyle = color;
      ctx.fillRect(legendX, y, 12, 12);
      ctx.fillText(signalName, legendX + 18, y + 8);
    });
  };

  useImperativeHandle(ref, () => ({
    push: (signalName, value, timestamp = Date.now()) => {
      if (!dataRef.current.series.has(signalName)) {
        dataRef.current.series.set(signalName, []);
      }
      const data = dataRef.current.series.get(signalName);
      data.push({ timestamp, value });
      if (data.length > MAX_DATA_POINTS) {
        data.shift();
      }
      drawChart();
    },
    clear: () => {
      dataRef.current.series.clear();
      drawChart();
    },
    setSeries: (seriesInput = new Map()) => {
      const normalized = new Map();
      const entries = seriesInput instanceof Map ? seriesInput.entries() : Object.entries(seriesInput);

      for (const [signalName, data] of entries) {
        const points = Array.isArray(data)
          ? data
              .map((point, index) => {
                if (point && typeof point === 'object' && 'timestamp' in point && 'value' in point) {
                  return {
                    timestamp: Number(point.timestamp),
                    value: Number(point.value),
                  };
                }

                if (typeof point === 'number') {
                  return {
                    timestamp: Date.now() + index,
                    value: point,
                  };
                }

                return null;
              })
              .filter(Boolean)
          : [];

        if (signalNames.includes(signalName)) {
          normalized.set(signalName, points.slice(-MAX_DATA_POINTS));
        }
      }

      dataRef.current.series = normalized;
      drawChart();
    },
    getSeries: () => dataRef.current.series
  }));

  // Handle signal changes
  useEffect(() => {
    const { series } = dataRef.current;
    const newSeries = new Map();
    signalNames.forEach(name => {
      if (series.has(name)) {
        newSeries.set(name, series.get(name));
      }
    });
    dataRef.current.series = newSeries;
    drawChart();
  }, [signalNames]);

  // Handle resize
  useResizeObserver(wrapperRef, () => {
    drawChart();
  });

  return (
    <div ref={wrapperRef} className="w-full h-96 bg-gray-900/50 rounded-lg shadow-2xl relative border border-gray-700">
      <canvas ref={canvasRef} className="w-full h-full"></canvas>
      {signalNames.length === 0 && (
        <div className="absolute inset-0 flex items-center justify-center text-gray-500 pointer-events-none">
          <div className="text-center">
            <p className="text-lg font-semibold">No signals selected</p>
            <p className="text-sm">Use the dropdown above to start plotting data.</p>
          </div>
        </div>
      )}
    </div>
  );
});

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
    if (isLiveMode) return;

    let cancelled = false;

    const loadSignalNamesFromDb = async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/signal/names`);
        if (!response.ok) {
          throw new Error(`Name request failed (${response.status})`);
        }

        const data = await response.json();
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
