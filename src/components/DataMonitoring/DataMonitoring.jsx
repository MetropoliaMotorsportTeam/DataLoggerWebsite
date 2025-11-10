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

function StatCard({ label, value, unit, color }) {
  return (
    <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-4 flex flex-col h-full justify-center">
      <span className="text-sm text-gray-400 font-mono truncate">{label}</span>
      <span className="text-3xl font-bold font-mono" style={{ color }}>
        {typeof value === 'number' ? value.toFixed(2) : '--'}
        <span className="text-xl text-gray-400 ml-1">{unit}</span>
      </span>
    </div>
  );
}

const LinePlot = forwardRef(({ signalNames }, ref) => {
  const svgRef = useRef();
  const wrapperRef = useRef();
  const { current: elements } = useRef({ series: new Map() });
  const animationFrameRef = useRef(); // To throttle rendering

  useImperativeHandle(ref, () => ({
    push: (signalName, value) => {
      if (!elements.series.has(signalName)) {
        elements.series.set(signalName, []);
      }
      const data = elements.series.get(signalName);
      elements.series.set(signalName, [...data, value].slice(-MAX_DATA_POINTS));
      
      // Throttle draw calls to once per frame
      if (!animationFrameRef.current) {
        animationFrameRef.current = requestAnimationFrame(() => {
          draw();
          animationFrameRef.current = null;
        });
      }
    },
    clear: () => {
      elements.series.clear();
      draw();
    }
  }));

  const draw = useCallback(() => {
    if (!elements.g) return;
    const { g, series, xScale, yScale, innerWidth, yAxis, yGrid } = elements;

    const allData = Array.from(series.values()).flat();
    if (allData.length === 0) {
      g.selectAll('.line-path').remove();
      yAxis.call(d3.axisLeft(yScale).ticks(5));
      yGrid.call(d3.axisLeft(yScale).ticks(5).tickSize(-innerWidth).tickFormat(''));
      return;
    }

    const yDomain = d3.extent(allData);
    const yPadding = (yDomain[1] - yDomain[0] || 1) * 0.2;
    yScale.domain([yDomain[0] - yPadding, yDomain[1] + yPadding]);

    const t = d3.transition().duration(250).ease(d3.easeSinOut);
    yAxis.transition(t).call(d3.axisLeft(yScale).ticks(5));
    yGrid.transition(t).call(d3.axisLeft(yScale).ticks(5).tickSize(-innerWidth).tickFormat(''));

    const lineGenerator = d3.line().x((v, i) => xScale(i)).y(v => yScale(v)).curve(d3.curveMonotoneX);
    const lines = g.selectAll('.line-path').data(Array.from(series.entries()), d => d[0]);
    
    lines.exit().transition(t).attr('stroke-opacity', 0).remove();

    const enterLines = lines.enter().append('path')
      .attr('class', 'line-path')
      .attr('fill', 'none')
      .attr('stroke-width', 2)
      .attr('stroke-opacity', 0);

    const allLines = enterLines.merge(lines);

    allLines
      .transition(t)
      .attr('stroke-opacity', 1)
      .attr('stroke', d => getSignalConfig(d[0]).color)
      .attr('d', d => lineGenerator(d[1]));

  }, [elements]);

  useEffect(() => {
    const initChart = () => {
      if (!wrapperRef.current) return;
      const { width, height } = wrapperRef.current.getBoundingClientRect();
      const margin = { top: 20, right: 60, bottom: 30, left: 60 };

      elements.innerWidth = width - margin.left - margin.right;
      elements.innerHeight = height - margin.top - margin.bottom;

      const svg = d3.select(svgRef.current).attr('width', width).attr('height', height);
      svg.selectAll('*').remove();
      const g = svg.append('g').attr('transform', `translate(${margin.left},${margin.top})`);
      elements.g = g;

      g.append('defs').append('clipPath').attr('id', 'clip').append('rect').attr('width', elements.innerWidth).attr('height', elements.innerHeight);
      
      elements.xScale = d3.scaleLinear().domain([0, MAX_DATA_POINTS - 1]).range([0, elements.innerWidth]);
      elements.yScale = d3.scaleLinear().domain([0, 100]).range([elements.innerHeight, 0]);
      
      elements.yAxis = g.append('g').attr('class', 'axis y-axis');
      elements.yGrid = g.append('g').attr('class', 'grid y-grid');
      
      [elements.yAxis, elements.yGrid].forEach(el => {
        el.selectAll('path, line').attr('stroke', '#4B5563');
        el.selectAll('text').attr('fill', '#D1D5DB').attr('font-size', '12px').attr('font-family', 'Roboto Mono');
      });
    };

    initChart();
    const currentWrapper = wrapperRef.current;
    const resizeObserver = new ResizeObserver(initChart);
    if (currentWrapper) {
      resizeObserver.observe(currentWrapper);
    }
    return () => {
      if (currentWrapper) {
        resizeObserver.unobserve(currentWrapper);
      }
      // Cancel any pending animation frame on cleanup
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [elements]);

  useEffect(() => {
    // When the selected signals change, remove data for any unselected signals
    const currentSeries = new Map();
    signalNames.forEach(name => {
      if (elements.series.has(name)) {
        currentSeries.set(name, elements.series.get(name));
      }
    });
    elements.series = currentSeries;
    draw();
  }, [signalNames, draw, elements]);

  return (
    <div ref={wrapperRef} className="w-full h-80 bg-gray-900/50 rounded-lg shadow-2xl relative border border-gray-700">
      <svg ref={svgRef}></svg>
    </div>
  );
});

// --- Main Component ---
function DataMonitoring() {
  const [latestValues, setLatestValues] = useState({});
  const [selectedSignals, setSelectedSignals] = useState([]);
  const [availableSignals, setAvailableSignals] = useState([]);
  const [socketStatus, setSocketStatus] = useState('Connecting');
  const plotRef = useRef(null);
  const socketRef = useRef(null);
  const selectedSignalsRef = useRef(selectedSignals); // Ref to hold the latest selectedSignals

  // Keep the ref updated with the latest selectedSignals
  useEffect(() => {
    selectedSignalsRef.current = selectedSignals;
  }, [selectedSignals]);

  // This effect manages the socket connection lifecycle
  useEffect(() => {
    const socket = io('http://localhost:3000');
    socketRef.current = socket;

    socket.on('connect', () => setSocketStatus('Connected'));
    socket.on('disconnect', () => setSocketStatus('Disconnected'));

    const handler = (newData) => {
      if (!newData.decodedFrames?.[0]?.decoded) return;
      const decoded = newData.decodedFrames[0].decoded;

      // Discover new signals and update the available list
      setAvailableSignals(prev => {
        const currentSignals = new Set(prev);
        const newSignals = Object.keys(decoded).filter(sig => !currentSignals.has(sig));
        
        if (newSignals.length > 0) {
          return [...prev, ...newSignals].sort();
        }
        return prev;
      });

      // Update the plot and stat card for the currently selected signals
      const currentSignals = selectedSignalsRef.current; // Use ref to get latest value
      if (currentSignals.length > 0) {
        const newLatestValues = {};
        let needsUpdate = false;
        currentSignals.forEach(signal => {
          if (typeof decoded[signal] === 'number') {
            const signalValue = decoded[signal];
            plotRef.current?.push(signal, signalValue);
            newLatestValues[signal] = signalValue;
            needsUpdate = true;
          }
        });
        if (needsUpdate) {
          setLatestValues(prev => ({ ...prev, ...newLatestValues }));
        }
      }
    };

    socket.on('decodedData', handler);

    // Cleanup on component unmount
    return () => {
      selectedSignalsRef.current.forEach(signal => {
        socket.emit('unwatch_signal', signal);
      });
      socket.disconnect();
    };
  }, []); // Empty dependency array ensures this runs only once

  // This effect tells the server which signals to watch/unwatch
  useEffect(() => {
    const socket = socketRef.current;
    if (!socket) return;

    const previousSignals = selectedSignalsRef.current;
    const currentSignals = selectedSignals;

    const signalsToWatch = currentSignals.filter(s => !previousSignals.includes(s));
    const signalsToUnwatch = previousSignals.filter(s => !currentSignals.includes(s));

    signalsToWatch.forEach(signal => socket.emit('watch_signal', signal));
    signalsToUnwatch.forEach(signal => socket.emit('unwatch_signal', signal));

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
      
      // When clearing all signals, also clear the plot
      if (sorted.length === 0) {
        plotRef.current?.clear();
        setLatestValues({});
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
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {selectedSignals.map(signal => {
              const config = getSignalConfig(signal);
              return <StatCard key={signal} label={signal} value={latestValues[signal]} unit={config.unit} color={config.color} />;
            })}
          </div>
          <div>
            <LinePlot ref={plotRef} signalNames={selectedSignals} />
          </div>
        </main>
      </div>
    </div>
  );
}

export default DataMonitoring;