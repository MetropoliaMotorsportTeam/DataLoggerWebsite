import React, { useEffect, useState, useRef, useCallback, useImperativeHandle, forwardRef } from 'react';
import { io } from 'socket.io-client';
import * as d3 from 'd3';
import './DataMonitoring.css';

const MAX_DATA_POINTS = 100;

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
  const latest = data[data.length - 1];
  const min = d3.min(data);
  const max = d3.max(data);
  const avg = d3.mean(data);
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
    ctx.scale(dpr, dpr);

    const margin = { top: 40, right: 20, bottom: 30, left: 50 };
    const innerWidth = width - margin.left - margin.right;
    const innerHeight = height - margin.top - margin.bottom;

    // Clear canvas
    ctx.clearRect(0, 0, width, height);

    const { series } = dataRef.current;
    const allData = Array.from(series.values()).flat();

    // Scales
    const xScale = d3.scaleLinear()
      .domain([0, MAX_DATA_POINTS - 1])
      .range([margin.left, width - margin.right]);

    const yDomain = allData.length > 0 ? d3.extent(allData) : [0, 100];
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
      .x((d, i) => xScale(i))
      .y(d => yScale(d))
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
    push: (signalName, value) => {
      if (!dataRef.current.series.has(signalName)) {
        dataRef.current.series.set(signalName, []);
      }
      const data = dataRef.current.series.get(signalName);
      data.push(value);
      if (data.length > MAX_DATA_POINTS) {
        data.shift();
      }
      // Draw immediately when data arrives - no flag needed
      drawChart();
    },
    clear: () => {
      dataRef.current.series.clear();
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
  const plotRef = useRef(null);
  const socketRef = useRef(null);
  const selectedSignalsRef = useRef(selectedSignals);

  useEffect(() => {
    selectedSignalsRef.current = selectedSignals;
  }, [selectedSignals]);

  useEffect(() => {
  const socket = io('http://localhost:3000');
  socketRef.current = socket;

  const handler = (data) => {
  // 1. Get the frames array from the backend payload
  const frames = data?.decodedFrames || [];
  if (!frames.length) return;

  const currentSignals = selectedSignalsRef.current;
  const newAvailableSignals = new Set();

  frames.forEach(frame => {
    // The backend structure is: frame.decoded = { SignalName: Value, ... }
    if (frame.decoded) {
      Object.entries(frame.decoded).forEach(([signalName, value]) => {
        // Track all discovered signals
        newAvailableSignals.add(signalName);

        // 2. Plot if this specific signal is selected
        if (currentSignals.includes(signalName) && typeof value === 'number') {
          plotRef.current?.push(signalName, value);
        }
      });
    }
  });

  // 3. Update the dropdown list if new signals are found
  if (newAvailableSignals.size > 0) {
    setAvailableSignals(prev => {
      const combined = new Set([...prev, ...newAvailableSignals]);
      return Array.from(combined).sort();
    });
  }
};
  socket.on('connect', () => {
    setSocketStatus('Connected');
  });
  socket.on('telemetry', handler);

  socket.on('disconnect', () => {
    setSocketStatus('Disconnected');
  });

  return () => {
    socket.off('telemetry', handler);
    socket.disconnect();
  };
}, []);

  // Update stats periodically
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
  }, [selectedSignals]);

  // This effect now informs the backend about which signals are being plotted
  useEffect(() => {
    const socket = socketRef.current;
    if (socket) {
      // Send the complete list of selected signals to the backend
      socket.emit('update_plotted_signals', selectedSignals);
    }
    // The dependency array ensures this runs every time `selectedSignals` changes.
  }, [selectedSignals]);

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
          <SignalSelector signals={availableSignals} selectedSignals={selectedSignals} toggleSignal={handleSignalChange} />
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
