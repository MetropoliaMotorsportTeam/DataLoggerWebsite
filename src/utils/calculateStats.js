import * as d3 from 'd3';

export const calculateStats = (data = []) => {
  if (data.length === 0) return { min: 0, max: 0, avg: 0, latest: 0 };
  const latest = data[data.length - 1];
  const min = d3.min(data);
  const max = d3.max(data);
  const avg = d3.mean(data);
  return { min, max, avg, latest };
};