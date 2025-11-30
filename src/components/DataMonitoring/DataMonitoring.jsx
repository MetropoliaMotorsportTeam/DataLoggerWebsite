import React, { useEffect, useState, useRef, useCallback, useImperativeHandle, forwardRef } from 'react';
import { io } from 'socket.io-client';
import './DataMonitoring.css';
import { getSignalConfig } from '../../utils/getSignalConfig';
import { calculateStats } from '../../utils/calculateStats';
import { useResizeObserver } from '../../hooks/useResizeObserver';
import { StatCard } from '../StatCard/StatCard';
import { drawChart } from '../../utils/drawChart';

const MAX_DATA_POINTS = 100;

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

  const CanvasLinePlot = forwardRef(({ signalNames }, ref) => {
  const canvasRef = useRef();
  const wrapperRef = useRef();
  const dataRef = useRef({ series: new Map() });



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
      drawChart(canvasRef, dataRef);
    },
    clear: () => {
      dataRef.current.series.clear();
      drawChart(canvasRef, dataRef);
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
    drawChart(canvasRef, dataRef);
  }, [signalNames]);

  // Handle resize
  useResizeObserver(wrapperRef, () => {
    drawChart(canvasRef, dataRef);
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

    socket.on('connect', () => {
      setSocketStatus('Connected');
      // Send initial state (empty array) when connecting
      socket.emit('update_plotted_signals', selectedSignalsRef.current);
    });
    socket.on('disconnect', () => setSocketStatus('Disconnected'));

    const handler = (newData) => {
      if (!newData.decodedFrames?.[0]?.decoded) return;
      const decoded = newData.decodedFrames[0].decoded;

      setAvailableSignals(prev => {
        const currentSignals = new Set(prev);
        const newSignals = Object.keys(decoded).filter(sig => !currentSignals.has(sig));
        if (newSignals.length > 0) return [...prev, ...newSignals].sort();
        return prev;
      });

      const currentSignals = selectedSignalsRef.current;
      if (currentSignals.length > 0) {
        currentSignals.forEach(signal => {
          if (typeof decoded[signal] === 'number') {
            plotRef.current?.push(signal, decoded[signal]);
          }
        });
      }
    };

    socket.on('decodedData', handler);

    return () => {
      // On cleanup, inform the backend that this client is no longer plotting anything
      socket.emit('update_plotted_signals', []);
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
            <h1 className="text-3xl font-bold text-white">Live Telemetry Dashboard</h1>
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
