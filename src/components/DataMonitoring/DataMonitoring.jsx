import React from 'react'
import * as d3 from 'd3';
import { useEffect, useRef, useState } from 'react';

function LinePlot({
  data = [],
  // accessor props: either provide xKey/yKey (strings) or xAccessor/yAccessor (functions)
  xKey = 'x',
  yKey = 'y',
  xAccessor, // optional function(d,i)
  yAccessor, // optional function(d,i)
  width = 640,
  height = 400,
  marginTop = 20,
  marginRight = 20,
  marginBottom = 30,
  marginLeft = 40,
  snapToData = true,
  onSelection, // optional callback called with { range, indices: [start,end], data: [...] } or null
  highlightFill = 'rgba(54, 230, 19, 0.16)', // translucent blue by default
}) {
  const gx = useRef();
  const gy = useRef();
  const brushRef = useRef();
  const svgRef = useRef();
  const [selectedRange, setSelectedRange] = useState(null);
  const [hover, setHover] = useState(null);
  const tooltipRef = useRef();

  // default accessors: support numeric arrays (d is number) or object arrays
  const xAcc = xAccessor || ((d, i) => (typeof d === 'number' ? i : d && d[xKey]));
  const yAcc = yAccessor || ((d) => (typeof d === 'number' ? d : d && d[yKey]));

  const xValues = data.length ? data.map((d, i) => xAcc(d, i)) : [0, 1];
  const yValues = data.length ? data.map((d, i) => yAcc(d, i)) : [0, 1];

  // detect if x domain values are Dates -> use time scale
  const sampleX = xValues[0];
  const isTime = sampleX instanceof Date;

  const xDomain = d3.extent(xValues);
  const yDomain = d3.extent(yValues);

  const xScale = isTime
    ? d3.scaleTime().domain(xDomain).range([marginLeft, width - marginRight])
    : d3.scaleLinear().domain(xDomain).range([marginLeft, width - marginRight]);

  const yScale = d3.scaleLinear().domain(yDomain).range([height - marginBottom, marginTop]);

  const line = d3.line()
    .x((d, i) => xScale(xAcc(d, i)))
    .y((d) => yScale(yAcc(d)));

  useEffect(() => {
    if (!gx.current) return;
    const axis = d3.axisBottom(xScale);
    d3.select(gx.current).call(axis);
    // style axis lines and tick labels for dark background
    d3.select(gx.current).selectAll('path, line').attr('stroke', 'white');
    d3.select(gx.current).selectAll('text').attr('fill', 'white');
  }, [gx, xScale]);

  useEffect(() => {
    if (!gy.current) return;
    const axis = d3.axisLeft(yScale);
    d3.select(gy.current).call(axis);
    d3.select(gy.current).selectAll('path, line').attr('stroke', 'white');
    d3.select(gy.current).selectAll('text').attr('fill', 'white');
  }, [gy, yScale]);

  // helper to find nearest x value from data to a given value
  const findNearestX = (v) => {
    if (!data || data.length === 0) return v;
    let best = null;
    let bestDiff = Infinity;
    for (let i = 0; i < data.length; i++) {
      const xv = xAcc(data[i], i);
      const diff = Math.abs(+xv - +v);
      if (diff < bestDiff) {
        bestDiff = diff;
        best = xv;
      }
    }
    return best;
  };

  // helper to find nearest index by x value
  const findNearestIndex = (v) => {
    if (!data || data.length === 0) return -1;
    let bestIdx = 0;
    let bestDiff = Infinity;
    for (let i = 0; i < data.length; i++) {
      const xv = xAcc(data[i], i);
      const diff = Math.abs(+xv - +v);
      if (diff < bestDiff) {
        bestDiff = diff;
        bestIdx = i;
      }
    }
    return bestIdx;
  };

  const handleMouseMove = (e) => {
    if (!data || data.length === 0) return;
    const ev = e && e.nativeEvent ? e.nativeEvent : e;
    const target = svgRef.current || ev.target;
    const [mx, my] = d3.pointer(ev, target);
    const vx = xScale.invert(mx);
    const idx = findNearestIndex(vx);
    if (idx < 0) {
      setHover(null);
      return;
    }
    const xVal = xAcc(data[idx], idx);
    const yVal = yAcc(data[idx], idx);
    const px = xScale(xVal);
    const py = yScale(yVal);
    // only show tooltip if pointer is reasonably close to the actual point (within 12px)
    const dx = mx - px;
    const dy = my - py;
    const dist = Math.sqrt(dx * dx + dy * dy);
    if (dist > 18) {
      setHover(null);
      return;
    }
    setHover({ idx, x: xVal, y: yVal, px, py });
  };

  const handleMouseLeave = () => setHover(null);

  // setup d3 brush for horizontal selection
  useEffect(() => {
    if (!brushRef.current) return;
    const brush = d3.brushX().extent([[marginLeft, marginTop], [width - marginRight, height - marginBottom]]);

    const onEnd = (event) => {
      // ignore programmatic events (brush.move triggers events with no sourceEvent)
      if (!event || !event.sourceEvent) return;
      const s = event.selection;
      if (!s) {
        setSelectedRange(null);
        return;
      }
      const [px0, px1] = s;
      const v0 = xScale.invert(px0);
      const v1 = xScale.invert(px1);

      let a = v0;
      let b = v1;

      if (snapToData && data.length) {
        a = findNearestX(v0);
        b = findNearestX(v1);
      }

      // ensure ordering
      const range = (+a <= +b) ? [a, b] : [b, a];

      // snap brush to exact pixel bounds of selected domain values
      try {
        d3.select(brushRef.current).call(brush.move, [xScale(range[0]), xScale(range[1])]);
      } catch (e) {
        // ignore
      }

      setSelectedRange(range);

      // compute index range and selected data (as objects with preserved x/y) and notify parent
      if (typeof onSelection === 'function' && data && data.length) {
        let startIdx = null;
        let endIdx = null;
        for (let i = 0; i < data.length; i++) {
          const xv = xAcc(data[i], i);
          if (startIdx === null && +xv >= +range[0]) startIdx = i;
          if (+xv <= +range[1]) endIdx = i;
        }
        if (startIdx === null) startIdx = 0;
        if (endIdx === null) endIdx = data.length - 1;

        const selectedDataObjects = data.slice(startIdx, endIdx + 1).map((d, idx) => ({
          __origIndex: startIdx + idx,
          x: xAcc(d, startIdx + idx),
          y: yAcc(d, startIdx + idx),
        }));

        try { onSelection({ range, indices: [startIdx, endIdx], data: selectedDataObjects }); } catch (e) { /* ignore callback errors */ }
      }
    };

    brush.on('end', onEnd);
    d3.select(brushRef.current).call(brush);

    return () => {
      try { d3.select(brushRef.current).call(brush.move, null); } catch (e) {}
    };
  }, [brushRef, xScale, yScale, data, marginLeft, marginTop, marginRight, marginBottom, width, height, snapToData, onSelection]);


  return (
    <div style={{ position: 'relative', width, height }}>
      <svg width={width} height={height} onMouseMove={handleMouseMove} onMouseLeave={handleMouseLeave}>
      {selectedRange && (
        <rect
          x={xScale(selectedRange[0])}
          y={marginTop}
          width={xScale(selectedRange[1]) - xScale(selectedRange[0])}
          height={height - marginTop - marginBottom}
          fill={highlightFill}
        />
      )}
      <g ref={gx} transform={`translate(0,${height - marginBottom})`} />
      <g ref={gy} transform={`translate(${marginLeft},0)`} />
  <path fill="none" stroke="white" strokeWidth="1" d={line(data)} />
      {/* point markers removed — show only the line. Re-add if needed. */}
      {hover && (
        <circle cx={hover.px} cy={hover.py} r={4} fill="white" stroke="rgba(0,0,0,0.4)" strokeWidth={1} />
      )}
      {/* brush layer (on top) */}
      <g ref={brushRef} />
      </svg>

      {hover && (
        (() => {
          const tw = tooltipRef.current ? tooltipRef.current.offsetWidth : 140;
          const th = tooltipRef.current ? tooltipRef.current.offsetHeight : 40;
          // compute left so tooltip is centered over point but clamped inside container
          let left = hover.px - tw / 2;
          const minLeft = 6;
          const maxLeft = Math.max(6, width - tw - 6);
          if (left < minLeft) left = minLeft;
          if (left > maxLeft) left = maxLeft;
          // compute top: prefer above the point, but if not enough space, place below
          let top = hover.py - th - 10;
          if (top < 6) top = hover.py + 10;

          return (
            <div
              ref={tooltipRef}
              style={{
                position: 'absolute',
                left,
                top,
                pointerEvents: 'none',
                background: 'rgba(0,0,0,0.85)',
                color: 'white',
                padding: '6px 8px',
                borderRadius: 6,
                fontSize: 12,
                whiteSpace: 'nowrap',
                boxShadow: '0 2px 8px rgba(0,0,0,0.6)'
              }}
            >
              <div>x: {isTime ? d3.timeFormat('%Y-%m-%d %H:%M:%S')(hover.x) : String(hover.x)}</div>
              <div>y: {typeof hover.y === 'number' ? Number(hover.y).toFixed(3) : String(hover.y)}</div>
            </div>
          );
        })()
      )}
    </div>
  );
}

