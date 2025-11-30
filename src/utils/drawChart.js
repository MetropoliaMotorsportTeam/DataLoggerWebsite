
import * as d3 from 'd3';
import { getSignalConfig } from './getSignalConfig';

export const drawChart = (canvasRef, dataRef) => {
    const MAX_DATA_POINTS = 100;
    

    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    const rect = canvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    const width = rect.width;
    const height = rect.height;
    
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    ctx.scale(dpr, dpr);

    const margin = { top: 40, right: 20, bottom: 30, left: 50 };
    const innerWidth = width - margin.left - margin.right;
    const innerHeight = height - margin.top - margin.bottom;

    // Clear canvas
    ctx.clearRect(0, 0, width, height);

    const { series } = dataRef.current;
    const allData = Array.from(series.values()).flat();

    // Scales
    const xScale = d3.scaleLinear()
      .domain([0, MAX_DATA_POINTS - 1])
      .range([margin.left, width - margin.right]);

    const yDomain = allData.length > 0 ? d3.extent(allData) : [0, 100];
    const yPadding = (yDomain[1] - yDomain[0] || 1) * 0.1;
    const yScale = d3.scaleLinear()
      .domain([yDomain[0] - yPadding, yDomain[1] + yPadding])
      .range([height - margin.bottom, margin.top]);

    // Grid and Y-axis
    ctx.strokeStyle = '#4B5563';
    ctx.lineWidth = 0.5;
    const yTicks = yScale.ticks(5);
    yTicks.forEach(tick => {
      const y = yScale(tick);
      ctx.beginPath();
      ctx.moveTo(margin.left, y);
      ctx.lineTo(width - margin.right, y);
      ctx.stroke();
      
      ctx.fillStyle = '#D1D5DB';
      ctx.font = '11px "Roboto Mono"';
      ctx.textAlign = 'right';
      ctx.textBaseline = 'middle';
      ctx.fillText(tick.toFixed(1), margin.left - 5, y);
    });

    // Clip region for lines
    ctx.save();
    ctx.beginPath();
    ctx.rect(margin.left, margin.top, innerWidth, innerHeight);
    ctx.clip();

    // Draw lines
    ctx.lineWidth = 2;
    const lineGenerator = d3.line()
      .x((d, i) => xScale(i))
      .y(d => yScale(d))
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

    // Legend - positioned on the right side
    ctx.textAlign = 'left';
    ctx.font = '12px "Roboto Mono"';
    const legendX = width - margin.right + 10; // Position to the right of the chart
    Array.from(series.keys()).forEach((signalName, i) => {
      const color = getSignalConfig(signalName).color;
      const y = margin.top + i * 20;
      
      ctx.fillStyle = color;
      ctx.fillRect(legendX, y, 12, 12);
      ctx.fillText(signalName, legendX + 18, y + 8);
    });
  };