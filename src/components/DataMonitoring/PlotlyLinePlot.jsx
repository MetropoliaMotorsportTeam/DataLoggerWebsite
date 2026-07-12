import React, {
  forwardRef,
  useImperativeHandle,
  useRef,
  useState
} from "react";
import Plot from "react-plotly.js";
import { getSignalConfig } from "../../utils/signalConfig";

const MAX_DATA_POINTS = 1000;

export const PlotlyLinePlot = forwardRef(({ signalNames }, ref) => {
  const dataRef = useRef(new Map());

  const [, forceUpdate] = useState(0);

  const redraw = () => forceUpdate(v => v + 1);

  useImperativeHandle(ref, () => ({

    push(signalName, value, timestamp = Date.now()) {

      if (!dataRef.current.has(signalName)) {
        dataRef.current.set(signalName, []);
      }

      const data = dataRef.current.get(signalName);

      data.push({
        timestamp,
        value
      });

      if (data.length > MAX_DATA_POINTS) {
        data.shift();
      }

      redraw();
    },

    clear() {
      dataRef.current.clear();
      redraw();
    },

    setSeries(seriesInput = {}) {

      const map = new Map();

      const entries =
        seriesInput instanceof Map
          ? seriesInput.entries()
          : Object.entries(seriesInput);

      for (const [signalName, points] of entries) {
        map.set(signalName, points);
      }

      dataRef.current = map;

      redraw();
    },

    getSeries() {
      return dataRef.current;
    }

  }));

  const traces = [];

  for (const [signalName, points] of dataRef.current.entries()) {

    if (!signalNames.includes(signalName)) continue;

    traces.push({

      x: points.map(p => new Date(p.timestamp)),
      y: points.map(p => p.value),

      type: "scatter",
      mode: "lines",

      name: signalName,

      hovertemplate:
        "<b>%{fullData.name}</b><br>" +
        "%{x|%H:%M:%S.%L}<br>" +
        "Value: %{y:.2f}<extra></extra>",

      line: {
        color: getSignalConfig(signalName).color,
        width: 2.5
      }

    });

  }

  // Nice placeholder instead of empty graph
  if (traces.length === 0) {
    return (
      <div
        style={{
          height: "450px",
          background: "#111827",
          borderRadius: "10px",
          border: "1px solid #374151",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: "#9CA3AF",
          fontSize: "18px",
          fontWeight: 500
        }}
      >
        Select one or more signals to start plotting.
      </div>
    );
  }

  return (

    <Plot

      data={traces}

      layout={{

        paper_bgcolor: "#111827",
        plot_bgcolor: "#111827",

        autosize: true,

        hovermode: "x unified",
        hoverdistance: -1,

        dragmode: "zoom",

        font: {
          color: "white"
        },

        margin: {
          l: 70,
          r: 30,
          t: 30,
          b: 60
        },

        xaxis: {
          title: "Time",

          showgrid: true,
          gridcolor: "#374151",

          showspikes: true,
          spikemode: "across",
          spikesnap: "cursor",
          spikecolor: "#888",

          tickformat: "%H:%M:%S",

          zeroline: false
        },

        yaxis: {
          title: "Value",

          showgrid: true,
          gridcolor: "#374151",

          zeroline: false,

          fixedrange: false
        },

        legend: {
          orientation: "h",
          y: 1.15,
          x: 0
        }

      }}

      style={{
        width: "100%",
        height: "450px"
      }}

      useResizeHandler

      config={{

        responsive: true,

        displaylogo: false,

        scrollZoom: true,

        doubleClick: "reset",

        modeBarButtonsToRemove: [
          "select2d",
          "lasso2d"
        ]

      }}

    />

  );

});