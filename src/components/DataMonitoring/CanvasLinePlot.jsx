
import React, { useRef, useEffect, forwardRef, useImperativeHandle } from 'react';
import * as d3 from 'd3';
import { useResizeObserver } from '../../hooks/useResizeObserver';
import { getSignalConfig } from '../../utils/signalConfig';

const MAX_DATA_POINTS = 1000;
export const CanvasLinePlot = forwardRef(({ signalNames }, ref) => {
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

    const margin = { top: 40, right: 20, bottom: 55, left: 55 };
    const innerWidth = width - margin.left - margin.right;
    const innerHeight = height - margin.top - margin.bottom;

    // Clear canvas
    ctx.clearRect(0, 0, width, height);

    const { series } = dataRef.current;
    const allData = Array.from(series.values()).flat();

    // Scales
    // Scales
const xDomain =
  allData.length > 0
    ? d3.extent(allData, d => d.timestamp)
    : [Date.now() - 60 * 1000, Date.now()];

const xScale = d3.scaleTime()
  .domain(xDomain)
  .range([margin.left, width - margin.right]);

const xTicks = xScale.ticks(6);

const yDomain =
  allData.length > 0
    ? d3.extent(allData, d => d.value)
    : [0, 100];

const yPadding = (yDomain[1] - yDomain[0] || 1) * 0.1;

const yScale = d3.scaleLinear()
  .domain([yDomain[0] - yPadding, yDomain[1] + yPadding])
  .range([height - margin.bottom, margin.top]);

// ---------------- Grid + Axes ----------------

ctx.strokeStyle = "#4B5563";
ctx.lineWidth = 0.5;

// Horizontal grid + Y labels
const yTicks = yScale.ticks(5);

yTicks.forEach(tick => {
  const y = yScale(tick);

  ctx.beginPath();
  ctx.moveTo(margin.left, y);
  ctx.lineTo(width - margin.right, y);
  ctx.stroke();

  ctx.fillStyle = "#D1D5DB";
  ctx.font = '11px "Roboto Mono"';
  ctx.textAlign = "right";
  ctx.textBaseline = "middle";
  ctx.fillText(tick.toFixed(1), margin.left - 6, y);
});

// Vertical grid
xTicks.forEach(tick => {
  const x = xScale(tick);

  ctx.beginPath();
  ctx.moveTo(x, margin.top);
  ctx.lineTo(x, height - margin.bottom);
  ctx.stroke();
});

// X-axis line
ctx.strokeStyle = "#9CA3AF";
ctx.lineWidth = 1;

ctx.beginPath();
ctx.moveTo(margin.left, height - margin.bottom);
ctx.lineTo(width - margin.right, height - margin.bottom);
ctx.stroke();

// Time labels
ctx.fillStyle = "#D1D5DB";
ctx.font = '11px "Roboto Mono"';
ctx.textAlign = "center";
ctx.textBaseline = "top";

xTicks.forEach(tick => {
  const x = xScale(tick);

  ctx.fillText(
    d3.timeFormat("%H:%M:%S")(tick),
    x,
    height - margin.bottom + 6
  );
});

// ---------------- Plot ----------------

ctx.save();
ctx.beginPath();
ctx.rect(margin.left, margin.top, innerWidth, innerHeight);
ctx.clip();

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

// ---------------- Legend ----------------

ctx.textAlign = "left";
ctx.font = '12px "Roboto Mono"';

const legendX = width - margin.right + 10;

Array.from(series.keys()).forEach((signalName, i) => {
  const color = getSignalConfig(signalName).color;
  const y = margin.top + i * 20;

  ctx.fillStyle = color;
  ctx.fillRect(legendX, y, 12, 12);

  ctx.fillStyle = "#D1D5DB";
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