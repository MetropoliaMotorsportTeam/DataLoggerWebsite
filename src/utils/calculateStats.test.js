import { calculateStats } from './calculateStats';

describe('calculateStats', () => {
  it('computes stats from numeric point objects', () => {
    const data = [{ value: 10 }, { value: 20 }, { value: 30 }];

    expect(calculateStats(data)).toEqual({
      min: 10,
      max: 30,
      avg: 20,
      latest: 30,
    });
  });

  it('returns zeros for empty or invalid input', () => {
    expect(calculateStats([])).toEqual({ min: 0, max: 0, avg: 0, latest: 0 });
    expect(calculateStats([{ value: 'x' }])).toEqual({ min: 0, max: 0, avg: 0, latest: 0 });
  });
});
