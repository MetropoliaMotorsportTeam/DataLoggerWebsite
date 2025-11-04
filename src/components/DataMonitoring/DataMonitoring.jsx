import React from 'react'
import * as d3 from 'd3';
import { useEffect, useRef, useState } from 'react';

function LinePlot({
  data,
  width = 640,
  height = 400,
  marginTop = 20,
  marginRight = 20,
  marginBottom = 30,
  marginLeft = 40,
}) {
  const gx = useRef();
  const gy = useRef();
  const brushRef = useRef();
  const [selectedRange, setSelectedRange] = useState(null);

  const x = d3.scaleLinear([0, data.length - 1], [marginLeft, width - marginRight]);
  const y = d3.scaleLinear(d3.extent(data), [height - marginBottom, marginTop]);
  const line = d3.line().x((d, i) => x(i)).y(d => y(d));

  useEffect(() => void d3.select(gx.current).call(d3.axisBottom(x)), [gx, x]);
  useEffect(() => void d3.select(gy.current).call(d3.axisLeft(y)), [gy, y]);
  // setup d3 brush for horizontal selection
  useEffect(() => {
    if (!brushRef.current) return;
    const brush = d3.brushX()
      .extent([[marginLeft, marginTop], [width - marginRight, height - marginBottom]]);

    const onEnd = (event) => {
      // ignore programmatic events (brush.move triggers events with no sourceEvent)
      if (!event || !event.sourceEvent) return;
      const s = event.selection;
      if (!s) {
        setSelectedRange(null);
        return;
      }
      const [x0, x1] = s;
      const i0 = Math.max(0, Math.min(data.length - 1, Math.round(x.invert(x0))));
      const i1 = Math.max(0, Math.min(data.length - 1, Math.round(x.invert(x1))));
      const range = [Math.min(i0, i1), Math.max(i0, i1)];
      // snap brush to exact pixel bounds of data indices so selection stays
      d3.select(brushRef.current).call(brush.move, [x(range[0]), x(range[1])]);
      setSelectedRange(range);
    };

    brush.on('end', onEnd);
    d3.select(brushRef.current).call(brush);

    return () => {
      try { d3.select(brushRef.current).call(brush.move, null); } catch (e) {}
    };
  }, [brushRef, x, data, marginLeft, marginTop, marginRight, marginBottom, width, height]);


  return (
    <svg width={width} height={height}>
      {selectedRange && (
        <rect
          x={x(selectedRange[0])}
          y={marginTop}
          width={x(selectedRange[1]) - x(selectedRange[0])}
          height={height - marginTop - marginBottom}
          fill="rgba(0,120,215,0.12)"
        />
      )}
      <g ref={gx} transform={`translate(0,${height - marginBottom})`} />
      <g ref={gy} transform={`translate(${marginLeft},0)`} />
      <path fill="none" stroke="currentColor" strokeWidth="1" d={line(data)} />
      <g fill="red" stroke="currentColor" strokeWidth="3">
        {data.map((d, i) => (<circle key={i} cx={x(i)} cy={y(d)} r="2.5" />))}
      </g>
      {/* brush layer (on top) */}
      <g ref={brushRef} />
    </svg>
  );
}

function DataMonitoring() {
  return (
    <div>
      <LinePlot data={[1,2,3,4,6,4,3,2,1,3]} />
    </div>
  )
}

export default DataMonitoring