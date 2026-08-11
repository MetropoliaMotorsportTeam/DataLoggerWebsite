import { useState } from "react";
import "./PedalMapping.css";

const POINT_COUNT = 21;

const DEFAULT_MAPPING = Array.from(
  { length: POINT_COUNT },
  (_, i) => -100 + i * 10
);

const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

export default function PedalMapping() {
  const [mapping, setMapping] = useState(DEFAULT_MAPPING);

  const width = 1000;
  const height = 520;

  const margin = {
    top: 40,
    right: 40,
    bottom: 70,
    left: 75,
  };

  const graphWidth = width - margin.left - margin.right;
  const graphHeight = height - margin.top - margin.bottom;

  const xToSvg = (x) =>
    margin.left + (x / 100) * graphWidth;

  const yToSvg = (y) =>
    margin.top + ((100 - y) / 200) * graphHeight;

  const svgToY = (svgY) => {
    const y =
      100 -
      ((svgY - margin.top) / graphHeight) * 200;

    return Math.round(clamp(y, -100, 100));
  };

  const handlePointDrag = (index, event) => {
    event.preventDefault();

    const svg = event.currentTarget.ownerSVGElement;
    const rect = svg.getBoundingClientRect();

    const scaleX = width / rect.width;
    const scaleY = height / rect.height;

    const svgY =
      (event.clientY - rect.top) * scaleY;

    const newValue = svgToY(svgY);

    setMapping((current) => {
      const next = [...current];
      next[index] = newValue;
      return next;
    });
  };

  const handlePointPointerDown = (index, event) => {
    event.currentTarget.setPointerCapture(event.pointerId);

    const handleMove = (moveEvent) => {
      handlePointDrag(index, moveEvent);
    };

    const handleUp = () => {
      event.currentTarget.releasePointerCapture?.(
        event.pointerId
      );

      event.currentTarget.removeEventListener(
        "pointermove",
        handleMove
      );

      event.currentTarget.removeEventListener(
        "pointerup",
        handleUp
      );
    };

    event.currentTarget.addEventListener(
      "pointermove",
      handleMove
    );

    event.currentTarget.addEventListener(
      "pointerup",
      handleUp
    );
  };

  const handleValueChange = (index, value) => {
    const numericValue = Number(value);

    if (Number.isNaN(numericValue)) return;

    setMapping((current) => {
      const next = [...current];
      next[index] = clamp(numericValue, -100, 100);
      return next;
    });
  };

  const handleReset = () => {
    setMapping(DEFAULT_MAPPING);
  };

  const handleSave = () => {
    console.log("Pedal mapping:", mapping);

    // Replace this with your actual save/API/MQTT logic.
    alert("Pedal mapping saved.");
  };

  const points = mapping.map((value, index) => ({
    x: index * 5,
    y: value,
  }));

  const polylinePoints = points
    .map(({ x, y }) => `${xToSvg(x)},${yToSvg(y)}`)
    .join(" ");

  return (
    <div className="pedal-mapping-shell">
      <div className="pedal-mapping-header">
        <div>
          <h1 className="pedal-mapping-title">
            PEDAL MAPPING
          </h1>

          <p className="pedal-mapping-subtitle">
            Edit the output mapping for each pedal position.
          </p>
        </div>

       
      </div>

      <div className="pedal-mapping-card">
        <div className="pedal-mapping-chart">
          <svg
            viewBox={`0 0 ${width} ${height}`}
            className="pedal-mapping-svg"
          >
            {/* Y-axis title */}
            <text
              x={margin.left}
              y={20}
              className="axis-title"
            >
              OUTPUT VALUE
            </text>

            {/* Grid */}
            {[100, 50, 0, -50, -100].map((value) => {
              const y = yToSvg(value);

              return (
                <g key={value}>
                  <line
                    x1={margin.left}
                    x2={width - margin.right}
                    y1={y}
                    y2={y}
                    className={
                      value === 0
                        ? "zero-line"
                        : "grid-line"
                    }
                  />

                  <text
                    x={margin.left - 15}
                    y={y + 5}
                    textAnchor="end"
                    className="axis-label"
                  >
                    {value > 0 ? `+${value}` : value}
                  </text>
                </g>
              );
            })}

            {/* X grid */}
            {Array.from(
              { length: POINT_COUNT },
              (_, index) => index * 5
            ).map((value) => {
              const x = xToSvg(value);

              return (
                <g key={value}>
                  <line
                    x1={x}
                    x2={x}
                    y1={margin.top}
                    y2={height - margin.bottom}
                    className="grid-line"
                  />

                  <text
                    x={x}
                    y={height - margin.bottom + 25}
                    textAnchor="middle"
                    className="axis-label"
                  >
                    {value}
                  </text>
                </g>
              );
            })}

            {/* X-axis title */}
            <text
              x={width / 2}
              y={height - 15}
              textAnchor="middle"
              className="axis-title"
            >
              PEDAL POSITION (%)
            </text>

            {/* Mapping line */}
            <polyline
              points={polylinePoints}
              fill="none"
              className="mapping-line"
            />

            {/* Editable points */}
            {points.map(({ x, y }, index) => (
              <g key={x}>
                <circle
                  cx={xToSvg(x)}
                  cy={yToSvg(y)}
                  r={index === 10 ? 10 : 7}
                  className={
                    index === 10
                      ? "mapping-point center-point"
                      : "mapping-point"
                  }
                  onPointerDown={(event) =>
                    handlePointPointerDown(
                      index,
                      event
                    )
                  }
                />

                {/* Value above/below selected point */}
                <text
                  x={xToSvg(x)}
                  y={yToSvg(y) - 14}
                  textAnchor="middle"
                  className="point-value"
                >
                  {y > 0 ? `+${y}` : y}
                </text>
              </g>
            ))}
          </svg>
        </div>

        

        {/* Actions */}
        <div className="pedal-mapping-actions">
          <button
            type="button"
            className="mapping-button save"
            onClick={handleSave}
          >
            SAVE
          </button>

          <button
            type="button"
            className="mapping-button reset"
            onClick={handleReset}
          >
            RESET
          </button>
        </div>
      </div>
    </div>
  );
}