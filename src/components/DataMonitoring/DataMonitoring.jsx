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

function SignalSelector({ signals, selectedSignal, setSelectedSignal }) {
  const [isOpen, setIsOpen] = useState(false);
  const wrapperRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target)) setIsOpen(false);
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div ref={wrapperRef} className="relative w-64 font-mono">
      <button onClick={() => setIsOpen(!isOpen)} className="flex items-center justify-between w-full px-4 py-2 text-sm text-gray-100 bg-gray-800/50 border border-gray-600 rounded-md shadow-sm hover:bg-gray-700/50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-900 focus:ring-blue-500 transition-all duration-150">
        <span className="truncate">{selectedSignal || 'Select Signal'}</span>
        <svg className={`w-5 h-5 ml-2 -mr-1 text-gray-400 transform transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" /></svg>
      </button>
      {isOpen && (
        <div className="absolute z-10 w-full mt-1 bg-gray-800 border border-gray-600 rounded-md shadow-lg max-h-60 overflow-y-auto custom-scrollbar">
          <ul className="py-1">
            <li onClick={() => { setSelectedSignal(''); setIsOpen(false); }} className="px-4 py-2 text-sm text-gray-400 hover:bg-gray-700 hover:text-white cursor-pointer">-- Stop Plotting --</li>
            {signals.map((signal) => (<li key={signal} onClick={() => { setSelectedSignal(signal); setIsOpen(false); }} className="px-4 py-2 text-sm text-gray-200 hover:bg-blue-600 hover:text-white cursor-pointer">{signal}</li>))}
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

const LinePlot = forwardRef(({ signalName }, ref) => {
  const svgRef = useRef();
  const wrapperRef = useRef();
  const { current: elements } = useRef({ data: [] });

  useImperativeHandle(ref, () => ({
    push: (value) => {
      elements.data = [...elements.data, value].slice(-MAX_DATA_POINTS);
      draw();
    },
    clear: () => {
      elements.data = [];
      draw();
    }
  }));

  const draw = useCallback(() => {
    if (!elements.g) return;
    const { data, xScale, yScale, linePath, areaPath, yAxis, yGrid, innerWidth, innerHeight, yLabel, minText, maxText, liveTracker } = elements;
    const config = getSignalConfig(signalName);

    if (data.length === 0) {
        linePath.attr('d', null);
        areaPath.attr('d', null);
        return;
    }

    const yDomain = d3.extent(data);
    const currentYDomain = yScale.domain();
    if (yDomain[0] < currentYDomain[0] || yDomain[1] > currentYDomain[1]) {
      const yPadding = (yDomain[1] - yDomain[0] || 1) * 0.2;
      yScale.domain([yDomain[0] - yPadding, yDomain[1] + yPadding]);
    }

    const tAxis = d3.transition().duration(250);
    yAxis.transition(tAxis).call(d3.axisLeft(yScale).ticks(5));
    yGrid.transition(tAxis).call(d3.axisLeft(yScale).ticks(5).tickSize(-innerWidth).tickFormat('')).selectAll('line').attr('stroke', 'rgba(255, 255, 255, 0.05)');

    yLabel.text(signalName);
    minText.text(`Min: ${yDomain[0].toFixed(2)}`);
    maxText.text(`Max: ${yDomain[1].toFixed(2)}`);
    
    const lastValue = data[data.length - 1];
    const tTracker = d3.transition().duration(100).ease(d3.easeCubicOut);
    liveTracker.select('circle').transition(tTracker).attr('cy', yScale(lastValue));
    liveTracker.select('text').transition(tTracker).attr('y', yScale(lastValue)).text(lastValue.toFixed(2));

    const lineGenerator = d3.line().x((d, i) => xScale(i)).y(d => yScale(d)).curve(d3.curveMonotoneX);
    const areaGenerator = d3.area().x((d, i) => xScale(i)).y0(innerHeight).y1(d => yScale(d)).curve(d3.curveMonotoneX);

    linePath.datum(data).attr('d', lineGenerator).attr('stroke', config.color);
    areaPath.datum(data).attr('d', areaGenerator).attr('fill', `url(#grad-${config.color})`);

    const transition = d3.transition().ease(d3.easeCubicOut).duration(100);
    linePath.attr('transform', `translate(${xScale(0) - xScale(1)}, 0)`).transition(transition).attr('transform', 'translate(0,0)');
    areaPath.attr('transform', `translate(${xScale(0) - xScale(1)}, 0)`).transition(transition).attr('transform', 'translate(0,0)');
  }, [signalName, elements]);

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
      
      Object.values(SIGNAL_CONFIG).forEach(config => {
        const grad = g.append('defs').append('linearGradient').attr('id', `grad-${config.color}`).attr('gradientUnits', 'userSpaceOnUse').attr('x1', 0).attr('y1', 0).attr('x2', 0).attr('y2', elements.innerHeight);
        grad.append('stop').attr('offset', '0%').attr('stop-color', config.color).attr('stop-opacity', 0.4);
        grad.append('stop').attr('offset', '100%').attr('stop-color', config.color).attr('stop-opacity', 0);
      });

      elements.xScale = d3.scaleLinear().domain([0, MAX_DATA_POINTS - 1]).range([0, elements.innerWidth]);
      elements.yScale = d3.scaleLinear().domain([0, 100]).range([elements.innerHeight, 0]);
      
      elements.yAxis = g.append('g').attr('class', 'axis y-axis');
      elements.yGrid = g.append('g').attr('class', 'grid y-grid');
      
      [elements.yAxis, elements.yGrid].forEach(el => {
        el.selectAll('path, line').attr('stroke', '#4B5563');
        el.selectAll('text').attr('fill', '#D1D5DB').attr('font-size', '12px').attr('font-family', 'Roboto Mono');
      });

      elements.areaPath = g.append('path').attr('clip-path', 'url(#clip)');
      elements.linePath = g.append('path').attr('clip-path', 'url(#clip)').attr('fill', 'none').attr('stroke-width', 2);

      elements.yLabel = g.append('text').attr('text-anchor', 'middle').attr('transform', 'rotate(-90)').attr('x', -elements.innerHeight / 2).attr('y', -margin.left + 15).attr('fill', '#9CA3AF').attr('font-size', '14px');
      elements.minText = g.append('text').attr('text-anchor', 'start').attr('x', 5).attr('y', elements.innerHeight - 5).attr('fill', '#9CA3AF').attr('font-size', '12px');
      elements.maxText = g.append('text').attr('text-anchor', 'start').attr('x', 5).attr('y', 15).attr('fill', '#9CA3AF').attr('font-size', '12px');
      
      elements.liveTracker = g.append('g').attr('transform', `translate(${elements.innerWidth}, 0)`);
      elements.liveTracker.append('line').attr('y1', 0).attr('y2', elements.innerHeight).attr('stroke', '#A78BFA').attr('stroke-dasharray', '4 4');
      elements.liveTracker.append('circle').attr('r', 4).attr('fill', '#A78BFA');
      elements.liveTracker.append('text').attr('x', -10).attr('text-anchor', 'end').attr('alignment-baseline', 'middle').attr('fill', '#A78BFA').attr('font-weight', 'bold');
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
    };
  }, [elements]);

  useEffect(() => {
    draw();
  }, [signalName, draw]);

  return (
    <div ref={wrapperRef} className="w-full h-80 bg-gray-900/50 rounded-lg shadow-2xl relative border border-gray-700">
      <svg ref={svgRef}></svg>
    </div>
  );
});

