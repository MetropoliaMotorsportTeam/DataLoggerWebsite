export const calculateStats = (data = []) => {
  if (!Array.isArray(data) || data.length === 0) {
    return { min: 0, max: 0, avg: 0, latest: 0 };
  }

  const numericValues = data
    .map((point) => {
      if (typeof point === 'number') return point;
      if (typeof point?.value === 'number') return point.value;
      const parsed = Number(point?.value ?? point);
      return Number.isFinite(parsed) ? parsed : null;
    })
    .filter((value) => typeof value === 'number' && Number.isFinite(value));

  if (numericValues.length === 0) {
    return { min: 0, max: 0, avg: 0, latest: 0 };
  }

  const latest = numericValues[numericValues.length - 1];
  const min = Math.min(...numericValues);
  const max = Math.max(...numericValues);
  const avg = numericValues.reduce((sum, value) => sum + value, 0) / numericValues.length;

  return { min, max, avg, latest };
};