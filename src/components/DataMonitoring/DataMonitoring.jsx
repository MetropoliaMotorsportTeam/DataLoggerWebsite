import React, { useEffect, useState, useRef, useCallback, useImperativeHandle, forwardRef } from 'react';
import { drawChart, d3 } from '../../utils/drawChart';
import './DataMonitoring.css';
import { getSignalConfig } from '../../utils/getSignalConfig';
import { calculateStats } from '../../utils/calculateStats';
import { useResizeObserver } from '../../hooks/useResizeObserver';
import { StatCard } from '../StatCard/StatCard';

function LinePlot({
  data = [],
  xKey = "x",
  yKey = "y",
  xLabel = "Ox",
  yLabel = "Oy",
  xAccessor,
  yAccessor,
  width = 640,
  height = 400,
  marginTop = 20,
  marginRight = 20,
  marginBottom = 30,
  marginLeft = 40,
  snapToData = true,
  onSelection,
  highlightFill = "rgba(54, 230, 19, 0.16)",

  // NEW
  editable = false,
  onDataChange, // (nextData) => void
}) {
  const gx = useRef();
  const gy = useRef();
  const brushRef = useRef();
  const svgRef = useRef();
  const tooltipRef = useRef();
  const [dragIdx, setDragIdx] = useState(null);
  const svgRectRef = useRef(null);

  const [selectedRange, setSelectedRange] = useState(null);
  const [hover, setHover] = useState(null);

  const [cursorPos, setCursorPos] = useState(null);

  const clamp = (v, min, max) => Math.max(min, Math.min(max, v));

  const beginDrag = (idx) => (ev) => {
    if (!editable) return;
    ev.stopPropagation();

    setSelectedPointIdx(idx);
    setDragIdx(idx);

    // capture pointer so we keep getting move events
    ev.currentTarget.setPointerCapture?.(ev.pointerId);

    // cache svg rect for correct coordinates
    svgRectRef.current = svgRef.current?.getBoundingClientRect() || null;
  };

  const onPointerMove = (ev) => {
    if (!editable) return;
    if (dragIdx == null) return;
    if (typeof onDataChange !== "function") return;

    const rect = svgRectRef.current || svgRef.current?.getBoundingClientRect();
    if (!rect) return;

    const mx = ev.clientX - rect.left;
    const my = ev.clientY - rect.top;

    // keep inside plot area
    const cx = clamp(mx, marginLeft, width - marginRight);
    const cy = clamp(my, marginTop, height - marginBottom);

    const newX = xScale.invert(cx);
    const newY = yScale.invert(cy);

    const next = data.map((p, i) =>
      i === dragIdx ? { ...p, [xKey]: newX, [yKey]: newY } : p,
    );

    next.sort((a, b) => +xAcc(a) - +xAcc(b));

    // after sorting, indexes shift; easiest is to stop dragging & reselect nothing
    setDragIdx(null);
    setSelectedPointIdx(null);

    onDataChange(next);
  };

  const endDrag = () => {
    if (!editable) return;
    setDragIdx(null);
  };

  // NEW: selected point for deletion
  const [selectedPointIdx, setSelectedPointIdx] = useState(null);

  const xAcc =
    xAccessor || ((d, i) => (typeof d === "number" ? i : d && d[xKey]));
  const yAcc = yAccessor || ((d) => (typeof d === "number" ? d : d && d[yKey]));

  const xValues = data.length ? data.map((d, i) => xAcc(d, i)) : [0, 1];
  const yValues = data.length ? data.map((d, i) => yAcc(d, i)) : [0, 1];

  const sampleX = xValues[0];
  const isTime = sampleX instanceof Date;

  const xDomain = d3.extent(xValues);
  const yDomain = d3.extent(yValues);

  const formatX = (v) =>
  isTime ? d3.timeFormat("%Y-%m-%d %H:%M:%S")(v) : Number(v).toFixed(2);

  const formatY = (v) =>
  typeof v === "number" ? Number(v).toFixed(3) : String(v);

  const xScale = isTime
    ? d3
        .scaleTime()
        .domain(xDomain)
        .range([marginLeft, width - marginRight])
    : d3
        .scaleLinear()
        .domain(xDomain)
        .range([marginLeft, width - marginRight]);

  const yScale = d3
    .scaleLinear()
    .domain(yDomain)
    .range([height - marginBottom, marginTop]);

  const line = d3
    .line()
    .x((d, i) => xScale(xAcc(d, i)))
    .y((d) => yScale(yAcc(d)));

  const xticks = xScale.ticks ? xScale.ticks(10) : xScale.domain();
  const yticks = yScale.ticks ? yScale.ticks(8) : yScale.domain();
  // axes
  useEffect(() => {
    if (!gx.current) return;
    d3.select(gx.current).call(d3.axisBottom(xScale));
    d3.select(gx.current).selectAll("path, line").attr("stroke", "white");
    d3.select(gx.current).selectAll("text").attr("fill", "white");
  }, [xScale]);

  useEffect(() => {
    if (!gy.current) return;
    d3.select(gy.current).call(d3.axisLeft(yScale));
    d3.select(gy.current).selectAll("path, line").attr("stroke", "white");
    d3.select(gy.current).selectAll("text").attr("fill", "white");
  }, [yScale]);

  // ------------ EDIT MODE: add point on click ------------
  const handleSvgClick = (e) => {
    if (!editable) return;
    if (typeof onDataChange !== "function") return;

    const ev = e.nativeEvent;
    const [mx, my] = d3.pointer(ev, svgRef.current);

    // ignore clicks outside plot area
    if (mx < marginLeft || mx > width - marginRight) return;
    if (my < marginTop || my > height - marginBottom) return;

    const xVal = xScale.invert(mx);
    const yVal = yScale.invert(my);

    const next = [...data, { [xKey]: xVal, [yKey]: yVal }].sort(
      (a, b) => +xAcc(a) - +xAcc(b),
    );
    onDataChange(next);
  };

  // ------------ EDIT MODE: delete selected point with keyboard ------------
  useEffect(() => {
    if (!editable) return;
    if (typeof onDataChange !== "function") return;

    const onKeyDown = (ev) => {
      if (selectedPointIdx == null) return;
      if (ev.key === "Delete" || ev.key === "Backspace") {
        ev.preventDefault();
        const next = data.filter((_, i) => i !== selectedPointIdx);
        setSelectedPointIdx(null);
        onDataChange(next);
      }
      if (ev.key === "Escape") {
        setSelectedPointIdx(null);
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [editable, selectedPointIdx, data, onDataChange]);

  // ------------ brush: disable in edit mode ------------
  useEffect(() => {
    if (!brushRef.current) return;
    if (editable) {
      // remove brush handlers if editing
      d3.select(brushRef.current).selectAll("*").remove();
      return;
    }

    const brush = d3.brushX().extent([
      [marginLeft, marginTop],
      [width - marginRight, height - marginBottom],
    ]);

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

    brush.on("end", (event) => {
      if (!event || !event.sourceEvent) return;
      const s = event.selection;
      if (!s) {
        setSelectedRange(null);
        onSelection?.(null);
        return;
      }
      const [px0, px1] = s;
      const v0 = xScale.invert(px0);
      const v1 = xScale.invert(px1);

      let a = v0,
        b = v1;
      if (snapToData && data.length) {
        a = findNearestX(v0);
        b = findNearestX(v1);
      }

      const range = +a <= +b ? [a, b] : [b, a];

      try {
        d3.select(brushRef.current).call(brush.move, [
          xScale(range[0]),
          xScale(range[1]),
        ]);
      } catch {}

      setSelectedRange(range);
      onSelection?.({ range });
    });

    d3.select(brushRef.current).call(brush);

    return () => {
      try {
        d3.select(brushRef.current).call(brush.move, null);
      } catch {}
    };
  }, [
    editable,
    brushRef,
    xScale,
    yScale,
    data,
    marginLeft,
    marginTop,
    marginRight,
    marginBottom,
    width,
    height,
    snapToData,
    onSelection,
    xAcc,
  ]);

  // hover tooltip stays fine (optional: disable in edit mode)
  const handleMouseMove = (e) => {
    if (!data.length || editable) return; // disable hover while editing (less annoying)
    const ev = e.nativeEvent;
    const [mx, my] = d3.pointer(ev, svgRef.current);
    const vx = xScale.invert(mx);

    let bestIdx = 0;
    let bestDiff = Infinity;
    for (let i = 0; i < data.length; i++) {
      const xv = xAcc(data[i], i);
      const diff = Math.abs(+xv - +vx);
      if (diff < bestDiff) {
        bestDiff = diff;
        bestIdx = i;
      }
    }

    const xVal = xAcc(data[bestIdx], bestIdx);
    const yVal = yAcc(data[bestIdx], bestIdx);
    const px = xScale(xVal);
    const py = yScale(yVal);

    const dx = mx - px;
    const dy = my - py;
    const dist = Math.sqrt(dx * dx + dy * dy);
    if (dist > 18) {
      setHover(null);
      return;
    }
    setHover({ idx: bestIdx, x: xVal, y: yVal, px, py });
  };

  const handleMouseLeave = () => setHover(null);

  // data for edit circles
  const editPoints = data.map((d, idx) => ({
    idx,
    x: xAcc(d, idx),
    y: yAcc(d, idx),
    px: xScale(xAcc(d, idx)),
    py: yScale(yAcc(d, idx)),
  }));

  return (
    <div style={{ position: "relative", width, height }}>
      <svg
        ref={svgRef}
        width={width}
        height={height}
        onMouseMove={(e) => {
          handleMouseMove(e); // keep existing hover logic

          if (!editable) return;

          const ev = e.nativeEvent;
          const [mx, my] = d3.pointer(ev, svgRef.current);

          // only inside plot area
          if (
            mx < marginLeft ||
            mx > width - marginRight ||
            my < marginTop ||
            my > height - marginBottom
          ) {
            setCursorPos(null);
            return;
          }

          const xVal = xScale.invert(mx);
          const yVal = yScale.invert(my);

          setCursorPos({
            px: mx,
            py: my,
            x: xVal,
            y: yVal,
          });
        }}
        onMouseLeave={() => {
          handleMouseLeave();
          setCursorPos(null);
        }}
        onClick={handleSvgClick}
        onPointerMove={onPointerMove}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
        style={{ cursor: editable ? "crosshair" : "default" }}
      >
        <g className="grid">
          {/* vertical grid lines */}
          {xticks.map((t, i) => (
            <line
              key={`gx-${i}`}
              x1={xScale(t)}
              x2={xScale(t)}
              y1={marginTop}
              y2={height - marginBottom}
              stroke="rgba(255,255,255,0.12)"
              strokeWidth={1}
            />
          ))}

          {/* horizontal grid lines */}
          {yticks.map((t, i) => (
            <line
              key={`gy-${i}`}
              x1={marginLeft}
              x2={width - marginRight}
              y1={yScale(t)}
              y2={yScale(t)}
              stroke="rgba(255,255,255,0.12)"
              strokeWidth={1}
            />
          ))}
        </g>
        {selectedRange && !editable && (
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
        {/* EDIT MODE: show draggable points */}
        {editable &&
          editPoints.map((p) => (
            <circle
              key={p.idx}
              className="edit-point"
              cx={p.px}
              cy={p.py}
              r={6}
              fill={
                p.idx === selectedPointIdx
                  ? "rgba(255,255,255,0.95)"
                  : "rgba(255,255,255,0.75)"
              }
              stroke="rgba(0,0,0,0.5)"
              strokeWidth={1}
              onPointerDown={(ev) => {
                // Select on click; only drag if it's already selected
                ev.stopPropagation();
                if (selectedPointIdx !== p.idx) {
                  setSelectedPointIdx(p.idx);
                  return;
                }
                beginDrag(p.idx)(ev);
              }}
              onClick={(ev) => {
                ev.stopPropagation();
                setSelectedPointIdx(p.idx);
              }}
              onContextMenu={(ev) => {
                ev.preventDefault();
                ev.stopPropagation();
                if (typeof onDataChange !== "function") return;
                const next = data.filter((_, i) => i !== p.idx);
                setSelectedPointIdx(null);
                onDataChange(next);
              }}
            />
          ))}

        {/* brush layer (disabled in edit mode) */}
        <g ref={brushRef} />

        {/* ✅ Axis labels */}
        <text
          x={(marginLeft + (width - marginRight)) / 2}
          y={height - 6}
          fill="white"
          fontSize={12}
          textAnchor="middle"
        >
          {xLabel}
        </text>

        <text
          x={14}
          y={(marginTop + (height - marginBottom)) / 2}
          fill="white"
          fontSize={12}
          textAnchor="middle"
          transform={`rotate(-90, 14, ${(marginTop + (height - marginBottom)) / 2})`}
        >
          {yLabel}
        </text>
      </svg>

      {editable && cursorPos && (
        <div
          style={{
            position: "absolute",
            left: Math.min(cursorPos.px + 12, width - 160),
            top: Math.max(cursorPos.py - 28, 6),
            pointerEvents: "none",
            background: "rgba(0,0,0,0.85)",
            color: "white",
            padding: "6px 8px",
            borderRadius: 6,
            fontSize: 12,
            whiteSpace: "nowrap",
            boxShadow: "0 2px 8px rgba(0,0,0,0.6)",
          }}
        >
          x: {formatX(cursorPos.x)} &nbsp; y: {formatY(cursorPos.y)}
        </div>
      )}

      {/* tooltip (view mode) */}
      {hover &&
        !editable &&
        (() => {
          const tw = tooltipRef.current ? tooltipRef.current.offsetWidth : 140;
          const th = tooltipRef.current ? tooltipRef.current.offsetHeight : 40;

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
                position: "absolute",
                left,
                top,
                pointerEvents: "none",
                background: "rgba(0,0,0,0.85)",
                color: "white",
                padding: "6px 8px",
                borderRadius: 6,
                fontSize: 12,
                whiteSpace: "nowrap",
                boxShadow: "0 2px 8px rgba(0,0,0,0.6)",
              }}
            >
              <div>
                x:{" "}
                {isTime
                  ? d3.timeFormat("%Y-%m-%d %H:%M:%S")(hover.x)
                  : String(hover.x)}
              </div>
              <div>
                y:{" "}
                {typeof hover.y === "number"
                  ? Number(hover.y).toFixed(3)
                  : String(hover.y)}
              </div>
            </div>
          );
        })()}
    </div>
  );
}

function useUndoableState(initialValue, limit = 200) {
  const initial = React.useMemo(
    () => ({ past: [], present: initialValue, future: [] }),
    []
  );

  function reducer(state, action) {
    switch (action.type) {
      case "SET": {
        const next = action.value;
        const past = [...state.past, state.present];
        if (past.length > limit) past.shift();
        return { past, present: next, future: [] };
      }
      case "UNDO": {
        if (state.past.length === 0) return state;
        const previous = state.past[state.past.length - 1];
        const past = state.past.slice(0, -1);
        const future = [state.present, ...state.future];
        return { past, present: previous, future };
      }
      case "REDO": {
        if (state.future.length === 0) return state;
        const next = state.future[0];
        const future = state.future.slice(1);
        const past = [...state.past, state.present];
        return { past, present: next, future };
      }
      default:
        return state;
    }
  }

  const [state, dispatch] = React.useReducer(reducer, initial);

  const set = React.useCallback((next) => {
    dispatch({ type: "SET", value: next });
  }, []);

  const undo = React.useCallback(() => {
    dispatch({ type: "UNDO" });
  }, []);

  const redo = React.useCallback(() => {
    dispatch({ type: "REDO" });
  }, []);

  return {
    value: state.present,
    set,
    undo,
    redo,
    canUndo: state.past.length > 0,
    canRedo: state.future.length > 0,
  };
}

function DataMonitoring() {
  const [isEditing, setIsEditing] = useState(false);
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [newX, setNewX] = useState("");
  const [newY, setNewY] = useState("");
  const [oxLabel, setOxLabel] = useState("Ox");
  const [oyLabel, setOyLabel] = useState("Oy");

  // IMPORTANT: editable data should be state (not a const)
  const {
    value: telemetryData,
    set: setTelemetryData,
    undo,
    redo,
    canUndo,
    canRedo,
  } = useUndoableState([
    { x: 0, y: 1 },
    { x: 1.5, y: 2 },
    { x: 2, y: 1.5 },
    { x: 3.3, y: 3.4 },
    { x: 4, y: 2.5 },
    { x: 5, y: 4 },
    { x: 6, y: 3 },
    { x: 7, y: 5 },
    { x: 8, y: 4.5 },
    { x: 9, y: 6 },
    { x: 10, y: 5.5 },
  ]);

  useEffect(() => {
    const onKeyDown = (e) => {
      const key = e.key.toLowerCase();
      const mod = e.ctrlKey || e.metaKey;

      if (!mod) return;

      // Undo
      if (key === "z" && !e.shiftKey) {
        e.preventDefault();
        e.stopPropagation();
        undo();
        return;
      }

      // Redo (Ctrl+Y or Ctrl+Shift+Z)
      if (key === "y" || (key === "z" && e.shiftKey)) {
        e.preventDefault();
        e.stopPropagation();
        redo();
      }
    };

    document.addEventListener("keydown", onKeyDown, true); // capture
    return () => document.removeEventListener("keydown", onKeyDown, true);
  }, [undo, redo]);

  return (
    <main className="min-h-screen bg-white text-black p-8">
      <div className="mx-auto max-w-4xl">
        <section className="bg-slate-900 text-white shadow-sm rounded-lg p-6 mb-6">
          <div className="flex items-start justify-between mb-4">
            <div>
              <h2 className="text-lg font-medium text-white">Telemetry</h2>
              <p className="text-sm text-gray-300">
                {isEditing
                  ? "Edit mode: click to add, drag to move, select+Del to delete."
                  : "View mode"}
              </p>
            </div>

            <div className="flex gap-2">
              <button
                className="px-3 py-1 rounded text-sm bg-gray-700 hover:bg-gray-600"
                onClick={() => setIsEditing((v) => !v)}
              >
                {isEditing ? "Done" : "Edit"}
              </button>
              {isEditing && (
                <button
                  className="px-3 py-1 rounded text-sm bg-blue-600 hover:bg-blue-700"
                  onClick={() => {
                    setNewX("");
                    setNewY("");
                    setIsAddOpen(true);
                  }}
                >
                  Add point
                </button>
              )}
            </div>
          </div>

          <div className="flex gap-3 mb-3">
            <div className="flex flex-col">
              <label className="text-xs text-gray-200 mb-1">Ox name</label>
              <input
                value={oxLabel}
                onChange={(e) => setOxLabel(e.target.value)}
                className="px-2 py-1 rounded text-black text-sm"
              />
            </div>

            <div className="flex flex-col">
              <label className="text-xs text-gray-200 mb-1">Oy name</label>
              <input
                value={oyLabel}
                onChange={(e) => setOyLabel(e.target.value)}
                className="px-2 py-1 rounded text-black text-sm"
              />
            </div>
          </div>

          <LinePlot
            data={telemetryData}
            editable={isEditing}
            onDataChange={setTelemetryData}
            width={900}
            height={260}
            marginLeft={64}
            marginBottom={30}
            marginTop={16}
            snapToData={!isEditing}
            xLabel={oxLabel}
            yLabel={oyLabel}
          />
          {isAddOpen && (
            <div
              style={{
                position: "fixed",
                inset: 0,
                background: "rgba(0,0,0,0.55)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                zIndex: 9999,
              }}
              onClick={() => setIsAddOpen(false)}
            >
              <div
                style={{
                  width: 360,
                  background: "white",
                  color: "black",
                  borderRadius: 12,
                  padding: 16,
                  boxShadow: "0 10px 30px rgba(0,0,0,0.4)",
                }}
                onClick={(e) => e.stopPropagation()}
              >
                <div
                  style={{ fontSize: 16, fontWeight: 600, marginBottom: 10 }}
                >
                  Add point
                </div>

                <label
                  style={{ display: "block", fontSize: 12, marginBottom: 6 }}
                >
                  Ox
                </label>
                <input
                  value={newX}
                  onChange={(e) => setNewX(e.target.value)}
                  placeholder="e.g. 2.3"
                  style={{
                    width: "100%",
                    border: "1px solid #ccc",
                    borderRadius: 8,
                    padding: "8px 10px",
                    marginBottom: 12,
                  }}
                />

                <label
                  style={{ display: "block", fontSize: 12, marginBottom: 6 }}
                >
                  Oy
                </label>
                <input
                  value={newY}
                  onChange={(e) => setNewY(e.target.value)}
                  placeholder="e.g. 0.7"
                  style={{
                    width: "100%",
                    border: "1px solid #ccc",
                    borderRadius: 8,
                    padding: "8px 10px",
                    marginBottom: 14,
                  }}
                />

                <div
                  style={{
                    display: "flex",
                    justifyContent: "flex-end",
                    gap: 8,
                  }}
                >
                  <button
                    className="px-3 py-1 rounded text-sm bg-gray-200 hover:bg-gray-300"
                    onClick={() => setIsAddOpen(false)}
                  >
                    Cancel
                  </button>

                  <button
                    className="px-3 py-1 rounded text-sm bg-blue-600 text-white hover:bg-blue-700"
                    onClick={() => {
                      const x = Number(newX);
                      const y = Number(newY);

                      if (!Number.isFinite(x) || !Number.isFinite(y)) {
                        alert("Please enter valid numbers for X and Y.");
                        return;
                      }

                      // add point + keep sorted by x
                      const next = [...telemetryData, { x, y }].sort(
                        (a, b) => a.x - b.x,
                      );
                      setTelemetryData(next);

                      setIsAddOpen(false);
                    }}
                  >
                    Confirm
                  </button>
                </div>
              </div>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}

export default DataMonitoring;