// --- Main Component ---
function DataMonitoring() {
  const [latestValue, setLatestValue] = useState(null);
  const [selectedSignal, setSelectedSignal] = useState('');
  const [availableSignals, setAvailableSignals] = useState([]);
  const [socketStatus, setSocketStatus] = useState('Connecting');
  const plotRef = useRef(null);
  const selectedSignalRef = useRef(selectedSignal);

  // Keep the ref updated with the latest selectedSignal
  useEffect(() => {
    selectedSignalRef.current = selectedSignal;
  }, [selectedSignal]);

  // This effect manages the socket connection and data handling
  useEffect(() => {
    const socket = io('http://localhost:3000');

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
          const combined = [...prev, ...newSignals].sort();
          // If no signal is selected yet, automatically select the first one
          if (!selectedSignalRef.current) {
            setSelectedSignal(combined[0]);
          }
          return combined;
        }
        return prev;
      });

      // Update the plot and stat card for the currently selected signal
      const currentSignal = selectedSignalRef.current;
      if (currentSignal && typeof decoded[currentSignal] === 'number') {
        const signalValue = decoded[currentSignal];
        plotRef.current?.push(signalValue);
        setLatestValue(signalValue);
      }
    };

    socket.on('decodedData', handler);

    // Cleanup on component unmount
    return () => {
      socket.disconnect();
    };
  }, []); // Empty dependency array ensures this runs only once

  const handleSignalChange = useCallback((signal) => {
    if (signal !== selectedSignal) {
      setSelectedSignal(signal);
      setLatestValue(null);
      plotRef.current?.clear();
    }
  }, [selectedSignal]);

  const primaryConfig = getSignalConfig(selectedSignal);

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
          <SignalSelector signals={availableSignals} selectedSignal={selectedSignal} setSelectedSignal={handleSignalChange} />
        </header>

        <main className="grid grid-cols-1 gap-6">
          <div className="w-full md:w-1/3 lg:w-1/4">
            <StatCard label={selectedSignal || "Primary Readout"} value={latestValue} unit={primaryConfig.unit} color={primaryConfig.color} />
          </div>
          <div>
            <LinePlot ref={plotRef} signalName={selectedSignal} />
          </div>
        </main>
      </div>
    </div>
  );
}

export default DataMonitoring;