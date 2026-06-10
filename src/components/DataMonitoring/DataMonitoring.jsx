import React, { useEffect, useState, useRef, useCallback } from 'react';
import { io } from 'socket.io-client';
import UplotReact from 'uplot-react';
import 'uplot/dist/uPlot.min.css';
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

// --- Helper Functions ---
const calculateStats = (data = []) => {
  if (data.length === 0) return { min: 0, max: 0, avg: 0, latest: 0 };
  const latest = data[data.length - 1];
  const min = Math.min(...data);
  const max = Math.max(...data);
  const avg = data.reduce((a, b) => a + b, 0) / data.length;
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

// --- Main Component ---
function DataMonitoring() {
  const [stats, setStats] = useState({});
  const [selectedSignals, setSelectedSignals] = useState([]);
  const [availableSignals, setAvailableSignals] = useState([]);
  const [socketStatus, setSocketStatus] = useState('Connecting');
  const [plotData, setPlotData] = useState([[]]);

  const dataRef = useRef({ series: new Map(), timestamps: [] });
  const chartRef = useRef(null);
  const socketRef = useRef(null);
  const selectedSignalsRef = useRef(selectedSignals);

  useEffect(() => {
    selectedSignalsRef.current = selectedSignals;
  }, [selectedSignals]);

  const uplotOptions = {
    width: 800,
    height: 400,
    padding: [15, 0, 0, 0],
    series: [
      {
        label: "Time",
      },
      ...selectedSignals.map(s => ({
        label: s,
        stroke: getSignalConfig(s).color,
        width: 2,
        points: { show: false },
      }))
    ],
    axes: [
      {
        stroke: "#c7d2fe",
        grid: { stroke: "#4f4f4f" },
        ticks: { stroke: "#4f4f4f" },
      },
      {
        stroke: "#c7d2fe",
        grid: { stroke: "#4f4f4f" },
        ticks: { stroke: "#4f4f4f" },
      },
    ],
  };

  useEffect(() => {
    const socket = io('http://localhost:3000');
    socketRef.current = socket;

    const handler = (data) => {
      const frames = data?.decodedFrames || [];
      if (!frames.length) return;

      const currentSignals = selectedSignalsRef.current;
      const newAvailableSignals = new Set();
      let shouldUpdate = false;

      frames.forEach(frame => {
        if (frame.decoded) {
          Object.entries(frame.decoded).forEach(([signalName, value]) => {
            newAvailableSignals.add(signalName);

            if (currentSignals.includes(signalName) && typeof value === 'number') {
              if (!dataRef.current.series.has(signalName)) {
                dataRef.current.series.set(signalName, []);
              }
              const data = dataRef.current.series.get(signalName);
              data.push(value);
              if (data.length > MAX_DATA_POINTS) data.shift();
              shouldUpdate = true;
            }
          });
        }
      });

      if (shouldUpdate) {
        const timestamps = dataRef.current.timestamps;
        timestamps.push(Date.now() / 1000);
        if (timestamps.length > MAX_DATA_POINTS) timestamps.shift();

        const newData = [timestamps];
        selectedSignals.forEach(sig => {
          newData.push(dataRef.current.series.get(sig) || []);
        });
        setPlotData(newData);
      }

      if (newAvailableSignals.size > 0) {
        setAvailableSignals(prev => {
          const combined = new Set([...prev, ...newAvailableSignals]);
          return Array.from(combined).sort();
        });
      }
    };

    socket.on('connect', () => setSocketStatus('Connected'));
    socket.on('telemetry', handler);
    socket.on('disconnect', () => setSocketStatus('Disconnected'));

    return () => {
      socket.off('telemetry', handler);
      socket.disconnect();
    };
  }, [selectedSignals]);

  useEffect(() => {
    if (selectedSignals.length === 0) {
      setStats({});
      setPlotData([[]]);
      dataRef.current = { series: new Map(), timestamps: [] };
      return;
    };

    const interval = setInterval(() => {
      const newStats = {};
      for (const signal of selectedSignals) {
        const data = dataRef.current.series.get(signal);
        if (data) {
          newStats[signal] = calculateStats(data);
        }
      }
      setStats(newStats);
    }, 500);

    return () => clearInterval(interval);
  }, [selectedSignals]);

  useEffect(() => {
    const socket = socketRef.current;
    if (socket) {
      socket.emit('update_plotted_signals', selectedSignals);
    }
  }, [selectedSignals]);

  const handleSignalChange = useCallback((signal) => {
    setSelectedSignals(prev => {
      const newSelected = new Set(prev);
      if (newSelected.has(signal)) {
        newSelected.delete(signal);
      } else {
        newSelected.add(signal);
      }
      return Array.from(newSelected).sort();
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
          
          <div className="bg-gray-900/50 rounded-lg shadow-2xl border border-gray-700 p-4">
            {selectedSignals.length > 0 ? (
              <UplotReact
                options={uplotOptions}
                data={plotData}
                onCreate={chart => (chartRef.current = chart)}
                onDelete={() => (chartRef.current = null)}
              />
            ) : (
              <div className="h-96 flex items-center justify-center text-gray-500">
                <div className="text-center">
                  <p className="text-lg font-semibold">No signals selected</p>
                  <p className="text-sm">Use the dropdown above to start plotting data.</p>
                </div>
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}

export default DataMonitoring;