function DataMonitoring() {
  const telemetryData = [{x:0, y:1}, {x:1.5, y:2}, {x:2, y:1.5}, {x:3.3, y:3.4}, {x:4, y:2.5}, {x:5, y:4}, {x:6, y:3}, {x:7, y:5}, {x:8, y:4.5}, {x:9, y:6}, {x:10, y:5.5}];
  const [zoomData, setZoomData] = useState(null);
  
  // telemetryDataFiltered: average every 3 objects from telemetryData.
  // If the last chunk has fewer than 3 items, average those remaining items.
  const telemetryDataFiltered = (() => {
    const out = [];
    for (let i = 0; i < telemetryData.length; i += 3) {
      const chunk = telemetryData.slice(i, i + 3);
      if (chunk.length === 0) continue;
      const sum = chunk.reduce((acc, cur) => {
        const x = (typeof cur.x === 'number') ? cur.x : 0;
        const y = (typeof cur.y === 'number') ? cur.y : 0;
        return { x: acc.x + x, y: acc.y + y };
      }, { x: 0, y: 0 });
      out.push({ x: sum.x / chunk.length, y: sum.y / chunk.length });
    }
    return out;
  })();

  return (
    <main className="min-h-screen bg-white text-black p-8">
      <div className="mx-auto max-w-4xl">
        <header className="mb-6">
          <h1 className="text-2xl font-semibold text-black">Telemetry Viewer</h1>
          <p className="text-sm text-gray-600">Overview chart (averaged) — select a region to see raw telemetry samples below.</p>
        </header>

  <section className="bg-blue-900 text-white shadow-sm rounded-lg p-6 mb-6">
          <div className="flex items-start justify-between mb-4">
            <div>
              <h2 className="text-lg font-medium text-white">Overview (averaged)</h2>
            </div>
            <div className="flex gap-2">
              <button
                className="px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 text-sm"
                onClick={() => setZoomData(null)}
              >
                Clear zoom
              </button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <div className="w-full">
              <LinePlot data={telemetryDataFiltered} onSelection={(sel) => {
                if (!sel) {
                  setZoomData(null);
                  return;
                }
                // sel.range contains the selected domain (x) values from the filtered chart.
                const [r0, r1] = sel.range || [];
                const min = Math.min(+r0, +r1);
                const max = Math.max(+r0, +r1);
                // select original telemetryData points whose x falls within the selected domain
                const slice = telemetryData.filter((d) => +d.x >= min && +d.x <= max);
                setZoomData(slice);
              }} />
            </div>
          </div>
        </section>

  <section className="bg-blue-900 text-white shadow-sm rounded-lg p-6">
          <h3 className="text-md font-medium text-white mb-3">Zoom (raw samples)</h3>
          {!zoomData && <p className="text-sm text-gray-300">Make a selection on the overview chart to see raw samples here.</p>}
          {zoomData && (
            <div>
              <div className="mb-2 text-sm text-gray-300">Showing {zoomData.length} raw samples</div>
              <div className="overflow-x-auto">
                <LinePlot
                  data={zoomData}
                  xKey={'x'}
                  yKey={'y'}
                  width={640}
                  height={160}
                  marginTop={12}
                  marginBottom={22}
                  marginLeft={64}
                  snapToData={false}
                />
              </div>
            </div>
          )}
        </section>
      </div>
    </main>
  )
}

export default DataMonitoring